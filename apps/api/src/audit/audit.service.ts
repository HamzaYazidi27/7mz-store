import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { ActorType, Prisma } from "../generated/prisma/client";

export interface AuditEntry {
  action: string; // "auth.login", "product.update", "order.refund", ...
  actorType?: ActorType;
  actorId?: string | null;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * AuditService — immutable trail of every security-relevant event.
 * Writes are fire-safe: an audit failure is logged but never fails the
 * business operation it documents.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          actorType: entry.actorType ?? (entry.actorId ? "USER" : "SYSTEM"),
          actorId: entry.actorId ?? null,
          entityType: entry.entityType ?? null,
          entityId: entry.entityId ?? null,
          before: (entry.before as Prisma.InputJsonValue) ?? undefined,
          after: (entry.after as Prisma.InputJsonValue) ?? undefined,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
        },
      });
    } catch (err) {
      this.logger.error(`Audit write failed for ${entry.action}: ${(err as Error).message}`);
    }
  }
}
