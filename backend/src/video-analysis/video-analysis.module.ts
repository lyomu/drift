import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageModule } from '../storage/storage.module';
import { PushModule } from '../push/push.module';
import { CvServiceClient } from './cv-service.client';
import { VideoAnalysisController } from './video-analysis.controller';
import { VideoAnalysisProcessor } from './video-analysis.processor';
import { VideoAnalysisService } from './video-analysis.service';
import { VIDEO_ANALYSIS_QUEUE } from './video-analysis.queue';

/**
 * AI match-video analysis (Phase 1).
 *
 * Two different shapes of work, deliberately handled differently. The precheck is
 * 74ms–1.6s and runs inside the upload request, so somebody filming at a court is told
 * to turn their phone sideways while they are still standing on it. The analysis is
 * minutes of GPU work and goes on a queue.
 */
@Module({
  imports: [
    ConfigModule,
    StorageModule,
    PushModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Same REDIS_URL the messaging gateway already uses — one answer to "where is
        // Redis" rather than two that can drift apart.
        const url = config.get<string>('REDIS_URL');
        return { connection: url ? { url } : { host: '127.0.0.1', port: 6379 } };
      },
    }),
    BullModule.registerQueue({ name: VIDEO_ANALYSIS_QUEUE }),
  ],
  controllers: [VideoAnalysisController],
  providers: [VideoAnalysisService, CvServiceClient, VideoAnalysisProcessor],
  exports: [VideoAnalysisService],
})
export class VideoAnalysisModule {}
