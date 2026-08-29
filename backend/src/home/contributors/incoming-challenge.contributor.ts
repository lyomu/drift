import { Injectable } from '@nestjs/common';
import { MatchState, ParticipantStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { matchInclude, toMatchDto } from '../../matches/match.mapper';
import { displayName } from '../../common/display-name.util';
import { HOME_CARD_PRIORITY, type HomeCard } from '../home-card';
import type { HomeCardContributor, HomeContext } from './home-contributor';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * A challenge waiting on this user's answer. Genuinely time-bounded — M6 set
 * `CHALLENGE_TTL_MS` to 7 days and derives expiry on read, so the card shows
 * the remaining window rather than an open-ended "someone challenged you".
 *
 * Expired challenges are filtered out here rather than in SQL: `expiresAt` is
 * nullable on older rows, and `effectiveState()` is the one place that knows
 * how expiry is derived. Re-implementing that rule in a `where` clause would
 * be a second source of truth — exactly what `match-state.ts` exists to
 * prevent.
 */
@Injectable()
export class IncomingChallengeContributor implements HomeCardContributor {
  readonly key = 'incoming-challenge';

  constructor(private readonly prisma: PrismaService) {}

  async contribute(ctx: HomeContext): Promise<HomeCard[]> {
    const matches = await this.prisma.match.findMany({
      where: {
        state: MatchState.PROPOSED,
        participants: {
          some: { userId: ctx.userId, status: ParticipantStatus.INVITED },
        },
      },
      include: matchInclude,
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    return matches.flatMap((match) => {
      const dto = toMatchDto(match, ctx.userId);
      // Derived expiry — a lapsed challenge reads as EXPIRED even though the
      // stored row still says PROPOSED.
      if (dto.state !== MatchState.PROPOSED) return [];

      const challenger = match.participants.find(
        (p) => p.userId === match.createdById,
      );
      const challengerName = challenger
        ? displayName(challenger.user)
        : 'A player';

      return [
        {
          id: `incoming-challenge:${match.id}`,
          type: 'INCOMING_CHALLENGE' as const,
          priority: HOME_CARD_PRIORITY.INCOMING_CHALLENGE,
          title: `${challengerName} challenged you`,
          body: this.body(match.format, dto.expiresAt, ctx.now),
          accent: 'urgent' as const,
          action: { label: 'View challenge', route: `/matches/${match.id}` },
          dismissible: false,
          data: { kind: 'match' as const, match: dto },
        },
      ];
    });
  }

  private body(format: string, expiresAt: Date | null, now: Date): string {
    const base = `A ${format.toLowerCase()} match.`;
    if (!expiresAt) return `${base} Accept or decline to let them know.`;

    const daysLeft = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / MS_PER_DAY,
    );
    if (daysLeft <= 0) return `${base} It expires today.`;
    if (daysLeft === 1) return `${base} Expires tomorrow.`;
    return `${base} Expires in ${daysLeft} days.`;
  }
}
