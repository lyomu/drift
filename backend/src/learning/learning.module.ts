import { Module } from '@nestjs/common';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';

@Module({
  controllers: [LearningController],
  providers: [LearningService],
  // home.module.ts (Phase M10) is a second consumer, same "second
  // consumer" pattern as CompetitionsService importing MatchesModule.
  exports: [LearningService],
})
export class LearningModule {}
