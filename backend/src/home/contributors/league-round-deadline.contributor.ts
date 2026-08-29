import { Injectable } from '@nestjs/common';
import { MatchState } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { effectiveState, HISTORY_STATES } from '../../matches/match-state';
import { HOME_CARD_PRIORITY, type HomeCard } from '../home-card';
import type { HomeCardContributor, HomeContext } from './home-contributor';

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * An open league fixture whose round deadline is closing in.
 *
 * This is the most consequential deadline in the app: M8's progression engine
 * forces any still-unplayed fixture to a neutral `WALKOVER` the moment its
 * round deadline passes. A player who simply never opened the app loses the
 * fixture. That makes this a genuine `urgent` card and, like the result and
 * challenge cards, not dismissible.
 */
@Injectable()
export class LeagueRoundDeadlineContributor implements HomeCardContributor {
  readonly key = 'league-round-deadline';

  constructor(private readonly prisma: PrismaService) {}

  async contribute(ctx: HomeContext): Promise<HomeCard[]> {
    const fixtures = await this.prisma.fixture.findMany({
      where: {
        OR: [{ sideAUserId: ctx.userId }, { sideBUserId: ctx.userId }],
        // Only rounds that are actually in play: opened, not yet closed.
        round: {
          openedAt: { not: null },
          closedAt: null,
          deadline: { gt: ctx.now },
        },
      },
      include: {
        match: {
          select: { state: true, expiresAt: true, confirmedTime: true },
        },
        round: {
          include: { season: { include: { league: true } } },
        },
      },
      orderBy: { round: { deadline: 'asc' } },
      take: 3,
    });

    return fixtures.flatMap((fixture) => {
      // A bye has no opponent and nothing to play — never a deadline risk.
      if (!fixture.sideBUserId || !fixture.match) return [];

      const state = effectiveState(fixture.match);
      // Already settled: nothing at risk.
      if (HISTORY_STATES.includes(state) || state === MatchState.DISPUTED) {
        return [];
      }

      const { round } = fixture;
      const { season } = round;
      const hoursLeft = Math.ceil(
        (round.deadline.getTime() - ctx.now.getTime()) / MS_PER_HOUR,
      );

      return [
        {
          id: `league-round-deadline:${fixture.id}`,
          type: 'LEAGUE_ROUND_DEADLINE' as const,
          priority: HOME_CARD_PRIORITY.LEAGUE_ROUND_DEADLINE,
          title: `Round ${round.index} closes ${this.relative(hoursLeft)}`,
          body: this.body(
            season.league.name,
            state === MatchState.SCHEDULED && fixture.match.confirmedTime
              ? 'scheduled'
              : 'unscheduled',
          ),
          accent: 'urgent' as const,
          action: {
            label: 'Open fixture',
            route: `/compete/seasons/${season.id}/rounds/${round.id}`,
          },
          dismissible: false,
          data: null,
        },
      ];
    });
  }

  private relative(hoursLeft: number): string {
    if (hoursLeft <= 1) return 'within the hour';
    if (hoursLeft < 24) return `in ${hoursLeft} hours`;
    const days = Math.ceil(hoursLeft / 24);
    return days === 1 ? 'tomorrow' : `in ${days} days`;
  }

  private body(leagueName: string, stage: 'scheduled' | 'unscheduled'): string {
    return stage === 'scheduled'
      ? `Play your ${leagueName} fixture and record the score before the deadline, or it's recorded as a walkover.`
      : `You haven't agreed a time for your ${leagueName} fixture yet. Unplayed fixtures are recorded as a walkover.`;
  }
}
