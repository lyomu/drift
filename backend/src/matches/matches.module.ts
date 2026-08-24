import { Module } from '@nestjs/common';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { StatsController } from './stats.controller';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [MessagingModule, NotificationsModule],
  controllers: [MatchesController, ResultsController, StatsController],
  providers: [MatchesService, ResultsService],
  // CompetitionsModule (Phase M8) is a second consumer of MatchesService,
  // same shape as ResultsService being one inside this module. Phase M14's
  // club-admin module is a second consumer of ResultsService too, for
  // `adminResolveDispute`.
  exports: [MatchesService, ResultsService],
})
export class MatchesModule {}
