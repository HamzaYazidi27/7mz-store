import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import type { MissionDto } from "@7mz/shared";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";

/**
 * MissionsService — gamified tasks with wallet rewards.
 *
 * Progress is event-driven: domain events (order.completed, deposit.completed,
 * user.profile_completed, review.created, referral) advance the matching
 * mission. Rewards are claimed explicitly by the user once complete.
 */
@Injectable()
export class MissionsService {
  private readonly logger = new Logger(MissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async listForUser(userId: string): Promise<MissionDto[]> {
    const [missions, userMissions] = await Promise.all([
      this.prisma.mission.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
      this.prisma.userMission.findMany({ where: { userId } }),
    ]);
    const byMission = new Map(userMissions.map((um) => [um.missionId, um]));

    return missions.map((m) => {
      const um = byMission.get(m.id);
      return {
        id: m.id,
        code: m.code,
        title: m.title,
        description: m.description,
        icon: m.icon,
        rewardAmount: m.rewardAmount.toFixed(2),
        target: m.target,
        progress: um?.progress ?? 0,
        completed: !!um?.completedAt,
        claimed: !!um?.claimedAt,
      };
    });
  }

  async claim(userId: string, missionId: string): Promise<{ rewardAmount: string; balance: string }> {
    return this.prisma.$transaction(async (tx) => {
      const mission = await tx.mission.findUniqueOrThrow({ where: { id: missionId } });
      const um = await tx.userMission.findUnique({
        where: { userId_missionId: { userId, missionId } },
      });
      if (!um || !um.completedAt) throw new NotFoundException("Mission not completed");
      if (um.claimedAt) throw new NotFoundException("Reward already claimed");

      await tx.userMission.update({
        where: { id: um.id },
        data: { claimedAt: new Date() },
      });
      const { balanceAfter } = await this.wallet.applyLedger(tx, {
        userId,
        type: "MISSION_REWARD",
        amount: Number(mission.rewardAmount),
        description: `Mission reward · ${mission.title}`,
      });
      return { rewardAmount: mission.rewardAmount.toFixed(2), balance: balanceAfter.toFixed(2) };
    });
  }

  /** Advances a mission by code for a user; marks complete when target met. */
  async progress(userId: string, code: string, by = 1): Promise<void> {
    const mission = await this.prisma.mission.findUnique({ where: { code } });
    if (!mission || !mission.isActive) return;

    const um = await this.prisma.userMission.upsert({
      where: { userId_missionId: { userId, missionId: mission.id } },
      create: { userId, missionId: mission.id, progress: Math.min(by, mission.target) },
      update: {},
    });

    if (um.completedAt) return;

    const newProgress = Math.min(um.progress + by, mission.target);
    await this.prisma.userMission.update({
      where: { id: um.id },
      data: {
        progress: newProgress,
        completedAt: newProgress >= mission.target ? new Date() : null,
      },
    });
  }

  // ---------------------------------------------------------- event hooks

  @OnEvent("order.completed")
  async onOrder(payload: { userId: string; total: number }) {
    await this.progress(payload.userId, "BUY_FIRST_PRODUCT", 1).catch(() => undefined);
    await this.progress(payload.userId, "SPEND_50", Math.round(payload.total)).catch(() => undefined);
  }

  @OnEvent("deposit.completed")
  async onDeposit(payload: { userId: string }) {
    await this.progress(payload.userId, "FIRST_DEPOSIT", 1).catch(() => undefined);
  }

  @OnEvent("user.profile_completed")
  async onProfile(payload: { userId: string }) {
    await this.progress(payload.userId, "COMPLETE_PROFILE", 1).catch(() => undefined);
  }

  @OnEvent("review.created")
  async onReview(payload: { userId: string }) {
    await this.progress(payload.userId, "LEAVE_REVIEW", 1).catch(() => undefined);
  }

  @OnEvent("referral.joined")
  async onReferral(payload: { referrerId: string }) {
    await this.progress(payload.referrerId, "INVITE_FRIEND", 1).catch(() => undefined);
  }
}
