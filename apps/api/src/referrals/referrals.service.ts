import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import type { LeaderboardEntryDto, ReferralStatsDto } from "@7mz/shared";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";

/**
 * ReferralsService — affiliate commissions and leaderboard.
 *
 * Listens for `order.completed` and, if the buyer was referred, credits the
 * referrer a percentage commission to their wallet and records the earning.
 * Idempotent per order (one earning row per order).
 */
@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly config: ConfigService,
  ) {}

  private get commissionPercent(): number {
    return this.config.get<number>("growth.referralCommissionPercent") ?? 5;
  }

  @OnEvent("order.completed")
  async onOrderCompleted(payload: { orderId: string; userId: string; total: number; orderNumber: string }) {
    try {
      const buyer = await this.prisma.user.findUnique({ where: { id: payload.userId } });
      if (!buyer?.referredById) return;

      const existing = await this.prisma.referralEarning.findFirst({
        where: { orderId: payload.orderId },
      });
      if (existing) return; // idempotent

      const percent = this.commissionPercent;
      const amount = Math.round(payload.total * (percent / 100) * 100) / 100;
      if (amount <= 0) return;

      await this.prisma.$transaction(async (tx) => {
        await this.wallet.applyLedger(tx, {
          userId: buyer.referredById!,
          type: "REFERRAL_COMMISSION",
          amount,
          description: `Referral commission from ${buyer.firstName}`,
          reference: payload.orderNumber,
        });
        await tx.referralEarning.create({
          data: {
            referrerId: buyer.referredById!,
            referredUserId: buyer.id,
            orderId: payload.orderId,
            amount,
            percent,
          },
        });
      });

      this.logger.log(`Referral commission $${amount} → ${buyer.referredById}`);
    } catch (err) {
      this.logger.error(`Referral commission failed: ${(err as Error).message}`);
    }
  }

  async getStats(userId: string): Promise<ReferralStatsDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const botUsername = this.config.get<string | null>("telegram.botUsername");
    const inviteLink = botUsername
      ? `https://t.me/${botUsername}?startapp=ref_${user.referralCode}`
      : `ref_${user.referralCode}`;

    const [totalReferrals, activeReferrals, earnings, recent] = await Promise.all([
      this.prisma.user.count({ where: { referredById: userId } }),
      this.prisma.user.count({
        where: { referredById: userId, orders: { some: { status: "COMPLETED" } } },
      }),
      this.prisma.referralEarning.aggregate({
        where: { referrerId: userId },
        _sum: { amount: true },
      }),
      this.prisma.referralEarning.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { referredUser: { select: { firstName: true, photoUrl: true } } },
      }),
    ]);

    return {
      referralCode: user.referralCode,
      inviteLink,
      commissionPercent: this.commissionPercent.toFixed(0),
      totalReferrals,
      activeReferrals,
      totalEarned: (earnings._sum.amount ?? 0).toFixed(2),
      pendingEarnings: "0.00",
      recentEarnings: recent.map((e) => ({
        id: e.id,
        amount: e.amount.toFixed(2),
        percent: e.percent.toFixed(0),
        referredUser: {
          firstName: e.referredUser.firstName,
          photoUrl: e.referredUser.photoUrl,
        },
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  async leaderboard(userId: string, limit = 20): Promise<LeaderboardEntryDto[]> {
    const grouped = await this.prisma.referralEarning.groupBy({
      by: ["referrerId"],
      _sum: { amount: true },
      _count: { referredUserId: true },
      orderBy: { _sum: { amount: "desc" } },
      take: limit,
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.referrerId) } },
      select: { id: true, firstName: true, photoUrl: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return grouped.map((g, i) => {
      const u = byId.get(g.referrerId);
      return {
        rank: i + 1,
        firstName: u?.firstName ?? "User",
        photoUrl: u?.photoUrl ?? null,
        referralsCount: g._count.referredUserId,
        totalEarned: (g._sum.amount ?? 0).toFixed(2),
        isCurrentUser: g.referrerId === userId,
      };
    });
  }
}
