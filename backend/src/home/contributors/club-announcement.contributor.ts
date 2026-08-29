import { Injectable } from '@nestjs/common';
import { AnnouncementStatus, ClubMembershipStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { HOME_CARD_PRIORITY, type HomeCard } from '../home-card';
import type { HomeCardContributor, HomeContext } from './home-contributor';

const MAX_AGE_DAYS = 30;

/**
 * The most recent announcement from a club this user actually belongs to.
 *
 * Announcements have had a backend and a Club Admin authoring screen since
 * M14 but **no mobile reader at all** — clubs could publish into a void. This
 * is the first surface that shows them to a member, which is why it earns a
 * Home slot despite being a Tier 2 card.
 *
 * Scoped to `ACTIVE` memberships: an `INVITED` user hasn't accepted yet and a
 * `SUSPENDED` one shouldn't be receiving club comms.
 */
@Injectable()
export class ClubAnnouncementContributor implements HomeCardContributor {
  readonly key = 'club-announcement';

  constructor(private readonly prisma: PrismaService) {}

  async contribute(ctx: HomeContext): Promise<HomeCard[]> {
    const memberships = await this.prisma.clubMembership.findMany({
      where: { userId: ctx.userId, status: ClubMembershipStatus.ACTIVE },
      select: { clubId: true },
    });
    if (memberships.length === 0) return [];

    const cutoff = new Date(
      ctx.now.getTime() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
    );

    const announcement = await this.prisma.announcement.findFirst({
      where: {
        clubId: { in: memberships.map((m) => m.clubId) },
        status: AnnouncementStatus.PUBLISHED,
        publishedAt: { gte: cutoff },
      },
      // Pinned first — that's what pinning is for — then most recent.
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        body: true,
        clubId: true,
        club: { select: { name: true } },
      },
    });
    if (!announcement) return [];

    return [
      {
        id: `club-announcement:${announcement.id}`,
        type: 'CLUB_ANNOUNCEMENT',
        priority: HOME_CARD_PRIORITY.CLUB_ANNOUNCEMENT,
        title: announcement.title,
        body: announcement.body,
        accent: 'info',
        action: {
          label: `Open ${announcement.club.name}`,
          route: `/discover/clubs/${announcement.clubId}/announcements`,
        },
        dismissible: true,
        data: {
          kind: 'announcement',
          clubId: announcement.clubId,
          clubName: announcement.club.name,
          postId: announcement.id,
        },
      },
    ];
  }
}
