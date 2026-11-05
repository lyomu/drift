import { Module } from '@nestjs/common';
import { CompetitionsModule } from '../competitions/competitions.module';
import { MatchesModule } from '../matches/matches.module';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  CommunitiesController,
  CommunityMediaController,
} from './communities.controller';
import { CommunitiesService } from './communities.service';

@Module({
  imports: [
    NotificationsModule,
    MessagingModule,
    CompetitionsModule,
    MatchesModule,
  ],
  controllers: [CommunitiesController, CommunityMediaController],
  providers: [CommunitiesService],
  // Club-admin (the club's own community) and platform-admin (review,
  // suspension) drive the same service.
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
