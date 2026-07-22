import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  CategoryDto,
  CursorPaginated,
  ProductCardDto,
  ProductDetailDto,
  ProductReviewsSummaryDto,
  ReviewDto,
} from "@7mz/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import type { Prisma } from "../generated/prisma/client";
import { toCategoryDto, toProductCard, toProductDetail, toReviewDto } from "./catalog.mapper";
import type { ProductQueryDto } from "./dto/product-query.dto";

const CACHE_TTL = {
  categories: 120,
} as const;

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ------------------------------------------------------------- categories

  async categories(): Promise<CategoryDto[]> {
    return this.redis.remember("catalog:categories:v1", CACHE_TTL.categories, async () => {
      const rows = await this.prisma.category.findMany({
        where: { isVisible: true, parentId: null },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { products: { where: { isActive: true } } } },
          children: {
            where: { isVisible: true },
            orderBy: { sortOrder: "asc" },
            include: { _count: { select: { products: { where: { isActive: true } } } } },
          },
        },
      });

      return rows.map((row) =>
        toCategoryDto({
          ...row,
          productCount:
            row._count.products +
            row.children.reduce((sum, child) => sum + child._count.products, 0),
          children: row.children.map((child) =>
            toCategoryDto({ ...child, productCount: child._count.products }),
          ),
        }),
      );
    });
  }

  /** Invalidate catalog caches — called by admin mutations later. */
  async invalidateCache(): Promise<void> {
    await this.redis.delByPattern("catalog:*");
    await this.redis.del("home:feed:v1");
  }

  // ---------------------------------------------------------------- listing

  async listProducts(query: ProductQueryDto): Promise<CursorPaginated<ProductCardDto>> {
    const where = await this.buildWhere(query);
    const orderBy = this.buildOrderBy(query.sort);

    const rows = await this.prisma.product.findMany({
      where,
      orderBy,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { category: { select: { id: true, name: true } } },
    });

    const hasNext = rows.length > query.limit;
    const page = hasNext ? rows.slice(0, query.limit) : rows;

    return {
      items: page.map(toProductCard),
      nextCursor: hasNext ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  // ----------------------------------------------------------------- detail

  async productBySlug(slug: string): Promise<ProductDetailDto> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: { select: { id: true, name: true } },
        faqs: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!product || !product.isActive) throw new NotFoundException("Product not found");

    // Fire-and-forget view counter — never blocks the response.
    void this.prisma.product
      .update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);

    return toProductDetail(product);
  }

  async relatedProducts(slug: string, limit = 6): Promise<ProductCardDto[]> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true, categoryId: true },
    });
    if (!product) throw new NotFoundException("Product not found");

    const rows = await this.prisma.product.findMany({
      where: { categoryId: product.categoryId, isActive: true, id: { not: product.id } },
      orderBy: { soldCount: "desc" },
      take: limit,
      include: { category: { select: { id: true, name: true } } },
    });
    return rows.map(toProductCard);
  }

  // ---------------------------------------------------------------- reviews

  async productReviews(
    slug: string,
    cursor?: string,
    limit = 10,
  ): Promise<CursorPaginated<ReviewDto> & { summary: ProductReviewsSummaryDto }> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true, rating: true, reviewCount: true },
    });
    if (!product) throw new NotFoundException("Product not found");

    const [rows, distribution, purchases] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId: product.id, isApproved: true },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: { user: { select: { firstName: true, lastName: true, photoUrl: true } } },
      }),
      this.prisma.review.groupBy({
        by: ["rating"],
        where: { productId: product.id, isApproved: true },
        _count: true,
      }),
      this.prisma.orderItem.findMany({
        where: { productId: product.id, order: { status: "COMPLETED" } },
        select: { order: { select: { userId: true } } },
        distinct: ["orderId"],
      }),
    ]);

    const buyerIds = new Set(purchases.map((p) => p.order.userId));
    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;

    const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of distribution) {
      dist[d.rating as 1 | 2 | 3 | 4 | 5] = d._count;
    }

    return {
      items: page.map((row) => toReviewDto(row, buyerIds.has(row.userId))),
      nextCursor: hasNext ? (page[page.length - 1]?.id ?? null) : null,
      summary: {
        average: product.rating,
        total: product.reviewCount,
        distribution: dist,
      },
    };
  }

  // -------------------------------------------------------------- internals

  private async buildWhere(query: ProductQueryDto): Promise<Prisma.ProductWhereInput> {
    const conditions: Prisma.ProductWhereInput[] = [{ isActive: true }];

    if (query.search) {
      const term = query.search.trim();
      conditions.push({
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { shortDescription: { contains: term, mode: "insensitive" } },
          { tags: { has: term.toLowerCase() } },
        ],
      });
    }

    if (query.category || query.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: query.categoryId ? { id: query.categoryId } : { slug: query.category },
        include: { children: { select: { id: true } } },
      });
      if (!category) {
        // Unknown category — return an impossible condition (empty result).
        conditions.push({ id: "__none__" });
      } else {
        const ids = [category.id, ...category.children.map((child) => child.id)];
        conditions.push({ categoryId: { in: ids } });
      }
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      conditions.push({
        price: {
          ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
          ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
        },
      });
    }

    if (query.inStock) conditions.push({ stockCount: { gt: 0 } });

    if (query.onSale || query.sort === "discount") {
      conditions.push({
        OR: [{ compareAtPrice: { not: null } }, { isFlashSale: true }],
      });
    }

    return { AND: conditions };
  }

  private buildOrderBy(sort: ProductQueryDto["sort"]): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case "newest":
        return [{ createdAt: "desc" }, { id: "asc" }];
      case "rating":
        return [{ rating: "desc" }, { reviewCount: "desc" }, { id: "asc" }];
      case "discount":
        return [{ isFlashSale: "desc" }, { soldCount: "desc" }, { id: "asc" }];
      case "price_asc":
        return [{ price: "asc" }, { id: "asc" }];
      case "price_desc":
        return [{ price: "desc" }, { id: "asc" }];
      case "popular":
      default:
        return [{ soldCount: "desc" }, { id: "asc" }];
    }
  }
}
