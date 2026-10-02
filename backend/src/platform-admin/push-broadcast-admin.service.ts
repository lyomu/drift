import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountStatus, OnboardingStep } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from './audit.service';
import { SendPushBroadcastDto } from './dto/push-broadcast-admin.dto';

const BROADCAST_INCLUDE = {
  sentBy: { select: { id: true, email: true, name: true } },
} satisfies Prisma.PushBroadcastInclude;

/** Matches the waitlist broadcast history's list cap. */
const LIST_TAKE = 250;

function recipientsWhere(country?: string): Prisma.UserWhereInput {
  return {
    // A broadcast must never reach the seeded demo persona — same rule
    // every other discovery surface follows (common/demo-scope.ts).
    isDemo: false,
    accountStatus: AccountStatus.ACTIVE,
    onboardingStep: OnboardingStep.COMPLETE,
    ...(country ? { tennisProfile: { is: { country } } } : {}),
  };
}

/**
 * Platform-wide push notifications, sent from platform admin to real app
 * accounts. Distinct from WaitlistAdminService.broadcast, which emails
 * pre-signup leads over SMTP — this reaches signed-up users through
 * NotificationsService/PushService, so it both writes an in-app
 * notification row and fires FCM, and it respects each recipient's own
 * ANNOUNCEMENTS preference rather than ignoring it.
 *
 * Sends sequentially, one NotificationsService.create call per recipient —
 * the same simple, non-queued pattern WaitlistAdminService.broadcast uses
 * for email. Fine at current user counts; worth revisiting (e.g. a BullMQ
 * job, which this codebase already uses for video analysis) if the active
 * user count grows enough that an in-request loop risks a timeout.
 */
@Injectable()
export class PushBroadcastAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /** The page's single read: send history plus the countries to offer in
   * the filter — sourced from active supported markets, not a scan over
   * every user's own country, since that's the canonical "where Drift
   * actually operates" list. */
  async overview() {
    const [broadcasts, markets] = await Promise.all([
      this.prisma.pushBroadcast.findMany({
        include: BROADCAST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: LIST_TAKE,
      }),
      this.prisma.supportedMarket.findMany({
        where: { status: 'ACTIVE' },
        select: { countryCode: true, countryName: true },
        distinct: ['countryCode'],
        orderBy: { countryName: 'asc' },
      }),
    ]);
    return { broadcasts, countries: markets };
  }

  /** Live recipient count for the compose form, resolved from the exact
   * same filter `broadcast()` sends to. */
  async count(country?: string) {
    const recipientCount = await this.prisma.user.count({
      where: recipientsWhere(country),
    });
    return { recipientCount };
  }

  async broadcast(actorId: string, dto: SendPushBroadcastDto) {
    const country = dto.country?.toUpperCase() || undefined;
    const recipients = await this.prisma.user.findMany({
      where: recipientsWhere(country),
      select: { id: true },
    });

    if (recipients.length === 0) {
      throw new BadRequestException(
        'No users match this audience, so there is nobody to notify.',
      );
    }

    let deliveredCount = 0;
    for (const recipient of recipients) {
      const delivered = await this.notifications.create(
        recipient.id,
        'ANNOUNCEMENTS',
        dto.title,
        dto.body,
      );
      if (delivered) deliveredCount += 1;
    }
    const skippedCount = recipients.length - deliveredCount;

    const record = await this.prisma.pushBroadcast.create({
      data: {
        title: dto.title,
        body: dto.body,
        country: country ?? null,
        recipientCount: recipients.length,
        deliveredCount,
        skippedCount,
        sentById: actorId,
      },
      include: BROADCAST_INCLUDE,
    });

    await this.audit.record(
      actorId,
      'push.broadcast',
      'PushBroadcast',
      record.id,
      {
        title: dto.title,
        country: country ?? 'ALL',
        recipientCount: recipients.length,
        deliveredCount,
        skippedCount,
      },
    );

    return record;
  }
}
