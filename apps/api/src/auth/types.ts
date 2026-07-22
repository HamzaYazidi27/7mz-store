import type { UserRole } from "../generated/prisma/enums";

/** Authenticated principal attached to every request by JwtAuthGuard. */
export interface AuthUser {
  id: string;
  role: UserRole;
  sessionId: string;
}

/** Access token payload — short-lived (default 15 minutes). */
export interface JwtAccessPayload {
  sub: string;
  role: UserRole;
  sid: string;
  type: "access";
}

/**
 * Refresh token payload — long-lived (default 30 days), rotated on use.
 * `jti` guarantees every issued token is byte-unique (even within the same
 * second), which is what makes rotation + reuse-detection reliable.
 */
export interface JwtRefreshPayload {
  sub: string;
  sid: string;
  jti: string;
  type: "refresh";
}
