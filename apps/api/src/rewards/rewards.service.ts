import { BadRequestException, Injectable } from "@nestjs/common";
import { DAILY_REWARD_LADDER } from "@7mz/shared";
import type { DailyRewardStateDto, SpinPrizeDto, SpinResultDto, SpinStateDto } from "@7mz/shared";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";

const SPIN_COOLDOWN_MS = 24 * 3_600_000;

/**
 * RewardsService — daily streak rewards and the prize wheel.
 *
 * Daily: a claim advances the streak (resets if a day was missed) and credits
 * the ladder amount for the streak day. Spin: weighted random prize once per
 * cooldown; balance prizes credit immediately, coupon prizes are surfaced.
 */
@Injectable()
export class RewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  // ----------------------------------------------------------- daily

  private ladderAmount(day: number): number {
    const idx = Math.min(day - 1, DAILY_REWARD_LADDER.length - 1);
    return DAILY_REWARD_LADDER[Math.max(0, idx)]!;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.toDateString() === b.toDateString();
  }

  async dailyState(userId: string): Promise<DailyRewardStateDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const now = new Date();
    const last = user.lastDailyClaimAt;
    const canClaim = !last || !this.isSameDay(last, now);
    const streak = user.dailyStreak;
    const nextDay = canClaim ? streak + 1 : streak;

    const ladder = DAILY_REWARD_LADDER.map((amount, i) => ({
      day: i + 1,
      amount: amount.toFixed(2),
      claimed: i + 1 <= streak,
      isToday: i + 1 === nextDay,
    }));

    return {
      streak,
      canClaim,
      nextClaimAt: canClaim ? null : new Date(now.getTime() + 24 * 3_600_000).toISOString(),
      todayAmount: this.ladderAmount(nextDay).toFixed(2),
      ladder,
    };
  }

  async claimDaily(userId: string): Promise<{ amount: string; streak: number; balance: string }> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const now = new Date();
      const last = user.lastDailyClaimAt;

      if (last && this.isSameDay(last, now)) {
        throw new BadRequestException("Already claimed today — come back tomorrow");
      }

      // Continue the streak if the last claim was yesterday, else reset.
      const yesterday = new Date(now.getTime() - 24 * 3_600_000);
      const continues = last && this.isSameDay(last, yesterday);
      const streak = continues ? user.dailyStreak + 1 : 1;
      const amount = this.ladderAmount(streak);

      await tx.user.update({
        where: { id: userId },
        data: { dailyStreak: streak, lastDailyClaimAt: now },
      });
      await tx.dailyRewardClaim.create({ data: { userId, day: streak, amount } });
      const { balanceAfter } = await this.wallet.applyLedger(tx, {
        userId,
        type: "DAILY_REWARD",
        amount,
        description: `Daily reward · day ${streak}`,
      });

      return { amount: amount.toFixed(2), streak, balance: balanceAfter.toFixed(2) };
    });
  }

  // ------------------------------------------------------------- spin

  async spinState(userId: string): Promise<SpinStateDto> {
    const [user, prizes] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.spinPrize.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    ]);
    const canSpin = !user.nextFreeSpinAt || user.nextFreeSpinAt <= new Date();
    return {
      canSpin,
      nextSpinAt: user.nextFreeSpinAt?.toISOString() ?? null,
      prizes: prizes.map(this.toPrizeDto),
    };
  }

  async spin(userId: string): Promise<SpinResultDto> {
    const prizes = await this.prisma.spinPrize.findMany({ where: { isActive: true } });
    if (prizes.length === 0) throw new BadRequestException("No prizes configured");

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.nextFreeSpinAt && user.nextFreeSpinAt > new Date()) {
        throw new BadRequestException("Spin not available yet");
      }

      // Weighted random selection.
      const totalWeight = prizes.reduce((s, p) => s + p.weight, 0);
      let roll = Math.random() * totalWeight;
      let chosen = prizes[prizes.length - 1]!;
      for (const p of prizes) {
        roll -= p.weight;
        if (roll <= 0) {
          chosen = p;
          break;
        }
      }

      await tx.user.update({
        where: { id: userId },
        data: { nextFreeSpinAt: new Date(Date.now() + SPIN_COOLDOWN_MS) },
      });

      let awarded = 0;
      let balanceAfter = Number(user.balance);
      if (chosen.type === "BALANCE" && Number(chosen.value) > 0) {
        awarded = Number(chosen.value);
        const res = await this.wallet.applyLedger(tx, {
          userId,
          type: "SPIN_REWARD",
          amount: awarded,
          description: `Prize wheel · ${chosen.label}`,
        });
        balanceAfter = res.balanceAfter;
      }

      await tx.spinResult.create({
        data: { userId, prizeId: chosen.id, awardedAmount: awarded },
      });

      return { chosen, awarded, balanceAfter };
    });

    return {
      prize: this.toPrizeDto(result.chosen),
      awardedAmount: result.awarded.toFixed(2),
      couponCode: result.chosen.type === "COUPON" ? result.chosen.couponCode : null,
      newBalance: result.balanceAfter.toFixed(2),
    };
  }

  private toPrizeDto(p: {
    id: string;
    label: string;
    type: string;
    value: { toFixed: (n: number) => string };
    color: string | null;
    icon: string | null;
  }): SpinPrizeDto {
    return {
      id: p.id,
      label: p.label,
      type: p.type as SpinPrizeDto["type"],
      value: p.value.toFixed(2),
      color: p.color,
      icon: p.icon,
    };
  }
}
