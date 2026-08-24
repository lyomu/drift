import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  // connections/matches/messaging/competitions (Phase M12) all become
  // consumers, same "second consumer" pattern as CompetitionsModule
  // importing MatchesModule.
  exports: [NotificationsService],
})
export class NotificationsModule {}
