import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { VideoAnalysisService } from './video-analysis.service';
import { CvServiceBusyError, type PrecheckResult } from './cv-service.client';

type MockPrisma = {
  videoAnalysisJob: Record<string, jest.Mock>;
};

function createMockPrisma(): MockPrisma {
  return {
    videoAnalysisJob: {
      create: jest.fn().mockResolvedValue({ id: 'job-1' }),
      update: jest.fn().mockImplementation(({ data }) => ({ id: 'job-1', ...data })),
      findFirst: jest.fn().mockResolvedValue({ id: 'job-1' }),
      findUnique: jest.fn().mockResolvedValue({
        id: 'job-1',
        userId: 'user-1',
        storageKey: 'ab/ab-cd.mp4',
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

function createMockStorage() {
  return {
    save: jest.fn().mockResolvedValue('ab/ab-cd.mp4'),
    read: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    localPath: jest.fn().mockReturnValue('/var/videos/ab/ab-cd.mp4'),
  };
}

function precheckResult(overrides: Partial<PrecheckResult> = {}): PrecheckResult {
  return {
    video: 'clip.mp4',
    verdict: 'pass',
    metadata: {},
    frames_sampled: true,
    court_checked: true,
    findings: [{ check: 'court', severity: 'pass', message: 'fine', detail: {} }],
    ...overrides,
  };
}

const REJECTED = precheckResult({
  verdict: 'reject',
  court_checked: false,
  findings: [
    { check: 'readable', severity: 'pass', message: 'ok', detail: {} },
    {
      check: 'orientation',
      severity: 'reject',
      message: 'This clip is in portrait. Turn the phone sideways.',
      detail: {},
    },
    {
      check: 'resolution',
      severity: 'reject',
      message: '480x864 is too low to track a tennis ball.',
      detail: {},
    },
  ],
});

function upload(overrides: Partial<Express.Multer.File> = {}) {
  return {
    originalname: 'clip.mp4',
    mimetype: 'video/mp4',
    size: 1024,
    buffer: Buffer.from('fake video bytes'),
    ...overrides,
  } as Express.Multer.File;
}

function build(precheck: PrecheckResult = precheckResult()) {
  const prisma = createMockPrisma();
  const storage = createMockStorage();
  const cv = {
    precheck: jest.fn().mockResolvedValue(precheck),
    analyze: jest.fn(),
    health: jest.fn(),
  };
  const push = { sendToUser: jest.fn().mockResolvedValue(undefined) };
  const queue = { add: jest.fn().mockResolvedValue(undefined) };
  const service = new VideoAnalysisService(
    prisma as never,
    cv as never,
    storage as never,
    push as never,
    queue as never,
  );
  return { service, prisma, storage, cv, push, queue };
}

describe('VideoAnalysisService', () => {
  describe('upload validation', () => {
    it('refuses anything that is not a video', async () => {
      const { service, storage } = build();
      await expect(
        service.createFromUpload('user-1', upload({ mimetype: 'image/png' })),
      ).rejects.toBeInstanceOf(BadRequestException);
      // and nothing was stored
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('refuses an empty file', async () => {
      const { service } = build();
      await expect(
        service.createFromUpload('user-1', upload({ size: 0 })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a file over the ceiling before storing it', async () => {
      const { service, storage } = build();
      await expect(
        service.createFromUpload('user-1', upload({ size: 10 * 1024 ** 3 })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.save).not.toHaveBeenCalled();
    });
  });

  describe('a clip that passes', () => {
    it('is stored and recorded as ACCEPTED', async () => {
      const { service, prisma, storage } = build();
      await service.createFromUpload('user-1', upload());

      expect(storage.save).toHaveBeenCalled();
      const update = prisma.videoAnalysisJob.update.mock.calls[0][0];
      expect(update.data.status).toBe('ACCEPTED');
      expect(update.data.rejectionReasons).toEqual([]);
    });

    it('keeps the stored video', async () => {
      const { service, storage, prisma } = build();
      await service.createFromUpload('user-1', upload());

      expect(storage.delete).not.toHaveBeenCalled();
      expect(prisma.videoAnalysisJob.update.mock.calls[0][0].data.storageKey)
        .toBe('ab/ab-cd.mp4');
    });

    it('is not marked complete, because nothing has analysed it yet', async () => {
      // ACCEPTED means "worth analysing", not "analysed". Setting completedAt here
      // would make an un-analysed clip look finished to anything reading the table.
      const { service, prisma } = build();
      await service.createFromUpload('user-1', upload());
      expect(prisma.videoAnalysisJob.update.mock.calls[0][0].data.completedAt)
        .toBeNull();
    });
  });

  describe('a clip that is refused', () => {
    it('is recorded as REJECTED with the reasons the uploader should see', async () => {
      const { service, prisma } = build(REJECTED);
      await service.createFromUpload('user-1', upload());

      const { data } = prisma.videoAnalysisJob.update.mock.calls[0][0];
      expect(data.status).toBe('REJECTED');
      expect(data.rejectionReasons).toEqual([
        'This clip is in portrait. Turn the phone sideways.',
        '480x864 is too low to track a tennis ball.',
      ]);
    });

    it('carries only the blocking findings into rejectionReasons', async () => {
      const { service, prisma } = build(REJECTED);
      await service.createFromUpload('user-1', upload());

      const { data } = prisma.videoAnalysisJob.update.mock.calls[0][0];
      expect(data.rejectionReasons).not.toContain('ok');
    });

    it('discards the video but keeps the verdict', async () => {
      // Nothing will ever analyse a refused clip, and video is the most expensive
      // thing here to keep. The reasons have to survive so the user can be told why.
      const { service, storage, prisma } = build(REJECTED);
      await service.createFromUpload('user-1', upload());

      expect(storage.delete).toHaveBeenCalledWith('ab/ab-cd.mp4');
      const { data } = prisma.videoAnalysisJob.update.mock.calls[0][0];
      expect(data.storageKey).toBeNull();
      expect(data.precheckResult).toBeTruthy();
    });

    it('still records the job when the video file cannot be deleted', async () => {
      const { service, storage, prisma } = build(REJECTED);
      storage.delete.mockRejectedValue(new Error('disk gone'));

      await service.createFromUpload('user-1', upload());

      expect(prisma.videoAnalysisJob.update).toHaveBeenCalled();
    });
  });

  describe('when the CV service is unreachable', () => {
    it('propagates the failure and leaves the job PENDING', async () => {
      // The clip is stored and the row exists; only the check failed. Marking it
      // REJECTED would tell the user their video was bad when nothing looked at it.
      const { service, prisma, cv } = build();
      cv.precheck.mockRejectedValue(new Error('connection refused'));

      await expect(
        service.createFromUpload('user-1', upload()),
      ).rejects.toThrow('connection refused');

      expect(prisma.videoAnalysisJob.create.mock.calls[0][0].data.status)
        .toBe('PENDING');
      expect(prisma.videoAnalysisJob.update).not.toHaveBeenCalled();
    });
  });

  describe('storage drivers without a local path', () => {
    it('fails loudly rather than skipping the check', async () => {
      // A bucket-backed driver will need the bytes streamed instead. Silently
      // skipping would let every clip through unchecked.
      const { service, storage } = build();
      storage.localPath.mockReturnValue(null);

      await expect(
        service.createFromUpload('user-1', upload()),
      ).rejects.toThrow(/local file/i);
    });
  });

  describe('reading jobs back', () => {
    it('scopes a lookup to the owner', async () => {
      const { service, prisma } = build();
      await service.findForUser('user-1', 'job-1');

      expect(prisma.videoAnalysisJob.findFirst).toHaveBeenCalledWith({
        where: { id: 'job-1', userId: 'user-1' },
      });
    });

    it("reports another user's job as absent, not forbidden", async () => {
      const { service, prisma } = build();
      prisma.videoAnalysisJob.findFirst.mockResolvedValue(null);

      await expect(service.findForUser('user-1', 'someone-elses')).rejects
        .toBeInstanceOf(NotFoundException);
    });

    it('clamps the list size', async () => {
      const { service, prisma } = build();
      await service.listForUser('user-1', 10_000);
      expect(prisma.videoAnalysisJob.findMany.mock.calls[0][0].take).toBe(100);

      await service.listForUser('user-1', -5);
      expect(prisma.videoAnalysisJob.findMany.mock.calls[1][0].take).toBe(1);
    });
  });
});

describe('VideoAnalysisService — analysis', () => {
  const ACCEPTED = { id: 'job-1', userId: 'user-1', status: 'ACCEPTED' };

  describe('requesting an analysis', () => {
    it('queues an accepted clip and marks it ANALYZING', async () => {
      const { service, prisma, queue } = build();
      prisma.videoAnalysisJob.findFirst.mockResolvedValue(ACCEPTED);

      await service.requestAnalysis('user-1', 'job-1');

      expect(queue.add).toHaveBeenCalledWith(
        'analyze',
        { jobId: 'job-1' },
        expect.objectContaining({ jobId: 'job-1' }),
      );
      expect(prisma.videoAnalysisJob.update.mock.calls[0][0].data.status)
        .toBe('ANALYZING');
    });

    it('enqueues under the job id so a double tap queues once', async () => {
      // BullMQ treats a repeated job id as already present. Without it, an impatient
      // tap costs a second run of minutes of scarce GPU time.
      const { service, prisma, queue } = build();
      prisma.videoAnalysisJob.findFirst.mockResolvedValue(ACCEPTED);

      await service.requestAnalysis('user-1', 'job-1');

      expect(queue.add.mock.calls[0][2].jobId).toBe('job-1');
    });

    it('refuses a clip that failed its checks, explaining why', async () => {
      const { service, prisma, queue } = build();
      prisma.videoAnalysisJob.findFirst.mockResolvedValue({
        ...ACCEPTED,
        status: 'REJECTED',
      });

      await expect(service.requestAnalysis('user-1', 'job-1')).rejects.toThrow(
        /failed its checks/,
      );
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('refuses a clip that is already being analysed', async () => {
      const { service, prisma } = build();
      prisma.videoAnalysisJob.findFirst.mockResolvedValue({
        ...ACCEPTED,
        status: 'ANALYZING',
      });

      await expect(service.requestAnalysis('user-1', 'job-1')).rejects.toThrow(
        /already analyzing/i,
      );
    });
  });

  describe('running an analysis', () => {
    it('stores the summary whole and records the pipeline version', async () => {
      const { service, prisma, cv } = build();
      cv.analyze.mockResolvedValue({
        video: 'clip.mp4',
        summary: { total_shots_p1: 3, court_calibrated: true },
        pipeline_version: '2.1.1',
      });

      await service.runAnalysis('job-1', { isFinalAttempt: false });

      const { data } = prisma.videoAnalysisJob.update.mock.calls[0][0];
      expect(data.status).toBe('COMPLETED');
      expect(data.analysisResult).toEqual({
        total_shots_p1: 3,
        court_calibrated: true,
      });
      expect(data.cvServiceVersion).toBe('2.1.1');
    });

    it('notifies the user when it finishes', async () => {
      const { service, cv, push } = build();
      cv.analyze.mockResolvedValue({
        video: 'clip.mp4',
        summary: { court_calibrated: true },
        pipeline_version: '2.1.1',
      });

      await service.runAnalysis('job-1', { isFinalAttempt: false });

      expect(push.sendToUser).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ category: 'video_analysis' }),
      );
    });

    it('does not promise findings when the court could not be measured', async () => {
      // The pipeline says outright when the court fit failed, and in that case its
      // distances are not measurements. A push implying otherwise would be the one
      // place this whole pipeline lies to somebody.
      const { service, cv, push } = build();
      cv.analyze.mockResolvedValue({
        video: 'clip.mp4',
        summary: { court_calibrated: false },
        pipeline_version: '2.1.1',
      });

      await service.runAnalysis('job-1', { isFinalAttempt: false });

      const body = push.sendToUser.mock.calls[0][2] as string;
      expect(body).toMatch(/wasn't clear enough|some numbers are missing/i);
    });

    it('keeps the result when the notification fails', async () => {
      const { service, prisma, cv, push } = build();
      cv.analyze.mockResolvedValue({
        video: 'clip.mp4',
        summary: {},
        pipeline_version: '2.1.1',
      });
      push.sendToUser.mockRejectedValue(new Error('FCM down'));

      await service.runAnalysis('job-1', { isFinalAttempt: false });

      expect(prisma.videoAnalysisJob.update.mock.calls[0][0].data.status)
        .toBe('COMPLETED');
    });

    it('rethrows when the GPU is busy, so the queue retries', async () => {
      const { service, prisma, cv } = build();
      cv.analyze.mockRejectedValue(new CvServiceBusyError(60));

      await expect(
        service.runAnalysis('job-1', { isFinalAttempt: true }),
      ).rejects.toBeInstanceOf(CvServiceBusyError);

      // Busy is not failure, even on the last attempt.
      expect(prisma.videoAnalysisJob.update).not.toHaveBeenCalled();
    });

    it('retries a plain failure rather than recording it', async () => {
      const { service, prisma, cv } = build();
      cv.analyze.mockRejectedValue(new Error('cv exploded'));

      await expect(
        service.runAnalysis('job-1', { isFinalAttempt: false }),
      ).rejects.toThrow('cv exploded');
      expect(prisma.videoAnalysisJob.update).not.toHaveBeenCalled();
    });

    it('records FAILED on the last attempt so the job cannot hang forever', async () => {
      // Without this the job sits in ANALYZING indefinitely and nobody is ever told.
      const { service, prisma, cv } = build();
      cv.analyze.mockRejectedValue(new Error('cv exploded'));

      await service.runAnalysis('job-1', { isFinalAttempt: true });

      const { data } = prisma.videoAnalysisJob.update.mock.calls[0][0];
      expect(data.status).toBe('FAILED');
      expect(data.failureReason).toBeTruthy();
    });

    it('fails a job whose video has already been discarded', async () => {
      const { service, prisma, cv } = build();
      prisma.videoAnalysisJob.findUnique.mockResolvedValue({
        id: 'job-1',
        userId: 'user-1',
        storageKey: null,
      });

      await service.runAnalysis('job-1', { isFinalAttempt: false });

      expect(cv.analyze).not.toHaveBeenCalled();
      expect(prisma.videoAnalysisJob.update.mock.calls[0][0].data.status)
        .toBe('FAILED');
    });
  });
});
