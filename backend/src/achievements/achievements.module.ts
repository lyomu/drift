import { Module } from '@nestjs/common';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';

@Module({
  controllers: [AchievementsController],
  providers: [AchievementsService],
  // Second consumer: HomeModule's achievement-progress card reuses the same
  // derived rule catalogue rather than recomputing progress independently.
  exports: [AchievementsService],
})
export class AchievementsModule {}
