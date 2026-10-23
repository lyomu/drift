import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountStatus,
  ClubMembershipStatus,
  OnboardingStep,
  PushBroadcastAudience,
  PushBroadcastStatus,
} from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from './audit.service';
import { SendPushBroadcastDto } from './dto/push-broadcast-admin.dto';

const LIST_TAKE = 250;
const imageSelect = {
  id: true,
  filename: true,
} satisfies Prisma.PushBroadcastImageAssetSelect;
const include = {
  sentBy: { select: { id: true, email: true, name: true } },
  image: { select: imageSelect },
} satisfies Prisma.PushBroadcastInclude;

function recipientsWhere(
  country?: string,
  audience: PushBroadcastAudience[] = [],
): Prisma.UserWhereInput {
  const segments: Prisma.UserWhereInput[] = [];
  if (audience.includes(PushBroadcastAudience.PLAYER))
    segments.push({ tennisProfile: { isNot: null } });
  if (audience.includes(PushBroadcastAudience.COACH))
    segments.push({ coachProfile: { isNot: null } });
  if (audience.includes(PushBroadcastAudience.CLUB_STAFF))
    segments.push({
      clubMemberships: { some: { status: ClubMembershipStatus.ACTIVE } },
    });
  return {
    isDemo: false,
    accountStatus: AccountStatus.ACTIVE,
    onboardingStep: OnboardingStep.COMPLETE,
    ...(country ? { tennisProfile: { is: { country } } } : {}),
    ...(segments.length ? { OR: segments } : {}),
  };
}

@Injectable()
export class PushBroadcastAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  private imageUrl(id: string) {
    const base = (this.config.get<string>('PUBLIC_API_URL') ?? '').replace(
      /\/$/,
      '',
    );
    return `${base}/media/push-broadcast-images/${id}`;
  }

  private dto(
    row: Prisma.PushBroadcastGetPayload<{ include: typeof include }>,
  ) {
    return { ...row, imageUrl: row.image ? this.imageUrl(row.image.id) : null };
  }

  async overview() {
    const [broadcasts, markets] = await Promise.all([
      this.prisma.pushBroadcast.findMany({
        include,
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
    return {
      broadcasts: broadcasts.map((row) => this.dto(row)),
      countries: markets,
    };
  }

  async count(country?: string, audience: PushBroadcastAudience[] = []) {
    return {
      recipientCount: await this.prisma.user.count({
        where: recipientsWhere(country?.toUpperCase(), audience),
      }),
    };
  }

  async broadcast(
    actorId: string,
    dto: SendPushBroadcastDto,
    image?: Express.Multer.File,
  ) {
    if (
      image &&
      (!['image/jpeg', 'image/png'].includes(image.mimetype) ||
        image.size > 5 * 1024 * 1024)
    )
      throw new BadRequestException('Use a PNG or JPG poster under 5MB.');
    const country = dto.country?.toUpperCase() || undefined;
    const audience = [...new Set(dto.audience ?? [])];
    const scheduledFor = dto.scheduledFor ? new Date(dto.scheduledFor) : null;
    if (
      scheduledFor &&
      (Number.isNaN(scheduledFor.valueOf()) || scheduledFor <= new Date())
    )
      throw new BadRequestException('Choose a future send time.');
    const recipientCount = await this.prisma.user.count({
      where: recipientsWhere(country, audience),
    });
    if (!recipientCount)
      throw new BadRequestException(
        'No users match this audience, so there is nobody to notify.',
      );
    const record = await this.prisma.pushBroadcast.create({
      data: {
        title: dto.title,
        body: dto.body,
        country: country ?? null,
        audience,
        recipientCount,
        deliveredCount: 0,
        skippedCount: 0,
        sentById: actorId,
        status: scheduledFor
          ? PushBroadcastStatus.SCHEDULED
          : PushBroadcastStatus.SENDING,
        scheduledFor,
        ...(image
          ? {
              image: {
                create: {
                  filename: image.originalname,
                  mimeType: image.mimetype,
                  bytes: new Uint8Array(image.buffer),
                },
              },
            }
          : {}),
      },
      include,
    });
    await this.audit.record(
      actorId,
      scheduledFor ? 'push.broadcast.schedule' : 'push.broadcast',
      'PushBroadcast',
      record.id,
      { country: country ?? 'ALL', audience, scheduledFor, recipientCount },
    );
    if (scheduledFor) return this.dto(record);
    return this.deliver(record.id);
  }

  async deliver(id: string) {
    const broadcast = await this.prisma.pushBroadcast.findUnique({
      where: { id },
      include,
    });
    if (!broadcast) throw new NotFoundException('Push broadcast not found.');
    const recipients = await this.prisma.user.findMany({
      where: recipientsWhere(
        broadcast.country ?? undefined,
        broadcast.audience,
      ),
      select: { id: true },
    });
    let deliveredCount = 0;
    const imageUrl = broadcast.image
      ? this.imageUrl(broadcast.image.id)
      : undefined;
    try {
      for (const recipient of recipients)
        if (
          await this.notifications.create(
            recipient.id,
            'ANNOUNCEMENTS',
            broadcast.title,
            broadcast.body,
            undefined,
            undefined,
            imageUrl,
          )
        )
          deliveredCount++;
      const sent = await this.prisma.pushBroadcast.update({
        where: { id },
        data: {
          status: PushBroadcastStatus.SENT,
          sentAt: new Date(),
          recipientCount: recipients.length,
          deliveredCount,
          skippedCount: recipients.length - deliveredCount,
        },
        include,
      });
      return this.dto(sent);
    } catch (error) {
      await this.prisma.pushBroadcast.update({
        where: { id },
        data: {
          status: PushBroadcastStatus.FAILED,
          failureReason:
            error instanceof Error ? error.message : 'Delivery failed.',
        },
      });
      throw error;
    }
  }

  async claimDue(limit = 50) {
    const due = await this.prisma.pushBroadcast.findMany({
      where: {
        status: PushBroadcastStatus.SCHEDULED,
        scheduledFor: { lte: new Date() },
      },
      select: { id: true },
      take: limit,
      orderBy: { scheduledFor: 'asc' },
    });
    const claimed: string[] = [];
    for (const row of due) {
      const update = await this.prisma.pushBroadcast.updateMany({
        where: { id: row.id, status: PushBroadcastStatus.SCHEDULED },
        data: { status: PushBroadcastStatus.SENDING },
      });
      if (update.count) claimed.push(row.id);
    }
    return claimed;
  }

  async cancel(actorId: string, id: string) {
    const result = await this.prisma.pushBroadcast.updateMany({
      where: { id, status: PushBroadcastStatus.SCHEDULED },
      data: { status: PushBroadcastStatus.CANCELLED },
    });
    if (!result.count)
      throw new BadRequestException(
        'Only a scheduled broadcast can be cancelled.',
      );
    await this.audit.record(
      actorId,
      'push.broadcast.cancel',
      'PushBroadcast',
      id,
    );
    return { cancelled: true };
  }

  async imageContent(id: string) {
    const image = await this.prisma.pushBroadcastImageAsset.findUnique({
      where: { id },
      select: { bytes: true, mimeType: true, filename: true },
    });
    if (!image) throw new NotFoundException('Poster not found.');
    return image;
  }
}
