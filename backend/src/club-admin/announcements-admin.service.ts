import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AnnouncementStatus,
  ClubMembershipStatus,
  ClubRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './dto/announcement.dto';

// Roles allowed to see unpublished drafts. Everyone else — including the
// ordinary members this endpoint is also the mobile read path for — sees
// PUBLISHED only.
const AUTHORING_ROLES: ClubRole[] = [
  ClubRole.OWNER,
  ClubRole.ADMIN,
  ClubRole.CONTENT_MANAGER,
];

@Injectable()
export class AnnouncementsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(clubId: string, viewerRole?: ClubRole) {
    const canSeeDrafts = !!viewerRole && AUTHORING_ROLES.includes(viewerRole);
    const announcements = await this.prisma.announcement.findMany({
      where: {
        clubId,
        ...(canSeeDrafts ? {} : { status: AnnouncementStatus.PUBLISHED }),
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
    return { announcements };
  }

  async create(clubId: string, authorId: string, dto: CreateAnnouncementDto) {
    const status = dto.status ?? AnnouncementStatus.DRAFT;
    const announcement = await this.prisma.announcement.create({
      data: {
        clubId,
        authorId,
        title: dto.title,
        body: dto.body,
        pinned: dto.pinned ?? false,
        status,
        publishedAt:
          status === AnnouncementStatus.PUBLISHED ? new Date() : null,
      },
    });

    if (status === AnnouncementStatus.PUBLISHED) {
      await this.notifyMembers(clubId, authorId, announcement.id, dto.title);
    }
    return announcement;
  }

  async update(clubId: string, id: string, dto: UpdateAnnouncementDto) {
    const existing = await this.requireAnnouncement(clubId, id);
    const nowPublishing =
      dto.status === AnnouncementStatus.PUBLISHED &&
      existing.status !== AnnouncementStatus.PUBLISHED;

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title,
        body: dto.body,
        pinned: dto.pinned,
        status: dto.status,
        publishedAt: nowPublishing ? new Date() : undefined,
      },
    });

    // Only on the draft -> published edge, never on an edit to something
    // already live, or members get re-pinged for a typo fix.
    if (nowPublishing) {
      await this.notifyMembers(
        clubId,
        updated.authorId,
        updated.id,
        updated.title,
      );
    }
    return updated;
  }

  /**
   * Every ACTIVE member except the author. PENDING requests deliberately get
   * nothing — they haven't been let in yet.
   */
  /**
   * Entity ref is the *club*, not the announcement — the mobile
   * Announcements screen is club-scoped (`/discover/clubs/:id/announcements`),
   * so a deep link carrying an announcement id would have nothing to resolve
   * it against. The new item sorts to the top of that list anyway.
   */
  private async notifyMembers(
    clubId: string,
    authorId: string,
    _announcementId: string,
    title: string,
  ) {
    const [club, members] = await Promise.all([
      this.prisma.club.findUnique({
        where: { id: clubId },
        select: { name: true },
      }),
      this.prisma.clubMembership.findMany({
        where: {
          clubId,
          status: ClubMembershipStatus.ACTIVE,
          userId: { not: authorId },
        },
        select: { userId: true },
      }),
    ]);

    await Promise.all(
      members.map((m) =>
        this.notifications.create(
          m.userId,
          'CLUBS',
          title,
          `New announcement from ${club?.name ?? 'your club'}.`,
          'CLUB_ANNOUNCEMENT',
          clubId,
        ),
      ),
    );
  }

  private async requireAnnouncement(clubId: string, id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });
    if (!announcement || announcement.clubId !== clubId) {
      throw new NotFoundException('Announcement not found.');
    }
    return announcement;
  }
}
