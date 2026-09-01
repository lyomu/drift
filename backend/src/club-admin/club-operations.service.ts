import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClubEventRegistrationStatus,
  ClubPostModerationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Range = { from?: Date; to?: Date };

@Injectable()
export class ClubOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMedia(clubId: string) {
    const assets = await this.prisma.clubMediaAsset.findMany({
      where: { clubId },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        caption: true,
        createdAt: true,
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { assets };
  }

  async uploadMedia(
    clubId: string,
    actorId: string,
    file: Express.Multer.File,
    caption?: string,
  ) {
    if (!file.mimetype.startsWith('image/'))
      throw new BadRequestException('Only image uploads are supported.');
    const bytes = new Uint8Array(file.buffer);
    const asset = await this.prisma.clubMediaAsset.create({
      data: {
        clubId,
        uploadedById: actorId,
        filename: file.originalname,
        mimeType: file.mimetype,
        bytes,
        caption,
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        caption: true,
        createdAt: true,
      },
    });
    await this.audit(
      clubId,
      actorId,
      'media.upload',
      'ClubMediaAsset',
      asset.id,
      { filename: asset.filename },
    );
    return { asset };
  }

  async mediaContent(clubId: string, id: string) {
    const asset = await this.prisma.clubMediaAsset.findFirst({
      where: { id, clubId },
      select: { bytes: true, mimeType: true, filename: true },
    });
    if (!asset) throw new NotFoundException('Media asset not found.');
    return asset;
  }

  async deleteMedia(clubId: string, id: string, actorId: string) {
    const deleted = await this.prisma.clubMediaAsset.deleteMany({
      where: { id, clubId },
    });
    if (!deleted.count) throw new NotFoundException('Media asset not found.');
    await this.audit(clubId, actorId, 'media.delete', 'ClubMediaAsset', id);
    return { deleted: true };
  }

  async moderationQueue(clubId: string, status?: ClubPostModerationStatus) {
    const reports = await this.prisma.clubPostModerationReport.findMany({
      where: { clubId, ...(status ? { status } : {}) },
      include: {
        post: {
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: { select: { firstName: true, lastName: true } },
          },
        },
        reporter: { select: { firstName: true, lastName: true } },
        resolvedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { reports };
  }

  async resolveModeration(
    clubId: string,
    id: string,
    actorId: string,
    status: ClubPostModerationStatus,
  ) {
    if (status === ClubPostModerationStatus.PENDING)
      throw new BadRequestException('Choose a resolution.');
    const report = await this.prisma.clubPostModerationReport.findFirst({
      where: { id, clubId },
    });
    if (!report) throw new NotFoundException('Moderation report not found.');
    await this.prisma.$transaction(async (tx) => {
      if (status === ClubPostModerationStatus.REMOVED) {
        await tx.clubPost.update({
          where: { id: report.postId },
          data: { deletedAt: new Date(), deletedById: actorId },
        });
      }
      await tx.clubPostModerationReport.update({
        where: { id },
        data: { status, resolvedById: actorId, resolvedAt: new Date() },
      });
      await tx.clubAuditLog.create({
        data: {
          clubId,
          actorId,
          action: `moderation.${status.toLowerCase()}`,
          entityType: 'ClubPostModerationReport',
          entityId: id,
        },
      });
    });
    return { resolved: true, status };
  }

  async getNotificationSettings(clubId: string) {
    const settings = await this.prisma.clubNotificationSettings.upsert({
      where: { clubId },
      create: { clubId },
      update: {},
    });
    return { settings };
  }

  async updateNotificationSettings(
    clubId: string,
    actorId: string,
    data: {
      membershipChanges?: boolean;
      competitionUpdates?: boolean;
      eventRegistrations?: boolean;
      moderationAlerts?: boolean;
      weeklyDigest?: boolean;
    },
  ) {
    const settings = await this.prisma.clubNotificationSettings.upsert({
      where: { clubId },
      create: { clubId, ...data },
      update: data,
    });
    await this.audit(
      clubId,
      actorId,
      'notification-settings.update',
      'ClubNotificationSettings',
      settings.id,
    );
    return { settings };
  }

  async auditLog(clubId: string, action?: string, actorId?: string) {
    const logs = await this.prisma.clubAuditLog.findMany({
      where: {
        clubId,
        ...(action
          ? { action: { contains: action, mode: 'insensitive' } }
          : {}),
        ...(actorId ? { actorId } : {}),
      },
      include: {
        actor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });
    return { logs };
  }

  async engagement(clubId: string, range: Range) {
    const createdAt = this.range(range);
    const [
      newMembers,
      posts,
      reactions,
      eventRegistrations,
      competitionRegistrations,
    ] = await Promise.all([
      this.prisma.clubMembership.count({ where: { clubId, createdAt } }),
      this.prisma.clubPost.count({
        where: { clubId, createdAt, deletedAt: null },
      }),
      this.prisma.clubPostReaction.count({
        where: { post: { clubId }, createdAt },
      }),
      this.prisma.clubEventRegistration.count({
        where: { event: { clubId }, registeredAt: createdAt },
      }),
      this.prisma.leagueRegistration.count({
        where: { league: { clubId }, registeredAt: createdAt },
      }),
    ]);
    return {
      metrics: {
        newMembers,
        posts,
        reactions,
        eventRegistrations,
        competitionRegistrations,
      },
    };
  }

  async courtInquiries(clubId: string, range: Range) {
    const rows = await this.prisma.court.findMany({
      where: { clubId },
      select: {
        id: true,
        name: true,
        inquiries: {
          where: { createdAt: this.range(range) },
          select: { kind: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return {
      courts: rows.map((court) => ({
        id: court.id,
        name: court.name,
        profileViews: court.inquiries.filter((i) => i.kind === 'PROFILE_VIEW')
          .length,
        contacts: court.inquiries.filter((i) => i.kind === 'CONTACT').length,
        bookings: court.inquiries.filter((i) => i.kind === 'BOOKING').length,
      })),
    };
  }

  async eventReport(clubId: string, range: Range) {
    const events = await this.prisma.clubEvent.findMany({
      where: { clubId, startsAt: this.range(range) },
      include: { registrations: { select: { status: true } } },
      orderBy: { startsAt: 'desc' },
    });
    return {
      events: events.map((event) => ({
        id: event.id,
        name: event.name,
        startsAt: event.startsAt,
        capacity: event.capacity,
        registrations: event.registrations.filter(
          (r) => r.status !== ClubEventRegistrationStatus.CANCELLED,
        ).length,
        attended: event.registrations.filter(
          (r) => r.status === ClubEventRegistrationStatus.ATTENDED,
        ).length,
        noShows: event.registrations.filter(
          (r) => r.status === ClubEventRegistrationStatus.NO_SHOW,
        ).length,
      })),
    };
  }

  async membersCsv(clubId: string) {
    const members = await this.prisma.clubMembership.findMany({
      where: { clubId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const escape = (value: string | Date | null) =>
      `"${(value instanceof Date ? value.toISOString() : (value ?? '')).replaceAll('"', '""')}"`;
    return [
      'First name,Last name,Email,Role,Status,Joined at',
      ...members.map((m) =>
        [
          m.user.firstName,
          m.user.lastName,
          m.user.email,
          m.role,
          m.status,
          m.createdAt.toISOString(),
        ]
          .map(escape)
          .join(','),
      ),
    ].join('\n');
  }

  private range({ from, to }: Range) {
    return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }

  private async audit(
    clubId: string,
    actorId: string,
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: object,
  ) {
    await this.prisma.clubAuditLog.create({
      data: {
        clubId,
        actorId,
        action,
        entityType,
        entityId,
        metadata: metadata,
      },
    });
  }
}
