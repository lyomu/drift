import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SwingSessionSource, SwingStroke } from '@prisma/client';
import {
  CoachFeedbackError,
  type CoachFeedbackProvider,
} from './coach-feedback.provider';
import type { CreateSwingSessionDto } from './dto/swing-session.dto';
import { SwingSessionsService } from './swing-sessions.service';

const USER = 'user-1';
const SESSION_ID = '0b9c1f0e-6a59-4c5a-9d8e-1f0c2a3b4c5d';

function dto(overrides: Partial<CreateSwingSessionDto> = {}): CreateSwingSessionDto {
  return {
    stroke: SwingStroke.FOREHAND,
    dominantHand: 'RIGHT',
    swingsDetected: 4,
    swingsMeasured: 3,
    metrics: {
      swings: [
        { measured: true, values: { elbowAngleDeg: 150, contactHeightPct: 52 } },
        { measured: true, values: { elbowAngleDeg: 155 } },
        { measured: true, values: { elbowAngleDeg: 148 } },
        { measured: false, reason: 'arm_hidden' },
      ],
    },
    summary: { elbowAngleDeg: { mean: 151, spread: 3, count: 3 } },
    poseModel: 'mlkit-pose-accurate',
    appVersion: '0.9.0+7',
    ...overrides,
  };
}

function storedSession(overrides: Record<string, unknown> = {}) {
  const d = dto();
  return {
    id: SESSION_ID,
    userId: USER,
    stroke: d.stroke,
    dominantHand: d.dominantHand,
    swingsDetected: d.swingsDetected,
    swingsMeasured: d.swingsMeasured,
    metrics: d.metrics,
    summary: d.summary,
    feedback: null,
    poseModel: d.poseModel,
    appVersion: d.appVersion,
    createdAt: new Date(),
    ...overrides,
  };
}

function provider(
  name: 'anthropic' | 'openai',
  configured: boolean,
  generate: jest.Mock = jest.fn(),
): CoachFeedbackProvider {
  return { name, model: `${name}-model`, configured, generate };
}

