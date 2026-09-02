import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrivacyRequestStatus, PrivacyRequestType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ERASURE_RETENTION_DAYS, ErasureService } from './erasure.service';

/**
 * Runs the 30-day erasure window (owner decision P.3a).
 *
 * A person who deletes their account is deactivated immediately and their
 * request is filed PENDING; this job carries it out once the window has
 * elapsed. Staff can still fulfil sooner from the console, which is the only
 * way to *cancel* too — login refuses a DELETED account, so the person cannot
 * sign back in themselves.
 */
@Injectable()
export class ErasureScheduler {
  private readonly logger = new Logger(ErasureScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly erasure: ErasureService,
  ) {}

  /** 03:40 UTC daily — after the 03:15 backup, so the night's dump still
   * contains the pre-erasure state for the 14 days it is retained. */
  @Cron('40 3 * * *')
  async runDueErasures(): Promise<void> {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - ERASURE_RETENTION_DAYS);

    const due = await this.prisma.privacyRequest.findMany({
      where: {
        type: PrivacyRequestType.DELETION,
        status: PrivacyRequestStatus.PENDING,
        createdAt: { lte: cutoff },
      },
      select: { id: true, userId: true },
    });
    if (due.length === 0) return;

    this.logger.log(`${due.length} erasure request(s) past the window`);

    // One transaction each, deliberately: a single failure must not roll back
    // erasures that already succeeded, and each is independently auditable.
    for (const request of due) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await this.erasure.eraseUser(tx, request.userId, request.id);
          await tx.privacyRequest.update({
            where: { id: request.id },
            data: {
              status: PrivacyRequestStatus.FULFILLED,
              fulfilledAt: new Date(),
              fulfillmentNote: `Erased automatically after the ${ERASURE_RETENTION_DAYS}-day retention window.`,
            },
          });
        });
      } catch (err) {
        // Logged and skipped rather than thrown: one bad row must not stop
        // the rest, and the request stays PENDING so tomorrow retries it.
        this.logger.error(
          `Erasure failed for request ${request.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }
}
