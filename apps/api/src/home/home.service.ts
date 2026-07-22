import { Injectable } from "@nestjs/common";
import type { AnnouncementDto, HomeFeedDto } from "@7mz/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { CatalogService } from "../catalog/catalog.service";
import { toBannerDto, toProductCard } from "../catalog/catalog.mapper";

const FEED_CACHE_KEY = "home:feed:v1";
const FEED_TTL_SECONDS = 60;

type SharedFeed = Omit<HomeFeedDto, "unreadNotifications">;

/**
 * HomeService — one aggregated payload for the entire home screen.
 * The shared portion (banners, rails, categories) is cached for a minute;
 * the per-user unread count is computed per request.
 */
@Injectable()
export class HomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly catalog: CatalogService,
  ) {}

  async feed(userId: string | null): Promise<HomeFeedDto> {
    const [shared, unreadNotifications] = await Promise.all([
      this.redis.remember<SharedFeed>(FEED_CACHE_KEY, FEED_TTL_SECONDS, () => this.buildShared()),
      userId
        ? this.prisma.notification.count({ where: { userId, readAt: null } })
        : Promise.resolve(0),
    ]);

    return { ...shared, unreadNotifications };
  }

  private async buildShared(): Promise<SharedFeed> {
    const now = new Date();
    const activeWindow = {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    };

    const productInclude = { category: { select: { id: true, name: true } } } as const;

    const [banners, announcements, categories, featured, flashSale] = await Promise.all([
      this.prisma.banner.findMany({
        where: activeWindow,
        orderBy: { sortOrder: "asc" },
        include: { product: { select: { slug: true, price: true } } },
      }),
      this.prisma.announcement.findMany({
        where: activeWindow,
        orderBy: { createdAt: "desc" },
        take: 2,
      }),
      this.catalog.categories(),
      this.prisma.product.findMany({
        where: { isActive: true, isFeatured: true },
        orderBy: { soldCount: "desc" },
        take: 6,
        include: productInclude,
      }),
      this.prisma.product.findMany({
        where: {
          isActive: true,
          isFlashSale: true,
          OR: [{ flashSaleEndsAt: null }, { flashSaleEndsAt: { gte: now } }],
        },
        orderBy: { flashSaleEndsAt: "asc" },
        take: 8,
        include: productInclude,
      }),
    ]);

    // Best sellers exclude the featured rail so the home page shows variety.
    const bestSellers = await this.prisma.product.findMany({
      where: { isActive: true, id: { notIn: featured.map((p) => p.id) } },
      orderBy: { soldCount: "desc" },
      take: 6,
      include: productInclude,
    });

    return {
      banners: banners.map(toBannerDto),
      announcements: announcements.map(
        (a): AnnouncementDto => ({
          id: a.id,
          title: a.title,
          body: a.body,
          level: a.level as AnnouncementDto["level"],
        }),
      ),
      categories,
      featured: featured.map(toProductCard),
      flashSale: flashSale.map(toProductCard),
      bestSellers: bestSellers.map(toProductCard),
    };
  }
}
