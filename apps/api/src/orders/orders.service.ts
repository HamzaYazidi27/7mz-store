import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CheckoutQuoteDto,
  CreateOrderResultDto,
  CursorPaginated,
  OrderDetailDto,
  OrderDto,
  OrderStatus,
  PaymentProviderCode,
} from "@7mz/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CryptoService } from "../crypto/crypto.service";
import { CouponsService } from "../coupons/coupons.service";
import { PaymentsService } from "../payments/payments.service";
import { DeliveryService } from "../delivery/delivery.service";
import type { Order, OrderItem, Prisma } from "../generated/prisma/client";
import type { CheckoutItemDto, CreateOrderDto } from "./dto/orders.dto";

interface PricedLine {
  productId: string;
  name: string;
  thumbnail: string | null;
  unitPrice: number;
  quantity: number;
  total: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly coupons: CouponsService,
    private readonly payments: PaymentsService,
    private readonly delivery: DeliveryService,
  ) {}

  // ------------------------------------------------------------- pricing

  private async priceLines(items: CheckoutItemDto[]): Promise<PricedLine[]> {
    if (items.length === 0) throw new BadRequestException("Your cart is empty");

    const products = await this.prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) }, isActive: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines: PricedLine[] = [];
    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product) throw new BadRequestException("A product in your cart is unavailable");
      if (product.stockCount < item.quantity && product.deliveryType !== "MANUAL") {
        throw new BadRequestException(`${product.name} is out of stock`);
      }
      const unitPrice = Number(product.price);
      lines.push({
        productId: product.id,
        name: product.name,
        thumbnail: product.thumbnail,
        unitPrice,
        quantity: item.quantity,
        total: Math.round(unitPrice * item.quantity * 100) / 100,
      });
    }
    return lines;
  }

  // -------------------------------------------------------------- quote

  async quote(
    userId: string,
    items: CheckoutItemDto[],
    couponCode?: string,
  ): Promise<CheckoutQuoteDto> {
    const lines = await this.priceLines(items);
    const subtotal = Math.round(lines.reduce((s, l) => s + l.total, 0) * 100) / 100;

    let discount = 0;
    let coupon: CheckoutQuoteDto["coupon"] = null;
    if (couponCode) {
      const evalResult = await this.coupons.evaluate(
        couponCode,
        userId,
        subtotal,
        lines.map((l) => l.productId),
      );
      discount = evalResult.discount;
      coupon = {
        code: evalResult.code,
        valid: evalResult.valid,
        reason: evalResult.reason,
        discount: evalResult.discount.toFixed(2),
        newTotal: (subtotal - evalResult.discount).toFixed(2),
      };
    }

    const total = Math.round((subtotal - discount) * 100) / 100;
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const balance = Number(user.balance);

    const providers = await this.payments.listMethods(balance, total, { includeBalance: true });

    return {
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      total: total.toFixed(2),
      coupon,
      balance: balance.toFixed(2),
      balanceSufficient: balance >= total,
      providers,
    };
  }

  // ------------------------------------------------------------- create

  async createOrder(userId: string, dto: CreateOrderDto): Promise<CreateOrderResultDto> {
    const lines = await this.priceLines(dto.items);
    const subtotal = Math.round(lines.reduce((s, l) => s + l.total, 0) * 100) / 100;

    // Re-validate coupon at order time (prices/limits may have shifted).
    let discount = 0;
    let couponId: string | undefined;
    let couponCodeSnapshot: string | undefined;
    if (dto.couponCode) {
      const evalResult = await this.coupons.evaluate(
        dto.couponCode,
        userId,
        subtotal,
        lines.map((l) => l.productId),
      );
      if (!evalResult.valid) throw new BadRequestException(evalResult.reason ?? "Invalid coupon");
      discount = evalResult.discount;
      couponId = evalResult.couponId;
      couponCodeSnapshot = evalResult.code;
    }

    const total = Math.round((subtotal - discount) * 100) / 100;

    // Create the order + items + redeem coupon atomically (status PENDING).
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: this.crypto.orderNumber(),
          userId,
          status: "PENDING",
          subtotal,
          discount,
          total,
          couponId: couponId ?? null,
          couponCode: couponCodeSnapshot ?? null,
          items: {
            create: lines.map((l) => ({
              productId: l.productId,
              productName: l.name,
              thumbnail: l.thumbnail,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              total: l.total,
            })),
          },
        },
      });
      if (couponId) {
        await this.coupons.redeem(tx, couponId, userId, created.id, discount);
      }
      return created;
    });

    // Initiate payment (balance settles immediately → order COMPLETED).
    const payment = await this.payments.createOrderPayment(
      order,
      dto.provider as PaymentProviderCode,
      dto.asset,
    );

    const detail = await this.getOrderDetail(userId, order.id);
    return { order: detail, payment };
  }

  // -------------------------------------------------------------- reads

  async listOrders(
    userId: string,
    status: OrderStatus | "all",
    cursor?: string,
    limit = 20,
  ): Promise<CursorPaginated<OrderDto>> {
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(status !== "all" ? { status } : {}),
    };
    const rows = await this.prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { items: { take: 1, orderBy: { id: "asc" } }, _count: { select: { items: true } } },
    });

    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;

    return {
      items: page.map((o) => this.toOrderDto(o, o.items[0], o._count.items)),
      nextCursor: hasNext ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  async getOrderDetail(userId: string, orderId: string): Promise<OrderDetailDto> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { include: { deliveredItems: true }, orderBy: { id: "asc" } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!order) throw new NotFoundException("Order not found");

    const items = await Promise.all(
      order.items.map(async (item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        thumbnail: item.thumbnail,
        unitPrice: item.unitPrice.toFixed(2),
        quantity: item.quantity,
        total: item.total.toFixed(2),
        deliveredAt: item.deliveredAt?.toISOString() ?? null,
        delivered: await Promise.all(
          item.deliveredItems.map((s) => this.delivery.toDeliveredDto(s)),
        ),
      })),
    );

    const payment = order.payments[0];

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: order.subtotal.toFixed(2),
      discount: order.discount.toFixed(2),
      total: order.total.toFixed(2),
      currency: order.currency,
      couponCode: order.couponCode,
      createdAt: order.createdAt.toISOString(),
      completedAt: order.completedAt?.toISOString() ?? null,
      items,
      payment: payment
        ? {
            provider: payment.provider as PaymentProviderCode,
            status: payment.status,
            confirmedAt: payment.confirmedAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  private toOrderDto(
    order: Order,
    firstItem: OrderItem | undefined,
    itemCount: number,
  ): OrderDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: order.subtotal.toFixed(2),
      discount: order.discount.toFixed(2),
      total: order.total.toFixed(2),
      currency: order.currency,
      couponCode: order.couponCode,
      itemCount,
      firstItemName: firstItem?.productName ?? "Order",
      firstItemThumbnail: firstItem?.thumbnail ?? null,
      createdAt: order.createdAt.toISOString(),
      completedAt: order.completedAt?.toISOString() ?? null,
    };
  }
}
