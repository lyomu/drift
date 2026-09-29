import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  ANALYSIS_CONCURRENCY,
  VIDEO_ANALYSIS_QUEUE,
  type AnalyzeJobData,
} from './video-analysis.queue';
import { VideoAnalysisService } from './video-analysis.service';

/**
 * Runs one analysis.
 *
 * Thin on purpose: everything it does lives in VideoAnalysisService, so a retry, a
 * manual re-run and this worker all go through the same code. The worker's own job is
 * to decide what a thrown error means, and there is exactly one rule — if it throws,
 * BullMQ retries; if it returns, it is done.
 */
@Processor(VIDEO_ANALYSIS_QUEUE, { concurrency: ANALYSIS_CONCURRENCY })
export class VideoAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoAnalysisProcessor.name);

  constructor(private readonly videoAnalysis: VideoAnalysisService) {
    super();
  }

  async process(job: Job<AnalyzeJobData>): Promise<void> {
    const { jobId } = job.data;
    this.logger.log(
      `Analysing ${jobId} (attempt ${job.attemptsMade + 1})`,
    );

    await this.videoAnalysis.runAnalysis(jobId, {
      isFinalAttempt: job.attemptsMade + 1 >= (job.opts.attempts ?? 1),
    });
  }
}
