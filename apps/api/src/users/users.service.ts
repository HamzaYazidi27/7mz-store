import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { generateSecret, generateURI, verifySync } from "otplib";
import * as QRCode from "qrcode";
import type {
  LoginHistoryDto,
  SessionDto,
  UserDto,
  UserStatsDto,
} from "@7mz/shared";
import { AuditService } from "../audit/audit.service";
import { CryptoService } from "../crypto/crypto.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../auth/types";
import { toUserDto } from "./mappers/user.mapper";
import type { UpdateProfileDto } from "./dto/users.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
  ) {}

  // ----------------------------------------------------------------- profile

  async me(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    return toUserDto(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const data: Record<string, unknown> = {};

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email === "") {
        data.email = null;
        data.emailVerifiedAt = null;
      } else if (email !== user.email) {
        const clash = await this.prisma.user.findUnique({ where: { email } });
        if (clash && clash.id !== userId) {
          throw new ConflictException("This email is already in use");
        }
        data.email = email;
        data.emailVerifiedAt = null; // re-verification required
      }
    }
    if (dto.theme !== undefined) data.theme = dto.theme;
    if (dto.languageCode !== undefined) data.languageCode = dto.languageCode;
    if (dto.notificationsEnabled !== undefined) {
      data.notificationsEnabled = dto.notificationsEnabled;
    }

    const updated = await this.prisma.user.update({ where: { id: userId }, data });

    if (data.email !== undefined) {
      await this.audit.log({
        action: "user.email_changed",
        actorId: userId,
        entityType: "User",
        entityId: userId,
        before: { email: user.email },
        after: { email: updated.email },
      });
    }

    return toUserDto(updated);
  }

  async stats(userId: string): Promise<UserStatsDto> {
    const [user, completedAgg, totalOrders, reviewsWritten, referralsCount, earningsAgg] =
      await Promise.all([
        this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
        this.prisma.order.aggregate({
          where: { userId, status: "COMPLETED" },
          _count: true,
          _sum: { total: true, discount: true },
        }),
        this.prisma.order.count({ where: { userId } }),
        this.prisma.review.count({ where: { userId } }),
        this.prisma.user.count({ where: { referredById: userId } }),
        this.prisma.referralEarning.aggregate({
          where: { referrerId: userId },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalOrders,
      completedOrders: completedAgg._count,
      totalSpent: (completedAgg._sum.total ?? 0).toFixed(2),
      totalSaved: (completedAgg._sum.discount ?? 0).toFixed(2),
      reviewsWritten,
      referralsCount,
      referralEarnings: (earningsAgg._sum.amount ?? 0).toFixed(2),
      memberSince: user.createdAt.toISOString(),
    };
  }

  // ---------------------------------------------------------------- sessions

  async sessions(user: AuthUser): Promise<SessionDto[]> {
    const rows = await this.prisma.session.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastActiveAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      deviceLabel: row.deviceLabel,
      platform: row.platform,
      ip: row.ip,
      lastActiveAt: row.lastActiveAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      isCurrent: row.id === user.sessionId,
    }));
  }

  async revokeSession(user: AuthUser, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId: user.id, revokedAt: null },
    });
    if (!session) throw new NotFoundException("Session not found");

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      action: "user.session_revoked",
      actorId: user.id,
      entityType: "Session",
      entityId: sessionId,
    });
  }

  async revokeOtherSessions(user: AuthUser): Promise<{ revoked: number }> {
    const result = await this.prisma.session.updateMany({
      where: { userId: user.id, id: { not: user.sessionId }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      action: "user.sessions_revoked_others",
      actorId: user.id,
      after: { count: result.count },
    });
    return { revoked: result.count };
  }

  async loginHistory(userId: string, limit = 20): Promise<LoginHistoryDto[]> {
    const rows = await this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 50),
    });
    return rows.map((row) => ({
      id: row.id,
      ip: row.ip,
      platform: row.platform,
      success: row.success,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  // -------------------------------------------------------------------- 2FA

  async setupTwoFactor(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.twoFactorEnabled) {
      throw new ConflictException("Two-factor authentication is already enabled");
    }

    const secret = generateSecret();
    const label = user.username ?? `user-${user.telegramId.toString()}`;
    const otpauthUrl = generateURI({ issuer: "7MZ Store", label, secret });
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240 });

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: this.crypto.encrypt(secret) },
    });

    return { secret, otpauthUrl, qrDataUrl };
  }

  async enableTwoFactor(userId: string, code: string): Promise<UserDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.twoFactorEnabled) {
      throw new ConflictException("Two-factor authentication is already enabled");
    }
    if (!user.twoFactorSecret) {
      throw new BadRequestException("Run 2FA setup first");
    }

    const secret = this.crypto.decrypt(user.twoFactorSecret);
    if (!verifySync({ token: code, secret }).valid) {
      throw new BadRequestException("Invalid code — check your authenticator app");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
    await this.audit.log({ action: "user.2fa_enabled", actorId: userId });
    return toUserDto(updated);
  }

  async disableTwoFactor(userId: string, code: string): Promise<UserDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException("Two-factor authentication is not enabled");
    }

    const secret = this.crypto.decrypt(user.twoFactorSecret);
    if (!verifySync({ token: code, secret }).valid) {
      throw new BadRequestException("Invalid code — check your authenticator app");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    await this.audit.log({ action: "user.2fa_disabled", actorId: userId });
    return toUserDto(updated);
  }
}
