import { Injectable } from '@nestjs/common';
import { MatchState } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { matchInclude, toMatchDto } from '../../matches/match.mapper';
import { displayName } from '../../common/display-name.util';
import { HOME_CARD_PRIORITY, type HomeCard } from '../home-card';
import type { HomeCardContributor, HomeContext } from './home-contributor';

/**
 * The next agreed match. Not urgent in the "someone is blocked on you" sense
 * the three cards above it are — it's the single most *useful* thing to see
 * on opening the app, which is why it sits directly beneath them.
 *
 * Scoped to matches with a confirmed time still in the future: a `SCHEDULED`
 * match whose time has passed belongs to the result flow (Enter Score), not
 * here, and surfacing it as "upcoming" would be actively wrong.
 */
@Injectable()
export class UpcomingMatchContributor implements HomeCardContributor {
  readonly key = 'upcoming-match';

  constructor(private readonly prisma: PrismaService) {}

  async contribute(ctx: HomeContext): Promise<HomeCard[]> {
    const match = await this.prisma.match.findFirst({
      where: {
        participants: { some: { userId: ctx.userId } },
        state: { in: [MatchState.SCHEDULED, MatchState.RESCHEDULED] },
        confirmedTime: { gt: ctx.now },
      },
      include: matchInclude,
      orderBy: { confirmedTime: 'asc' },
    });

    if (!match) return [];

    const dto = toMatchDto(match, ctx.userId);
    const opponent = match.participants.find((p) => p.userId !== ctx.userId);
    const opponentName = opponent
      ? displayName(opponent.user)
      : 'your opponent';

    const venue = dto.court?.name ?? match.courtName;

    return [
      {
        id: `upcoming-match:${match.id}`,
        type: 'UPCOMING_MATCH',
        priority: HOME_CARD_PRIORITY.UPCOMING_MATCH,
        title: `Next up: ${opponentName}`,
        // The client formats `confirmedTime` in the device's locale and
        // timezone — sending a preformatted date here would render in the
        // server's zone and be wrong for anyone travelling.
        body: venue ? `At ${venue}.` : 'No court agreed yet.',
        accent: 'info',
        action: { label: 'View match', route: `/matches/${match.id}` },
        dismissible: false,
        data: { kind: 'match', match: dto },
      },
    ];
  }
}
