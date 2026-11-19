import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditChainReport {
  /** Chained rows walked before stopping (all of them when intact). */
  checked: number;
  /** Rows from before hash chaining existed; outside the chain by design. */
  legacy: number;
  intact: boolean;
  firstBrokenId: string | null;
}

/**
 * Single write path for the audit trail (starter docs Phase 14: "audit
 * logs for consequential changes"). Every platform-admin mutation calls
 * this.
 *
 * Tamper evidence lives in the database, not here: a BEFORE INSERT trigger
 * chains each row (`hash = sha256(prevHash | row)`) and a second trigger
 * rejects UPDATE/DELETE/TRUNCATE. Doing it in SQL means rows written by code
 * that bypasses this service are chained too. Known limit: a hash chain proves
 * a row was altered or removed from the middle, not that the newest rows were
 * truncated — pair with external log shipping if that matters.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
    reason?: string,
  ): Promise<void> {
    await this.recordIn(
      this.prisma,
      actorId,
      action,
      entityType,
      entityId,
      metadata,
      reason,
    );
  }

  /**
   * Same, inside the caller's transaction — for sensitive actions where the
   * change and its audit row must commit or roll back together (no action
   * without a trail, no trail for an action that did not happen).
   */
  async recordIn(
    db: Prisma.TransactionClient | PrismaService,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
    reason?: string,
  ): Promise<void> {
    await db.adminAuditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        reason: reason?.trim() || undefined,
        metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /** Re-walks the hash chain in the database (`admin_audit_verify()`). */
  async verifyChain(): Promise<AuditChainReport> {
    const rows = await this.prisma.$queryRaw<
      {
        checked: bigint;
        legacy: bigint;
        first_broken_id: string | null;
      }[]
    >`SELECT * FROM admin_audit_verify()`;
    const row = rows[0];
    return {
      checked: Number(row?.checked ?? 0),
      legacy: Number(row?.legacy ?? 0),
      intact: !row?.first_broken_id,
      firstBrokenId: row?.first_broken_id ?? null,
    };
  }
}
