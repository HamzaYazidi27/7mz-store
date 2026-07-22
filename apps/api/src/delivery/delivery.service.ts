import { Injectable, Logger } from "@nestjs/common";
import type { DeliveredItemDto } from "@7mz/shared";
import { CryptoService } from "../crypto/crypto.service";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import type { Prisma } from "../generated/prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * DeliveryService — the automatic fulfillment engine.
 *
 * On payment confirmation it atomically reserves AVAILABLE stock items for
 * each order line, marks them SOLD, links them to the order item, and stamps
 * delivery timestamps. Stock content stays encrypted at rest; it is only
 * decrypted when the owner reads their order.
 *
 * All methods that mutate stock accept a transaction client so delivery is
 * part of the same atomic unit as order/payment finalization.
 */
@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly crypto: CryptoService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Fulfills every line of an order inside an existing transaction.
   * Throws if stock is insufficient — the caller rolls back and marks the
   * payment for refund.
   */
  async fulfillOrder(tx: Tx, orderId: string): Promise<void> {
    const items = await tx.orderItem.findMany({ where: { orderId } });

    for (const item of items) {
      const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });

      if (product.deliveryType === "MANUAL") {
        // Manual products are fulfilled by staff later; nothing to reserve.
        continue;
      }

      const available = await tx.stockItem.findMany({
        where: { productId: item.productId, status: "AVAILABLE" },
        take: item.quantity,
        orderBy: { createdAt: "asc" },
      });

      if (available.length < item.quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}: need ${item.quantity}, have ${available.length}`,
        );
      }

      const now = new Date();
      await tx.stockItem.updateMany({
        where: { id: { in: available.map((s) => s.id) } },
        data: { status: "SOLD", orderItemId: item.id, deliveredAt: now },
      });

      await tx.orderItem.update({ where: { id: item.id }, data: { deliveredAt: now } });

      // Decrement cached stock count.
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockCount: { decrement: item.quantity },
          soldCount: { increment: item.quantity },
        },
      });
    }
  }

  /**
   * Reads delivered items for an order line and decrypts their content for the
   * owner. AUTO_FILE items get a signed download URL instead of inline content.
   */
  async revealDeliveredItems(orderItemId: string): Promise<DeliveredItemDto[]> {
    // Uses the top-level prisma via the injected service is not available here;
    // callers pass items in. See OrdersService.getOrderDetail for usage.
    throw new Error("revealDeliveredItems must be called via OrdersService");
  }

  /** Decrypts a single stock item's payload into a DeliveredItemDto. */
  async toDeliveredDto(item: {
    id: string;
    content: string | null;
    fileKey: string | null;
    fileName: string | null;
    deliveredAt: Date | null;
  }): Promise<DeliveredItemDto> {
    let content: string | null = null;
    let downloadUrl: string | null = null;

    if (item.fileKey) {
      downloadUrl = await this.storage.signedDownloadUrl(item.fileKey, 3600);
    } else if (item.content) {
      try {
        content = this.crypto.decrypt(item.content);
      } catch (err) {
        this.logger.error(`Failed to decrypt stock item ${item.id}: ${(err as Error).message}`);
        content = null;
      }
    }

    return {
      id: item.id,
      content,
      fileName: item.fileName,
      downloadUrl,
      deliveredAt: (item.deliveredAt ?? new Date()).toISOString(),
    };
  }
}
