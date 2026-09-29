import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { VideoAnalysisStatus } from '@prisma/client';
import { createReadStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { PrismaService } from '../prisma/prisma.service';
import { VIDEO_STORAGE, type VideoStorage } from '../storage/video-storage.service';
import { CvServiceClient, type PrecheckResult } from './cv-service.client';

/**
 * Uploads are refused above this before anything is stored. Generous: a minute of
 * 1080p phone video is comfortably past 100MB, and the point is to judge real
 * uploads rather than only small ones. cv-service enforces its own 1GiB ceiling
 * independently — neither trusts the other to have done it.
 */
export const MAX_VIDEO_BYTES = 512 * 1024 * 1024;

const ACCEPTED_MIME_PREFIX = 'video/';

@Injectable()
export class VideoAnalysisService {
  private readonly logger = new Logger(VideoAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cvService: CvServiceClient,
    @Inject(VIDEO_STORAGE) private readonly storage: VideoStorage,
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
   * The queue's actual job is the ANALYSIS, which takes minutes of GPU time and does
   * not exist yet (cv-service answers 501). It goes in when there is something for it
   * to run.
   */
  async createFromUpload(
    userId: string,
    file: { originalname: string; mimetype: string; size: number; path?: string; buffer?: Buffer },
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
      this.logger.error(
        `Precheck failed for job ${job.id}: ${String(error)}`,
      );
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
        precheckResult: result as unknown as object,
        rejectionReasons: reasons,
        completedAt: rejected ? new Date() : null,
      },
    });
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

  /** Exposed for tests and for a future queue worker. */
  static blockingReasons(result: PrecheckResult): string[] {
    return result.findings
      .filter((finding) => finding.severity === 'reject')
      .map((finding) => finding.message);
  }
}
