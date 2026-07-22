import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { AuthUser, JwtAccessPayload } from "../../auth/types";

/**
 * Global JWT guard — every route requires a valid access token unless
 * explicitly marked @Public(). Attaches the AuthUser principal to the request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();

    if (isPublic) {
      // Optional auth: attach the principal when a valid token is present so
      // public routes (home feed, catalog) can personalize for signed-in users.
      const token = this.extractToken(request);
      if (token) {
        try {
          const payload = await this.jwt.verifyAsync<JwtAccessPayload>(token, {
            secret: this.config.getOrThrow<string>("auth.accessSecret"),
          });
          if (payload.type === "access") {
            request.user = { id: payload.sub, role: payload.role, sessionId: payload.sid };
          }
        } catch {
          /* invalid token on a public route → treat as guest */
        }
      }
      return true;
    }

    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException("Missing access token");

    try {
      const payload = await this.jwt.verifyAsync<JwtAccessPayload>(token, {
        secret: this.config.getOrThrow<string>("auth.accessSecret"),
      });
      if (payload.type !== "access") throw new Error("wrong token type");

      request.user = {
        id: payload.sub,
        role: payload.role,
        sessionId: payload.sid,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(" ");
    return scheme === "Bearer" && token ? token : null;
  }
}
