import { Module } from '@nestjs/common';
import { ClubFeedController } from './club-feed.controller';
import { ClubFeedService } from './club-feed.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  controllers: [ClubFeedController],
  imports: [NotificationsModule],
  providers: [ClubFeedService],
})
export class ClubFeedModule {}
