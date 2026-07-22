import {
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";
import type { AuthResponse, AuthTokens } from "@7mz/shared";
import { AuditService } from "../audit/audit.service";
import { CryptoService } from "../crypto/crypto.service";
import { PrismaService } from "../prisma/prisma.service";
import type { User } from "../generated/prisma/client";
import { toUserDto } from "../users/mappers/user.mapper";
import type { TelegramAuthDto } from "./dto/auth.dto";
import {
  parseInitData,
  verifyTelegramInitData,
  type ParsedInitData,
} from "./telegram-init-data";
import { verifyTelegramLogin, type TelegramLoginData } from "./telegram-login";
import { STAFF_ROLES } from "@7mz/shared";
import type { AuthUser, JwtAccessPayload, JwtRefreshPayload } from "./types";

export interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  ios: "Telegram iOS",
  android: "Telegram Android",
  android_x: "Telegram Android X",
  tdesktop: "Telegram Desktop",
  macos: "Telegram macOS",
  weba: "Telegram Web",
  webk: "Telegram Web",
  "webview-mock": "Dev Preview",
};

/**
 * AuthService — Telegram-native authentication.
 *
 * Login: verifies the WebApp initData HMAC signature against the bot token,
 * upserts the user, binds referrals from the deep-link start param, and
 * issues an access/refresh token pair bound to a device session.
 *
 * Refresh: strict rotation with reuse detection — presenting a stale
 * refresh token revokes every session of the account (token-theft response).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  // --------------------------------------------------------------- login

  async loginWithTelegram(dto: TelegramAuthDto, meta: RequestMeta): Promise<AuthResponse> {
    const parsed = this.verifyOrBypass(dto.initData);
    const tgUser = parsed.user!;
    const telegramId = BigInt(tgUser.id);

    const existing = await this.prisma.user.findUnique({ where: { telegramId } });

    let user: User;
    let isNewUser = false;

    if (!existing) {
      isNewUser = true;
      const referredById = await this.resolveReferrer(
        dto.startParam ?? parsed.startParam,
        telegramId,
      );
      user = await this.prisma.user.create({
        data: {
          telegramId,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name ?? null,
          username: tgUser.username ?? null,
          photoUrl: tgUser.photo_url ?? null,
          languageCode: tgUser.language_code ?? "en",
          referralCode: await this.uniqueReferralCode(),
          referredById,
          lastLoginAt: new Date(),
        },
      });
      this.events.emit("user.registered", { userId: user.id, referredById });
      await this.audit.log({
        action: "auth.register",
        actorId: user.id,
        entityType: "User",
        entityId: user.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    } else {
      if (existing.status === "BANNED") {
        throw new ForbiddenException("This account has been suspended");
      }
      if (existing.status === "DELETED") {
        throw new ForbiddenException("This account has been deleted");
      }
      user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: tgUser.first_name,
          lastName: tgUser.last_name ?? null,
          username: tgUser.username ?? null,
          photoUrl: tgUser.photo_url ?? existing.photoUrl,
          languageCode: tgUser.language_code ?? existing.languageCode,
          lastLoginAt: new Date(),
        },
      });
    }

    const tokens = await this.issueSession(user, dto.platform ?? null, meta);

    await this.prisma.loginHistory.create({
      data: {
        userId: user.id,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        platform: dto.platform ?? null,
        success: true,
      },
    });
    this.events.emit("user.login", { userId: user.id });

    return { user: toUserDto(user), tokens, isNewUser };
  }

  // ------------------------------------------------------- admin login

  /**
   * Admin panel login via Telegram Login Widget. Only users who already hold a
   * staff role may obtain an admin session — customers are rejected even with
   * valid Telegram data.
   */
  async loginAdmin(data: TelegramLoginData, meta: RequestMeta): Promise<AuthResponse> {
    const devBypass = this.config.get<boolean>("auth.devBypass");
    const botToken = this.config.get<string | null>("telegram.botToken");

    const ok =
      (devBypass && data.hash === "dev-mode-unsigned") ||
      (botToken ? verifyTelegramLogin(data, botToken) : false);
    if (!ok) throw new UnauthorizedException("Telegram login verification failed");

    const user = await this.prisma.user.findUnique({ where: { telegramId: BigInt(data.id) } });
    if (!user) throw new ForbiddenException("No account found for this Telegram user");
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException("This account does not have admin access");
    }
    if (user.status !== "ACTIVE") throw new ForbiddenException("Account unavailable");

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const tokens = await this.issueSession(user, "admin-web", meta);
    await this.audit.log({
      action: "auth.admin_login",
      actorId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { user: toUserDto(user), tokens, isNewUser: false };
  }

  // --------------------------------------------------------------- refresh

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>("auth.refreshSecret"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Session expired — please sign in again");
    }

    const presentedHash = this.crypto.sha256(refreshToken);
    if (session.refreshTokenHash !== presentedHash) {
      // The token was already rotated: someone is replaying an old token.
      await this.prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.log({
        action: "auth.refresh_reuse_detected",
        actorId: session.userId,
        entityType: "Session",
        entityId: session.id,
      });
      this.logger.warn(`Refresh token reuse detected for user ${session.userId}`);
      throw new UnauthorizedException("Session security violation — please sign in again");
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account unavailable");
    }

    const tokens = await this.signTokenPair(user, session.id);
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: this.crypto.sha256(tokens.refreshToken),
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
      },
    });

    return tokens;
  }

  // --------------------------------------------------------------- logout

  async logout(user: AuthUser): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: user.sessionId, userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      action: "auth.logout",
      actorId: user.id,
      entityType: "Session",
      entityId: user.sessionId,
    });
  }

  // --------------------------------------------------------------- internals

  private get accessTtl(): number {
    return this.config.getOrThrow<number>("auth.accessTtl");
  }

  private get refreshTtl(): number {
    return this.config.getOrThrow<number>("auth.refreshTtl");
  }

  private verifyOrBypass(initData: string): ParsedInitData {
    const devBypass = this.config.get<boolean>("auth.devBypass");
    if (devBypass) {
      const parsed = parseInitData(initData);
      if (parsed?.hash === "dev-mode-unsigned" && parsed.user) {
        this.logger.warn("AUTH_DEV_BYPASS accepted unsigned initData (development only)");
        return parsed;
      }
    }

    const botToken = this.config.get<string | null>("telegram.botToken");
    if (!botToken) {
      throw new ServiceUnavailableException(
        "Telegram login is not configured (TELEGRAM_BOT_TOKEN missing)",
      );
    }

    const result = verifyTelegramInitData(initData, botToken);
    if (!result.ok) {
      throw new UnauthorizedException(`Telegram authentication failed (${result.reason})`);
    }
    return result.data;
  }

  private async issueSession(
    user: User,
    platform: string | null,
    meta: RequestMeta,
  ): Promise<AuthTokens> {
    const sid = randomUUID();
    const tokens = await this.signTokenPair(user, sid);

    await this.prisma.session.create({
      data: {
        id: sid,
        userId: user.id,
        refreshTokenHash: this.crypto.sha256(tokens.refreshToken),
        platform,
        deviceLabel: (platform && PLATFORM_LABELS[platform]) ?? platform ?? "Telegram",
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
      },
    });

    return tokens;
  }

  private async signTokenPair(user: User, sid: string): Promise<AuthTokens> {
    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      role: user.role,
      sid,
      type: "access",
    };
    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      sid,
      jti: randomUUID(),
      type: "refresh",
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.getOrThrow<string>("auth.accessSecret"),
        expiresIn: this.accessTtl,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>("auth.refreshSecret"),
        expiresIn: this.refreshTtl,
      }),
    ]);

    return { accessToken, refreshToken, expiresIn: this.accessTtl };
  }

  private async uniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = this.crypto.randomCode(8);
      const clash = await this.prisma.user.findUnique({ where: { referralCode: code } });
      if (!clash) return code;
    }
    // 32^8 space — five collisions in a row is effectively impossible.
    return `${this.crypto.randomCode(8)}${Date.now() % 97}`;
  }

  private async resolveReferrer(
    startParam: string | null | undefined,
    newUserTelegramId: bigint,
  ): Promise<string | null> {
    if (!startParam) return null;
    const code = startParam.startsWith("ref_") ? startParam.slice(4) : startParam;
    if (!/^[A-Z0-9]{4,16}$/i.test(code)) return null;

    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: code.toUpperCase() },
    });
    if (!referrer || referrer.telegramId === newUserTelegramId) return null;
    return referrer.id;
  }
}
