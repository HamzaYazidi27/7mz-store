import type { UserDto } from "@7mz/shared";
import type { User } from "../../generated/prisma/client";

/** Maps a Prisma User row to the public UserDto (BigInt/Decimal-safe). */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    telegramId: user.telegramId.toString(),
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    photoUrl: user.photoUrl,
    languageCode: user.languageCode,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    role: user.role,
    balance: user.balance.toFixed(2),
    referralCode: user.referralCode,
    twoFactorEnabled: user.twoFactorEnabled,
    dailyStreak: user.dailyStreak,
    lastDailyClaimAt: user.lastDailyClaimAt?.toISOString() ?? null,
    nextFreeSpinAt: user.nextFreeSpinAt?.toISOString() ?? null,
    theme: user.theme,
    notificationsEnabled: user.notificationsEnabled,
    createdAt: user.createdAt.toISOString(),
  };
}