describe('SwingSessionsService', () => {
  let prisma: {
    swingSession: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  const originalProvider = process.env.COACH_AI_PROVIDER;

  beforeEach(() => {
    prisma = {
      swingSession: {
        create: jest.fn().mockImplementation(({ data }) => ({ id: SESSION_ID, ...data })),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(storedSession()),
        update: jest.fn().mockImplementation(({ data }) => ({ ...storedSession(), ...data })),
      },
    };
    delete process.env.COACH_AI_PROVIDER;
  });

  afterAll(() => {
    if (originalProvider === undefined) delete process.env.COACH_AI_PROVIDER;
    else process.env.COACH_AI_PROVIDER = originalProvider;
  });

  function service(providers: CoachFeedbackProvider[] = []) {
    return new SwingSessionsService(prisma as never, providers);
  }

  describe('create', () => {
    it('stores metrics for the user', async () => {
      await service().create(USER, dto());
      expect(prisma.swingSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: USER, swingsMeasured: 3 }),
      });
    });

    it('refuses more measured swings than detected', async () => {
      await expect(
        service().create(USER, dto({ swingsDetected: 2, swingsMeasured: 3 })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses unknown metric keys (no landmarks or extra data)', async () => {
      await expect(
        service().create(
          USER,
          dto({ metrics: { swings: [{ measured: true, values: { landmarks: 1 } }] } }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses an unmeasured swing without a known reason', async () => {
      await expect(
        service().create(
          USER,
          dto({ metrics: { swings: [{ measured: false, reason: 'because' }] } }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a non-numeric summary', async () => {
      await expect(
        service().create(
          USER,
          dto({ summary: { elbowAngleDeg: { mean: 'x', spread: 1, count: 1 } } }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('defaults the source to LIVE for builds that do not send one', async () => {
      await service().create(USER, dto());
      expect(prisma.swingSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ source: 'LIVE' }),
      });
    });

    it('stores a recorded-clip session with what part of the clip was analysed', async () => {
      const base = dto();
      await service().create(
        USER,
        dto({
          source: SwingSessionSource.CLIP,
          metrics: { ...base.metrics, clip: { analysedMs: 60000, truncated: true } },
        }),
      );
      expect(prisma.swingSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source: 'CLIP',
          metrics: expect.objectContaining({ clip: { analysedMs: 60000, truncated: true } }),
        }),
      });
    });

    it('refuses clip details on a live session', async () => {
      const base = dto();
      await expect(
        service().create(
          USER,
          dto({ metrics: { ...base.metrics, clip: { analysedMs: 1000, truncated: false } } }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses malformed clip details', async () => {
      const base = dto();
      for (const clip of [
        { analysedMs: 'long', truncated: false },
        { analysedMs: -1, truncated: false },
        { analysedMs: 9_999_999, truncated: false },
        { analysedMs: 1000 },
        [1000, false],
      ]) {
        await expect(
          service().create(
            USER,
            dto({ source: SwingSessionSource.CLIP, metrics: { ...base.metrics, clip } }),
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe('findForUser', () => {
    it('only finds the caller\'s own session', async () => {
      prisma.swingSession.findFirst.mockResolvedValue(null);
      await expect(service().findForUser('someone-else', SESSION_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.swingSession.findFirst).toHaveBeenCalledWith({
        where: { id: SESSION_ID, userId: 'someone-else' },
      });
    });
  });

  describe('feedback', () => {
    const goodResult = {
      overall: 'Solid start.',
      tips: [
        { metric: 'elbowAngleDeg', text: 'Stay relaxed through contact.' },
        { metric: 'nonsense', text: 'dropped' },
      ],
    };

    it('prefers Claude when both keys are configured, and stores validated tips', async () => {
      const claude = provider('anthropic', true, jest.fn().mockResolvedValue(goodResult));
      const openai = provider('openai', true);
      await service([claude, openai]).feedback(USER, SESSION_ID, 'fr');

      expect(claude.generate).toHaveBeenCalledWith(
        expect.objectContaining({ locale: 'fr', refusals: { arm_hidden: 1 } }),
      );
      expect(openai.generate).not.toHaveBeenCalled();
      const stored = prisma.swingSession.update.mock.calls[0][0].data.feedback;
      expect(stored.locale).toBe('fr');
      expect(stored.provider).toBe('anthropic');
      expect(stored.tips).toEqual([
        { metric: 'elbowAngleDeg', text: 'Stay relaxed through contact.' },
      ]);
    });

    it('falls back to OpenAI when only its key is set', async () => {
      const openai = provider('openai', true, jest.fn().mockResolvedValue(goodResult));
      await service([provider('anthropic', false), openai]).feedback(USER, SESSION_ID, 'en');
      expect(openai.generate).toHaveBeenCalled();
    });

    it('returns stored feedback in the same language without calling the model', async () => {
      prisma.swingSession.findFirst.mockResolvedValue(
        storedSession({ feedback: { locale: 'es', overall: 'x', tips: [] } }),
      );
      const claude = provider('anthropic', true);
      await service([claude]).feedback(USER, SESSION_ID, 'es');
      expect(claude.generate).not.toHaveBeenCalled();
    });

    it('needs at least 3 measured swings', async () => {
      prisma.swingSession.findFirst.mockResolvedValue(storedSession({ swingsMeasured: 2 }));
      await expect(
        service([provider('anthropic', true)]).feedback(USER, SESSION_ID, 'en'),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('is unavailable when no provider is configured or it is disabled', async () => {
      await expect(
        service([provider('anthropic', false)]).feedback(USER, SESSION_ID, 'en'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);

      process.env.COACH_AI_PROVIDER = 'disabled';
      await expect(
        service([provider('anthropic', true)]).feedback(USER, SESSION_ID, 'en'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('reports a provider failure as a bad gateway and stores nothing', async () => {
      const claude = provider(
        'anthropic',
        true,
        jest.fn().mockRejectedValue(new CoachFeedbackError('UNAVAILABLE', true)),
      );
      await expect(service([claude]).feedback(USER, SESSION_ID, 'en')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(prisma.swingSession.update).not.toHaveBeenCalled();
    });

    it('rejects a reply with no usable tips', async () => {
      const claude = provider(
        'anthropic',
        true,
        jest.fn().mockResolvedValue({ overall: 'Hi', tips: [{ metric: 'x', text: 'y' }] }),
      );
      await expect(service([claude]).feedback(USER, SESSION_ID, 'en')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });
  });
});
