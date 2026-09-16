import { BadRequestException, Injectable } from '@nestjs/common';
import { WaitlistAudience } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { MailerService } from '../mail/mailer.service';
import { SendWaitlistBroadcastDto } from './dto/waitlist-admin.dto';

const SIGNUP_SELECT = {
  id: true,
  email: true,
  firstName: true,
  audience: true,
  country: true,
  city: true,
  level: true,
  source: true,
  createdAt: true,
  lastEmailedAt: true,
} satisfies Prisma.WaitlistSignupSelect;

const BROADCAST_INCLUDE = {
  sentBy: { select: { id: true, email: true, name: true } },
} satisfies Prisma.WaitlistBroadcastInclude;

/** Matches the console's list cap convention (support tickets take 250 too). */
const LIST_TAKE = 250;

@Injectable()
export class WaitlistAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mailer: MailerService,
  ) {}

  /**
   * The page's single read: the current list slice plus the counters it
   * opens with. Counts are computed over the same filter as the list, except
   * the audience split, which is always whole-list so the stat band stays a
   * stable overview regardless of what the table is filtered to.
   */
  async overview(query: { audience?: string; search?: string }) {
    const audience = this.enumValue(WaitlistAudience, query.audience);
    const search = query.search?.trim();

    const where: Prisma.WaitlistSignupWhereInput = {
      ...(audience ? { audience } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { city: { contains: search, mode: 'insensitive' } },
              { country: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const since = (days: number) => {
      const from = new Date();
      from.setDate(from.getDate() - days);
      return from;
    };

    const [
      signups,
      filtered,
      players,
      clubs,
      last7Days,
      notEmailedYet,
      latest,
    ] = await Promise.all([
      this.prisma.waitlistSignup.findMany({
        where,
        select: SIGNUP_SELECT,
        orderBy: { createdAt: 'desc' },
        take: LIST_TAKE,
      }),
      this.prisma.waitlistSignup.count({ where }),
      this.prisma.waitlistSignup.count({ where: { audience: 'PLAYER' } }),
      this.prisma.waitlistSignup.count({ where: { audience: 'CLUB' } }),
      this.prisma.waitlistSignup.count({
        where: { createdAt: { gte: since(7) } },
      }),
      this.prisma.waitlistSignup.count({
        where: { lastEmailedAt: null },
      }),
      this.prisma.waitlistSignup.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      signups,
      stats: {
        filtered,
        total: players + clubs,
        players,
        clubs,
        last7Days,
        notEmailedYet,
        latestSignupAt: latest?.createdAt ?? null,
      },
    };
  }

  /**
   * The whole list as CSV — the format the mail provider's own import and
   * any spreadsheet expect. Every text field is quoted and doubled, so a
   * city like `Nairobi, Kenya` cannot split a row.
   */
  async exportCsv(): Promise<string> {
    const signups = await this.prisma.waitlistSignup.findMany({
      select: SIGNUP_SELECT,
      orderBy: { createdAt: 'asc' },
    });

    const header = [
      'firstName',
      'email',
      'audience',
      'country',
      'city',
      'level',
      'source',
      'joinedAt',
      'lastEmailedAt',
    ];

    const rows = signups.map((signup) =>
      [
        signup.firstName,
        signup.email,
        signup.audience,
        signup.country,
        signup.city,
        signup.level,
        signup.source,
        signup.createdAt.toISOString(),
        signup.lastEmailedAt?.toISOString() ?? '',
      ]
        .map((field) => `"${(field ?? '').toString().replaceAll('"', '""')}"`)
        .join(','),
    );

    return [header.join(','), ...rows].join('\r\n');
  }

  async listBroadcasts() {
    return this.prisma.waitlistBroadcast.findMany({
      include: BROADCAST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: LIST_TAKE,
    });
  }

  /**
   * Send one email to every address in scope, then record what actually
   * happened. Recipients are resolved from the same filter the page shows;
   * `lastEmailedAt` is stamped only on addresses the transport confirmed.
   *
   * Refuses outright when SMTP is unconfigured: recording a broadcast that
   * delivered nothing would poison the history, and the alternative (a
   * "dry run" row) is a lie nobody asked for.
   */
  async broadcast(actorId: string, dto: SendWaitlistBroadcastDto) {
    if (!this.mailer.enabled) {
      throw new BadRequestException(
        'SMTP is not configured on this server, so the launch email cannot be sent. Set SMTP_HOST and try again.',
      );
    }

    const recipients = await this.prisma.waitlistSignup.findMany({
      where: dto.audience ? { audience: dto.audience } : {},
      select: { email: true, firstName: true },
      orderBy: { createdAt: 'asc' },
    });

    if (recipients.length === 0) {
      throw new BadRequestException(
        'No waitlist signups match this audience, so there is nobody to email.',
      );
    }

    const deliveredEmails: string[] = [];
    for (const recipient of recipients) {
      const sent = await this.mailer.sendWaitlistBroadcast(
        recipient.email,
        recipient.firstName,
        dto.subject,
        dto.body,
      );
      if (sent) deliveredEmails.push(recipient.email);
    }

    if (deliveredEmails.length > 0) {
      await this.prisma.waitlistSignup.updateMany({
        where: { email: { in: deliveredEmails } },
        data: { lastEmailedAt: new Date() },
      });
    }

    const record = await this.prisma.waitlistBroadcast.create({
      data: {
        subject: dto.subject,
        body: dto.body,
        audience: dto.audience ?? null,
        recipientCount: recipients.length,
        deliveredCount: deliveredEmails.length,
        failedCount: recipients.length - deliveredEmails.length,
        sentById: actorId,
      },
      include: BROADCAST_INCLUDE,
    });

    await this.audit.record(
      actorId,
      'waitlist.broadcast',
      'WaitlistBroadcast',
      record.id,
      {
        subject: dto.subject,
        audience: dto.audience ?? 'ALL',
        recipientCount: recipients.length,
        deliveredCount: deliveredEmails.length,
        failedCount: recipients.length - deliveredEmails.length,
      },
    );

    return {
      id: record.id,
      audience: record.audience,
      recipientCount: record.recipientCount,
      deliveredCount: record.deliveredCount,
      failedCount: record.failedCount,
    };
  }

  private enumValue<T extends Record<string, string>>(
    values: T,
    value?: string,
  ) {
    if (!value) return undefined;
    const normalized = value.toUpperCase();
    return Object.values(values).includes(normalized)
      ? (normalized as T[keyof T])
      : undefined;
  }
}
