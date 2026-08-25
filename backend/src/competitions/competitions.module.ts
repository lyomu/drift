import { Module } from '@nestjs/common';
import { CompetitionsController } from './competitions.controller';
import { CompetitionsExpansionController } from './competitions-expansion.controller';
import { TournamentsService } from './tournaments.service';
import { LaddersService } from './ladders.service';
import { CompetitionsService } from './competitions.service';
import { MatchesModule } from '../matches/matches.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [MatchesModule, NotificationsModule],
  controllers: [CompetitionsController, CompetitionsExpansionController],
  providers: [CompetitionsService, TournamentsService, LaddersService],
  // Phase M14's club-admin module is a second consumer, for the
  // league/season/fixture admin write paths.
  exports: [CompetitionsService, TournamentsService, LaddersService],
})
export class CompetitionsModule {}
