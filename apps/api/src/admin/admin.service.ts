import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PAYMENT_PROVIDER_LABELS, type PaymentProviderCode } from "@7mz/shared";
import { CryptoService } from "../crypto/crypto.service";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { WalletService } from "../wallet/wallet.service";
import { AuditService } from "../audit/audit.service";
import { Prisma } from "../generated/prisma/client";
import type {
  AdjustBalanceDto,
  CreateBannerDto,
  CreateCategoryDto,
  CreateCouponDto,
  CreateProductDto,
  UpdateBannerDto,
  UpdateCategoryDto,
  UpdateGatewayDto,
  UpdateProductDto,
} from "./dto/admin.dto";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * AdminService — powers the management dashboard. All catalog mutations clear
 * the public catalog cache so the storefront reflects changes immediately.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly redis: RedisService,
    private readonly wallet: WalletService,
    private readonly audit: AuditService,
  ) {}

  private async bustCatalogCache(): Promise<void> {
    await this.redis.delByPattern("catalog:*");
    await this.redis.del("home:feed:v1");
  }

  // ------------------------------------------------------------ dashboard

  async dashboard() {
    const now = new Date();
    const dayMs = 86_400_000;
    const since30 = new Date(now.getTime() - 30 * dayMs);

    const [
      revenueAll,
      revenue30,
      ordersTotal,
      ordersPending,
      customers,
      products,
      lowStock,
      recentOrders,
      recentUsers,
      completedForChart,
    ] = await Promise.all([
      this.prisma.order.aggregate({ where: { status: "COMPLETED" }, _sum: { total: true } }),
      this.prisma.order.aggregate({
        where: { status: "COMPLETED", completedAt: { gte: since30 } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: "PENDING" } }),
      this.prisma.user.count({ where: { role: "CUSTOMER" } }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true, stockCount: { lte: 5 } } }),
      this.prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          user: { select: { firstName: true, username: true, photoUrl: true } },
          items: { take: 1 },
        },
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, firstName: true, username: true, photoUrl: true, createdAt: true, role: true },
      }),
      this.prisma.order.findMany({
        where: { status: "COMPLETED", completedAt: { gte: since30 } },
        select: { total: true, completedAt: true },
      }),
    ]);

    // Build a 30-day revenue series.
    const series = new Map<string, number>();
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(now.getTime() - i * dayMs);
      series.set(d.toISOString().slice(0, 10), 0);
    }
    for (const o of completedForChart) {
      if (!o.completedAt) continue;
      const key = o.completedAt.toISOString().slice(0, 10);
      if (series.has(key)) series.set(key, (series.get(key) ?? 0) + Number(o.total));
    }

    return {
      revenue: {
        total: (revenueAll._sum.total ?? 0).toFixed(2),
        last30Days: (revenue30._sum.total ?? 0).toFixed(2),
        orders30Days: revenue30._count,
      },
      counts: { ordersTotal, ordersPending, customers, products, lowStock },
      revenueSeries: [...series.entries()].map(([date, value]) => ({
        date,
        value: Math.round(value * 100) / 100,
      })),
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total.toFixed(2),
        customer: o.user.firstName + (o.user.username ? ` (@${o.user.username})` : ""),
        item: o.items[0]?.productName ?? "—",
        createdAt: o.createdAt.toISOString(),
      })),
      recentUsers: recentUsers.map((u) => ({
        id: u.id,
        name: u.firstName,
        username: u.username,
        photoUrl: u.photoUrl,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
      })),
    };
  }

  // ------------------------------------------------------------- products

  async listProducts(search?: string, categoryId?: string, page = 1, pageSize = 20) {
    const where: Prisma.ProductWhereInput = {
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(categoryId ? { categoryId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: { select: { name: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items: items.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        thumbnail: p.thumbnail,
        price: p.price.toFixed(2),
        compareAtPrice: p.compareAtPrice?.toFixed(2) ?? null,
        stockCount: p.stockCount,
        soldCount: p.soldCount,
        isActive: p.isActive,
        isFeatured: p.isFeatured,
        category: p.category.name,
        categoryId: p.categoryId,
        deliveryType: p.deliveryType,
      })),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || "product";
    let slug = base;
    let n = 1;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }
    return slug;
  }

  async createProduct(actorId: string, dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        slug: await this.uniqueSlug(dto.name),
        shortDescription: dto.shortDescription,
        description: dto.description,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice ?? null,
        thumbnail: dto.thumbnail ?? null,
        images: dto.images ?? [],
        features: dto.features ?? [],
        tags: dto.tags ?? [],
        brandColor: dto.brandColor ?? null,
        deliveryType: (dto.deliveryType as never) ?? "AUTO_CODE",
        deliveryNote: dto.deliveryNote ?? null,
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
        isFlashSale: dto.isFlashSale ?? false,
      },
    });
    await this.bustCatalogCache();
    await this.audit.log({ action: "product.create", actorId, entityType: "Product", entityId: product.id });
    return product;
  }

  async updateProduct(actorId: string, id: string, dto: UpdateProductDto) {
    await this.prisma.product.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new NotFoundException("Product not found");
    });
    const data: Record<string, unknown> = { ...dto };
    delete data.categoryId; // handled explicitly below if present
    if (dto.categoryId) data.categoryId = dto.categoryId;
    const product = await this.prisma.product.update({ where: { id }, data });
    await this.bustCatalogCache();
    await this.audit.log({ action: "product.update", actorId, entityType: "Product", entityId: id });
    return product;
  }

  async deleteProduct(actorId: string, id: string) {
    const soldItems = await this.prisma.orderItem.count({ where: { productId: id } });
    if (soldItems > 0) {
      // Preserve order history: deactivate instead of hard-deleting.
      await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    } else {
      await this.prisma.product.delete({ where: { id } });
    }
    await this.bustCatalogCache();
    await this.audit.log({ action: "product.delete", actorId, entityType: "Product", entityId: id });
    return { deleted: true, deactivated: soldItems > 0 };
  }

  async duplicateProduct(actorId: string, id: string) {
    const src = await this.prisma.product.findUnique({ where: { id }, include: { faqs: true } });
    if (!src) throw new NotFoundException("Product not found");
    const copy = await this.prisma.product.create({
      data: {
        categoryId: src.categoryId,
        name: `${src.name} (Copy)`,
        slug: await this.uniqueSlug(`${src.name}-copy`),
        shortDescription: src.shortDescription,
        description: src.description,
        price: src.price,
        compareAtPrice: src.compareAtPrice,
        thumbnail: src.thumbnail,
        images: src.images,
        features: src.features,
        tags: src.tags,
        brandColor: src.brandColor,
        deliveryType: src.deliveryType,
        deliveryNote: src.deliveryNote,
        isActive: false,
      },
    });
    await this.bustCatalogCache();
    return copy;
  }

  async addStock(actorId: string, productId: string, items: string[]) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException("Product not found");
    const clean = items.map((s) => s.trim()).filter(Boolean);
    if (clean.length === 0) throw new BadRequestException("No stock provided");

    await this.prisma.$transaction([
      this.prisma.stockItem.createMany({
        data: clean.map((content) => ({
          productId,
          status: "AVAILABLE" as const,
          content: this.crypto.encrypt(content),
        })),
      }),
      this.prisma.product.update({
        where: { id: productId },
        data: { stockCount: { increment: clean.length } },
      }),
    ]);
    await this.bustCatalogCache();
    await this.audit.log({
      action: "product.stock_added",
      actorId,
      entityType: "Product",
      entityId: productId,
      after: { count: clean.length },
    });
    return { added: clean.length };
  }

  async stockSummary(productId: string) {
    const grouped = await this.prisma.stockItem.groupBy({
      by: ["status"],
      where: { productId },
      _count: true,
    });
    return grouped.reduce<Record<string, number>>((acc, g) => {
      acc[g.status] = g._count;
      return acc;
    }, {});
  }

  // ------------------------------------------------------------ categories

  async listCategories() {
    const cats = await this.prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      accentColor: c.accentColor,
      parentId: c.parentId,
      sortOrder: c.sortOrder,
      isVisible: c.isVisible,
      productCount: c._count.products,
    }));
  }

  async createCategory(dto: CreateCategoryDto) {
    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug: await this.uniqueCategorySlug(dto.name),
        icon: dto.icon ?? null,
        accentColor: dto.accentColor ?? null,
        description: dto.description ?? null,
        parentId: dto.parentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isVisible: dto.isVisible ?? true,
      },
    });
    await this.bustCatalogCache();
    return category;
  }

  private async uniqueCategorySlug(name: string): Promise<string> {
    const base = slugify(name) || "category";
    let slug = base;
    let n = 1;
    while (await this.prisma.category.findUnique({ where: { slug } })) slug = `${base}-${n++}`;
    return slug;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.update({ where: { id }, data: { ...dto } });
    await this.bustCatalogCache();
    return category;
  }

  async deleteCategory(id: string) {
    const count = await this.prisma.product.count({ where: { categoryId: id } });
    if (count > 0) throw new BadRequestException(`Category has ${count} products — move them first`);
    await this.prisma.category.delete({ where: { id } });
    await this.bustCatalogCache();
    return { deleted: true };
  }

  // --------------------------------------------------------------- orders

  async listOrders(status?: string, page = 1, pageSize = 20) {
    const where: Prisma.OrderWhereInput = status && status !== "all" ? { status: status as never } : {};
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { firstName: true, username: true } },
          items: { select: { productName: true, quantity: true } },
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      items: items.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total.toFixed(2),
        customer: o.user.firstName + (o.user.username ? ` @${o.user.username}` : ""),
        items: o.items.map((i) => `${i.productName} ×${i.quantity}`).join(", "),
        provider: o.payments[0]?.provider ?? null,
        createdAt: o.createdAt.toISOString(),
      })),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async refundOrder(actorId: string, id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.status === "REFUNDED") return order;

    await this.prisma.$transaction(async (tx) => {
      // Refund to wallet balance.
      await this.wallet.applyLedger(tx, {
        userId: order.userId,
        type: "REFUND",
        amount: Number(order.total),
        description: `Refund · order ${order.orderNumber}`,
        reference: order.orderNumber,
        orderId: order.id,
        allowNegative: true,
      });
      await tx.order.update({ where: { id }, data: { status: "REFUNDED" } });
      await tx.payment.updateMany({
        where: { orderId: id, status: "COMPLETED" },
        data: { status: "REFUNDED" },
      });
    });
    await this.audit.log({ action: "order.refund", actorId, entityType: "Order", entityId: id });
    return this.prisma.order.findUnique({ where: { id } });
  }

  // ---------------------------------------------------------------- users

  async listUsers(search?: string, page = 1, pageSize = 20) {
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { username: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { orders: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map((u) => ({
        id: u.id,
        telegramId: u.telegramId.toString(),
        firstName: u.firstName,
        username: u.username,
        photoUrl: u.photoUrl,
        role: u.role,
        status: u.status,
        balance: u.balance.toFixed(2),
        orders: u._count.orders,
        createdAt: u.createdAt.toISOString(),
      })),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async adjustBalance(actorId: string, userId: string, dto: AdjustBalanceDto) {
    const result = await this.prisma.$transaction((tx) =>
      this.wallet.applyLedger(tx, {
        userId,
        type: dto.amount >= 0 ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
        amount: dto.amount,
        description: dto.reason || "Admin balance adjustment",
        allowNegative: true,
      }),
    );
    await this.audit.log({
      action: "user.balance_adjust",
      actorId,
      entityType: "User",
      entityId: userId,
      after: { amount: dto.amount, reason: dto.reason },
    });
    return { balance: result.balanceAfter.toFixed(2) };
  }

  async setUserRole(actorId: string, userId: string, role: string) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { role: role as never } });
    await this.audit.log({
      action: "user.role_change",
      actorId,
      entityType: "User",
      entityId: userId,
      after: { role },
    });
    return { id: user.id, role: user.role };
  }

  async setUserStatus(actorId: string, userId: string, status: "ACTIVE" | "BANNED") {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { status } });
    await this.audit.log({ action: "user.status_change", actorId, entityType: "User", entityId: userId, after: { status } });
    return { id: user.id, status: user.status };
  }

  // -------------------------------------------------------------- coupons

  async listCoupons() {
    const rows = await this.prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((c) => ({
      id: c.id,
      code: c.code,
      type: c.type,
      value: c.value.toFixed(2),
      minOrderAmount: c.minOrderAmount?.toFixed(2) ?? null,
      maxDiscount: c.maxDiscount?.toFixed(2) ?? null,
      usageLimit: c.usageLimit,
      usageCount: c.usageCount,
      perUserLimit: c.perUserLimit,
      isActive: c.isActive,
      expiresAt: c.expiresAt?.toISOString() ?? null,
    }));
  }

  async createCoupon(dto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        type: dto.type as never,
        value: dto.value,
        minOrderAmount: dto.minOrderAmount ?? null,
        maxDiscount: dto.maxDiscount ?? null,
        usageLimit: dto.usageLimit ?? null,
        perUserLimit: dto.perUserLimit ?? 1,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async toggleCoupon(id: string) {
    const coupon = await this.prisma.coupon.findUniqueOrThrow({ where: { id } });
    return this.prisma.coupon.update({ where: { id }, data: { isActive: !coupon.isActive } });
  }

  async deleteCoupon(id: string) {
    await this.prisma.coupon.delete({ where: { id } });
    return { deleted: true };
  }

  // -------------------------------------------------------------- banners

  async listBanners() {
    return this.prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
  }

  async createBanner(dto: CreateBannerDto) {
    const banner = await this.prisma.banner.create({
      data: {
        title: dto.title,
        subtitle: dto.subtitle ?? null,
        eyebrow: dto.eyebrow ?? null,
        image: dto.image,
        ctaLabel: dto.ctaLabel ?? null,
        ctaUrl: dto.ctaUrl ?? null,
        productId: dto.productId ?? null,
        accentColor: dto.accentColor ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    await this.bustCatalogCache();
    return banner;
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    const banner = await this.prisma.banner.update({ where: { id }, data: { ...dto } });
    await this.bustCatalogCache();
    return banner;
  }

  async deleteBanner(id: string) {
    await this.prisma.banner.delete({ where: { id } });
    await this.bustCatalogCache();
    return { deleted: true };
  }

  // ------------------------------------------------------ payment gateways

  async listGateways() {
    const rows = await this.prisma.paymentGateway.findMany({ orderBy: { sortOrder: "asc" } });
    return rows.map((g) => ({
      id: g.id,
      provider: g.provider,
      displayName: g.displayName || PAYMENT_PROVIDER_LABELS[g.provider as PaymentProviderCode],
      description: g.description,
      isEnabled: g.isEnabled,
      isTestMode: g.isTestMode,
      feePercent: g.feePercent.toFixed(2),
      sortOrder: g.sortOrder,
    }));
  }

  async updateGateway(id: string, dto: UpdateGatewayDto) {
    return this.prisma.paymentGateway.update({
      where: { id },
      data: {
        ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
        ...(dto.isTestMode !== undefined ? { isTestMode: dto.isTestMode } : {}),
        ...(dto.feePercent !== undefined ? { feePercent: dto.feePercent } : {}),
      },
    });
  }
}
