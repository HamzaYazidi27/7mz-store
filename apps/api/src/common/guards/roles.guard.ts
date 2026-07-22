import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { UserRole } from "../../generated/prisma/enums";
import type { AuthUser } from "../../auth/types";

const ROLE_WEIGHT: Record<UserRole, number> = {
  CUSTOMER: 0,
  SUPPORT: 1,
  MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

/**
 * Role hierarchy guard — routes annotated with @Roles(...) admit any user
 * whose role weight meets the lowest required weight.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user) throw new ForbiddenException("Insufficient permissions");

    const minRequired = Math.min(...required.map((role) => ROLE_WEIGHT[role]));
    if (ROLE_WEIGHT[user.role] < minRequired) {
      throw new ForbiddenException("Insufficient permissions");
    }
    return true;
  }
}
