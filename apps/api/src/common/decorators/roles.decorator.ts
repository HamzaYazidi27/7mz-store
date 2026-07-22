import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "../../generated/prisma/enums";

export const ROLES_KEY = "requiredRoles";

/**
 * Requires a minimum staff role. Roles form a hierarchy
 * (CUSTOMER < SUPPORT < MANAGER < ADMIN < SUPER_ADMIN) — passing several
 * roles allows any of them; the guard resolves by weight, so
 * `@Roles("MANAGER")` also admits ADMIN and SUPER_ADMIN.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
