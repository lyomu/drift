import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { Prisma, VideoAnalysisStatus } from '@prisma/client';
import { createReadStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import {
  VIDEO_STORAGE,
  type VideoStorage,
} from '../storage/video-storage.service';
import {
  CvServiceBusyError,
  CvServiceClient,
  type PrecheckResult,
} from './cv-service.client';
import {
  ANALYSIS_JOB_OPTIONS,
  VIDEO_ANALYSIS_QUEUE,
} from './video-analysis.queue';

/**
 * Uploads are refused above this before anything is stored. Generous: a minute of
 * 1080p phone video is comfortably past 100MB, and the point is to judge real
 * uploads rather than only small ones. cv-service enforces its own 1GiB ceiling
 * independently — neither trusts the other to have done it.
 */
export const MAX_VIDEO_BYTES = 512 * 1024 * 1024;

const ACCEPTED_MIME_PREFIX = 'video/';

function asJsonValue(value: object): Prisma.InputJsonValue {
  return value;
}

/**
 * Above this many seconds a clip is analysed as a SESSION — segmented into its rallies,
 * each analysed, then aggregated — rather than as one continuous passage of play.
 *
 * Must stay in step with `LONG_DURATION_S` in cv-service/utils/precheck.py, which is what
 * warns the user at upload time that their clip will be handled this way. Two thresholds
 * that disagree would promise one thing and do another: a clip could be told it would be
 * treated as a session and then be run as a single rally, or the reverse.
 */
export const SESSION_DURATION_S = 600;

@Injectable()
export class VideoAnalysisService {
  private readonly logger = new Logger(VideoAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cvService: CvServiceClient,
    @Inject(VIDEO_STORAGE) private readonly storage: VideoStorage,
    private readonly push: PushService,
    // Optional so the API still boots, and still prechecks, on a deployment with no
    // Redis. Upload and refusal are the parts that work today; losing them because
    // the queue is absent would be the wrong trade.
    @Optional()
    @InjectQueue(VIDEO_ANALYSIS_QUEUE)
    private readonly analysisQueue?: Queue,
  ) {}

  /**
   * Store an uploaded clip, judge it, and record the outcome.
   *
   * The precheck runs synchronously, inside the request, rather than on a queue.
   * That is a deliberate departure from the original plan and rests on a measured
   * number: a precheck is 74ms when it rejects on the video header and ~1.6s when it
   * goes all the way to the court check, against an upload the user is already
   * waiting on. Making them wait a further second to be told "this clip is in
   * portrait, film it in landscape" is better than letting them close the app and
   * pushing them the same sentence minutes later.
   *
   * The queue's actual job is the ANALYSIS, which takes minutes of GPU time for one rally
   * and can take hours for a whole session. That is why it is queued and the precheck is
   * not.
   */
  async createFromUpload(
    userId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      path?: string;
      buffer?: Buffer;
    },
  ) {
    if (!file?.mimetype?.startsWith(ACCEPTED_MIME_PREFIX)) {
      throw new BadRequestException('Only video uploads are supported.');
    }
    if (file.size > MAX_VIDEO_BYTES) {
      throw new BadRequestException(
        `Videos must be ${Math.floor(MAX_VIDEO_BYTES / (1024 * 1024))}MB or smaller.`,
      );
    }
    if (file.size === 0) {
      throw new BadRequestException('The uploaded file is empty.');
    }

    // multer gives us either a temp file on disk or a buffer, depending on how the
    // interceptor is configured. `file.path` is multer's own temp path and NOT a
    // storage key, so it is read directly rather than through the storage driver,
    // which resolves keys under its own root and would refuse this one.
    const stream = file.path
      ? createReadStream(file.path)
      : file.buffer
        ? Readable.from(file.buffer)
        : null;
    if (!stream) {
      throw new BadRequestException('The upload could not be read.');
    }

    const storageKey = await this.storage.save(stream, file.originalname);

    // multer does not clean up its own temp file once the handler returns.
    if (file.path) {
      await rm(file.path, { force: true }).catch((error) => {
        this.logger.warn(
          `Could not remove upload temp file ${file.path}: ${String(error)}`,
        );
      });
    }

    const job = await this.prisma.videoAnalysisJob.create({
      data: {
        userId,
        storageKey,
        originalFilename: file.originalname,
        sizeBytes: file.size,
        mimeType: file.mimetype,
        status: VideoAnalysisStatus.PENDING,
      },
    });

    try {
      return await this.runPrecheck(job.id, storageKey);
    } catch (error) {
      // The clip is stored and the row exists; the check is what failed. Leaving the
      // job PENDING is the honest record — it is neither accepted nor refused, and it
      // can be retried without the user uploading again.
      this.logger.error(`Precheck failed for job ${job.id}: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Run the precheck for a stored clip and write the verdict onto the job.
   *
   * Separated from the upload path so that a retry, or a future queue worker, calls
   * exactly the same thing rather than a second implementation of it.
   */
  async runPrecheck(jobId: string, storageKey: string) {
    const localPath = this.storage.localPath(storageKey);
    if (!localPath) {
      // Every driver today is local. When a bucket-backed one lands, this is where
      // the bytes get streamed to the CV service instead, and it should fail loudly
      // rather than silently skip the check.
      throw new Error(
        'The CV service currently needs a local file, and this storage driver has none.',
      );
    }

    const result = await this.cvService.precheck(localPath);
    const rejected = result.verdict === 'reject';
    const reasons = result.findings
      .filter((finding) => finding.severity === 'reject')
      .map((finding) => finding.message);

    // A refused clip's bytes are not worth keeping: nothing will ever analyse them,
    // and video is the most expensive thing here to store. The verdict and its
    // reasons stay, so the user can still be told why and we can still count how
    // often it happens.
    if (rejected) {
      await this.storage.delete(storageKey).catch((error) => {
        this.logger.warn(
          `Could not delete rejected video ${storageKey}: ${String(error)}`,
        );
      });
    }

    return this.prisma.videoAnalysisJob.update({
      where: { id: jobId },
      data: {
        status: rejected
          ? VideoAnalysisStatus.REJECTED
          : VideoAnalysisStatus.ACCEPTED,
        storageKey: rejected ? null : storageKey,
        precheckResult: asJsonValue(result),
        rejectionReasons: reasons,
        completedAt: rejected ? new Date() : null,
      },
    });
  }

  /**
   * Queue an accepted clip for analysis.
   *
   * Only ACCEPTED jobs are eligible: a REJECTED one has had its video deleted and
   * nothing to analyse, and anything else is either already queued or already done.
   */
  async requestAnalysis(userId: string, jobId: string) {
    const job = await this.findForUser(userId, jobId);

    if (job.status !== VideoAnalysisStatus.ACCEPTED) {
      throw new BadRequestException(
        job.status === VideoAnalysisStatus.REJECTED
          ? 'This clip failed its checks, so there is nothing to analyse.'
          : `This clip is already ${job.status.toLowerCase()}.`,
      );
    }
    if (!this.analysisQueue) {
      throw new ServiceUnavailableException(
        'Analysis is not available on this deployment.',
      );
    }

    await this.analysisQueue.add(
      'analyze',
      { jobId: job.id },
      // Keyed by the job id so a double tap enqueues once. BullMQ treats a repeated
      // job id as already present rather than as new work.
      { ...ANALYSIS_JOB_OPTIONS, jobId: job.id },
    );

    return this.prisma.videoAnalysisJob.update({
      where: { id: job.id },
      data: { status: VideoAnalysisStatus.ANALYZING },
    });
  }

  /**
   * Run the analysis for a queued job. Called by the worker.
   *
   * Throwing means "retry me"; returning means done. The one case that must not throw
   * on its way past is a genuine analysis failure on the last attempt, which has to
   * land as FAILED rather than being retried into silence.
   */
  async runAnalysis(jobId: string, options: { isFinalAttempt: boolean }) {
    const job = await this.prisma.videoAnalysisJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new NotFoundException('Video analysis job not found.');
    if (!job.storageKey) {
      // Nothing to analyse and nothing a retry would change.
      await this.markFailed(jobId, 'The video is no longer available.');
      return;
    }

    const localPath = this.storage.localPath(job.storageKey);
    if (!localPath) {
      throw new Error(
        'The CV service currently needs a local file, and this storage driver has none.',
      );
    }

    // Session or single rally, decided from the precheck already stored on the row rather
    // than from a new column. cv-service read the duration out of the video header at upload
    // time and we kept the whole verdict, so a migration here would add a field whose only
    // source is data we have. `analysisResult` is schemaless JSON and carries `mode`, so the
    // two result shapes coexist without a schema change either.
    const asSession = VideoAnalysisService.isSessionLength(job.precheckResult);

    try {
      const result = asSession
        ? await this.cvService.analyzeSession(localPath)
        : await this.cvService.analyze(localPath);

      const updated = await this.prisma.videoAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: VideoAnalysisStatus.COMPLETED,
          analysisResult: asJsonValue(result.summary),
          cvServiceVersion: result.pipeline_version,
          completedAt: new Date(),
        },
      });

      // From the row we already read, not from the update's return: the owner is not
      // something the write decides, and reading it back couples this to whatever
      // that update happens to select.
      await this.notifyCompleted(job.userId, jobId, result.summary);
      return updated;
    } catch (error) {
      if (error instanceof CvServiceBusyError) {
        // One GPU, and it is in use. Rethrowing puts this back on the queue with
        // backoff, which is where waiting work belongs.
        throw error;
      }
      if (!options.isFinalAttempt) throw error;

      // Out of attempts: record the failure rather than let a retry loop end in
      // silence, leaving the job ANALYZING forever with nobody told.
      this.logger.error(
        `Analysis of ${jobId} failed for good: ${String(error)}`,
      );
      await this.markFailed(
        jobId,
        'The analysis could not be completed. Please try again later.',
      );
      return;
    }
  }

  private async markFailed(jobId: string, reason: string) {
    return this.prisma.videoAnalysisJob.update({
      where: { id: jobId },
      data: {
        status: VideoAnalysisStatus.FAILED,
        failureReason: reason,
        completedAt: new Date(),
      },
    });
  }

  private async notifyCompleted(
    userId: string,
    jobId: string,
    summary: Record<string, unknown>,
  ) {
    // A push that overstates the result is worse than none. The pipeline says outright
    // when the court fit failed, and in that case its numbers are not measurements —
    // so the notification says the clip is ready to look at, not what it found.
    const calibrated = summary['court_calibrated'] !== false;
    const isSession = summary['mode'] === 'session';

    // A session's headline is how much of it was measured, not that it is "analysed".
    // A budget-limited session covered 8 of 20 rallies, and a notification saying
    // "your session has been analysed" would be read as all of it.
    const found = Number(summary['segments_found'] ?? 0);
    const analysed = Number(summary['segments_analysed'] ?? 0);
    const partial = isSession && found > analysed;

    const title = isSession
      ? 'Your session has been analysed'
      : 'Your clip has been analysed';
    let body: string;
    if (partial) {
      body = `We measured ${analysed} of the ${found} rallies we found. Tap to see them.`;
    } else if (isSession) {
      body =
        `We measured ${analysed} rall${analysed === 1 ? 'y' : 'ies'}. ` +
        'Tap to see what we found.';
    } else if (calibrated) {
      body = 'Tap to see what we found.';
    } else {
      body =
        "Tap to see the results — the court wasn't clear enough to measure " +
        'distances, so some numbers are missing.';
    }

    try {
      await this.push.sendToUser(userId, title, body, {
        category: 'video_analysis',
        relatedEntityType: 'videoAnalysisJob',
        relatedEntityId: jobId,
      });
    } catch (error) {
      // The analysis succeeded; failing the job because a notification did not send
      // would throw away real work.
      this.logger.warn(
        `Analysis of ${jobId} completed but the push failed: ${String(error)}`,
      );
    }
  }

  async findForUser(userId: string, jobId: string) {
    const job = await this.prisma.videoAnalysisJob.findFirst({
      where: { id: jobId, userId },
    });
    // Scoped by userId and reported as absent rather than forbidden: whether another
    // user's job exists is not this user's business.
    if (!job) throw new NotFoundException('Video analysis job not found.');
    return job;
  }

  async listForUser(userId: string, take = 20) {
    return this.prisma.videoAnalysisJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 100),
    });
  }

  /** Whether the CV service is reachable, for the upload screen to check first. */
  async serviceStatus() {
    return this.cvService.health();
  }

  /**
   * Whether a stored precheck verdict describes a clip long enough to be a session.
   *
   * Static and defensive because it reads JSON that came out of Postgres, where the shape is
   * whatever cv-service wrote at the time. An older row may predate the metadata block
   * entirely, and the honest default for "we cannot tell how long this is" is the single-clip
   * path: running a 20-second rally through session mode wastes a pre-pass, while running a
   * 40-minute session as one rally produces a confident refusal or a meaningless number.
   */
  static isSessionLength(precheckResult: unknown): boolean {
    if (!precheckResult || typeof precheckResult !== 'object') return false;
    const metadata = (precheckResult as { metadata?: unknown }).metadata;
    if (!metadata || typeof metadata !== 'object') return false;
    const duration = (metadata as { duration_s?: unknown }).duration_s;
    return typeof duration === 'number' && duration > SESSION_DURATION_S;
  }

  /** Exposed for tests and for a future queue worker. */
  static blockingReasons(result: PrecheckResult): string[] {
    return result.findings
      .filter((finding) => finding.severity === 'reject')
      .map((finding) => finding.message);
  }
}
