import { Global, Module } from '@nestjs/common';
import { CompetitionsModule } from './competitions/competitions.module';
import { TournamentsService } from './competitions/tournaments.service';
import { LaddersService } from './competitions/ladders.service';

/**
 * Breaks the matches ← competitions dependency cycle: ResultsService needs
 * the Wave 6 settlement hook, but CompetitionsModule already imports
 * MatchesModule. A global provider token lets ResultsService inject the
 * hook without a static import.
 */
export const COMPETITIONS_SETTLEMENT = 'COMPETITIONS_SETTLEMENT';

@Global()
@Module({
  imports: [CompetitionsModule],
  providers: [
    {
      provide: COMPETITIONS_SETTLEMENT,
      useFactory: (
        tournaments: TournamentsService,
        ladders: LaddersService,
      ) => ({
        onMatchSettled: (matchId: string, winnerUserId: string | null) =>
          Promise.all([
            tournaments.onMatchSettled(matchId, winnerUserId),
            ladders.onMatchSettled(matchId, winnerUserId),
          ]).then(() => undefined),
      }),
      inject: [TournamentsService, LaddersService],
    },
  ],
  exports: [COMPETITIONS_SETTLEMENT],
})
export class CompetitionHooksModule {}
