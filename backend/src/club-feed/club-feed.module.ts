import { Module } from '@nestjs/common';
import { ClubFeedController } from './club-feed.controller';
import { ClubFeedService } from './club-feed.service';

@Module({
  controllers: [ClubFeedController],
  providers: [ClubFeedService],
})
export class ClubFeedModule {}
