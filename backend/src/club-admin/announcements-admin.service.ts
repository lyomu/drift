import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AnnouncementAudience,
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

const ADMIN_AUDIENCE_ROLES: ClubRole[] = [
  ClubRole.OWNER,
  ClubRole.ADMIN,
  ClubRole.COMPETITION_MANAGER,
  ClubRole.CONTENT_MANAGER,
];

/** The club roles a given announcement audience is delivered to. */
function rolesForAudience(audience: AnnouncementAudience): ClubRole[] | null {
  switch (audience) {
    case AnnouncementAudience.COACHES:
      return [ClubRole.COACH];
    case AnnouncementAudience.ADMINS:
      return ADMIN_AUDIENCE_ROLES;
    case AnnouncementAudience.MEMBERS:
      return [ClubRole.READ_ONLY];
    case AnnouncementAudience.EVERYONE:
    default:
      return null; // no role restriction
  }
}

/** Would a member with this role receive/see an announcement to this audience? */
function audienceIncludesRole(
  audience: AnnouncementAudience,
  role: ClubRole,
): boolean {
  const roles = rolesForAudience(audience);
  return roles === null || roles.includes(role);
}

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
    // Authoring roles manage every announcement regardless of audience;
    // ordinary members only see the ones aimed at them.
    const role = viewerRole;
    const visible =
      canSeeDrafts || role === undefined
        ? announcements
        : announcements.filter((a) => audienceIncludesRole(a.audience, role));
    return { announcements: visible };
  }

  async create(clubId: string, authorId: string, dto: CreateAnnouncementDto) {
    const status = dto.status ?? AnnouncementStatus.DRAFT;
    const audience = dto.audience ?? AnnouncementAudience.EVERYONE;
    const announcement = await this.prisma.announcement.create({
      data: {
        clubId,
        authorId,
        title: dto.title,
        body: dto.body,
        pinned: dto.pinned ?? false,
        status,
        audience,
        publishedAt:
          status === AnnouncementStatus.PUBLISHED ? new Date() : null,
      },
    });

    if (status === AnnouncementStatus.PUBLISHED) {
      await this.notifyMembers(clubId, authorId, dto.title, audience);
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
        audience: dto.audience,
        publishedAt: nowPublishing ? new Date() : undefined,
      },
    });

    // Only on the draft -> published edge, never on an edit to something
    // already live, or members get re-pinged for a typo fix.
    if (nowPublishing) {
      await this.notifyMembers(
        clubId,
        updated.authorId,
        updated.title,
        updated.audience,
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
    title: string,
    audience: AnnouncementAudience,
  ) {
    const audienceRoles = rolesForAudience(audience);
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
          ...(audienceRoles ? { role: { in: audienceRoles } } : {}),
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
