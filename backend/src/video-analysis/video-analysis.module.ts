import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from '../storage/storage.module';
import { CvServiceClient } from './cv-service.client';
import { VideoAnalysisController } from './video-analysis.controller';
import { VideoAnalysisService } from './video-analysis.service';

/**
 * AI match-video analysis (Phase 1, slice 1b).
 *
 * Upload, store and judge a clip. It does NOT analyse one: that is minutes of GPU
 * work, cv-service answers 501 for it, and it will arrive as a queued job with a
 * callback. No queue is wired here yet because a precheck is 74ms–1.6s and runs
 * inside the request; adding BullMQ now would be scaffolding around one fast call.
 */
@Module({
  imports: [ConfigModule, StorageModule],
  controllers: [VideoAnalysisController],
  providers: [VideoAnalysisService, CvServiceClient],
  exports: [VideoAnalysisService],
})
export class VideoAnalysisModule {}
