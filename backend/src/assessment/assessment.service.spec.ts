import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  AssessmentBranch,
  AssessmentPillar,
  AssessmentSessionStatus,
} from '@prisma/client';
import { AssessmentService } from './assessment.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  tennisProfile: Record<string, jest.Mock>;
  assessmentSession: Record<string, jest.Mock>;
  assessmentAnswer: Record<string, jest.Mock>;
  user: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createMockPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    tennisProfile: { findUnique: jest.fn(), update: jest.fn() },
    assessmentSession: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    assessmentAnswer: { create: jest.fn() },
    user: { update: jest.fn() },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: MockPrisma) => Promise<unknown>)(prisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });

  return prisma;
}

describe('AssessmentService', () => {
  let service: AssessmentService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new AssessmentService(prisma as unknown as PrismaService);
  });

  describe('branchFor', () => {
    it.each([
      ['NEW', 'BEGINNER'],
      ['UNDER_6M', 'FOUNDATIONAL'],
      ['SIX_TO_12M', 'FOUNDATIONAL'],
      ['ONE_TO_2Y', 'INTERMEDIATE'],
      ['TWO_TO_5Y', 'INTERMEDIATE'],
      ['FIVE_PLUS', 'ADVANCED'],
      ['COMPETITIVE', 'ADVANCED'],
    ] as const)('%s -> %s', (signal, branch) => {
      expect(service.branchFor(signal)).toBe(branch);
    });
  });

  describe('scopeFor', () => {
    it('Beginner scope is Forehand, Backhand, Serve, Match Play', () => {
      expect(service.scopeFor(AssessmentBranch.BEGINNER)).toEqual([
        AssessmentPillar.FOREHAND,
        AssessmentPillar.BACKHAND,
        AssessmentPillar.SERVE,
        AssessmentPillar.MATCH_PLAY,
      ]);
    });

    it('Advanced scope includes all 8 pillars with Match Play last', () => {
      const scope = service.scopeFor(AssessmentBranch.ADVANCED);
      expect(scope).toHaveLength(8);
      expect(scope[scope.length - 1]).toBe(AssessmentPillar.MATCH_PLAY);
      expect(scope).toContain(AssessmentPillar.COMPETITION_EXPERIENCE);
      expect(scope).toContain(AssessmentPillar.NET_PLAY);
    });

    it('Intermediate scope excludes Competition Experience', () => {
      expect(service.scopeFor(AssessmentBranch.INTERMEDIATE)).not.toContain(
        AssessmentPillar.COMPETITION_EXPERIENCE,
      );
    });
  });

  describe('levelForAverage', () => {
    it('minimum average maps to level 1.0 / Beginner', () => {
      expect(service.levelForAverage(1)).toEqual({
        level: 1.0,
        label: 'Beginner',
      });
    });

    it('maximum average maps to level 7.0 / Advanced', () => {
      expect(service.levelForAverage(6)).toEqual({
        level: 7.0,
        label: 'Advanced',
      });
    });

    it('mid-range average maps to a mid-range level', () => {
      const { level } = service.levelForAverage(3.5);
      expect(level).toBeGreaterThan(3);
      expect(level).toBeLessThan(5);
    });
  });

  describe('startOrResumeSession', () => {
    it('rejects starting before Tennis Experience is recorded', async () => {
      prisma.tennisProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        experienceSignal: null,
      });

      await expect(
        service.startOrResumeSession('user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns the existing in-progress session instead of creating a new one', async () => {
      prisma.tennisProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        experienceSignal: 'NEW',
      });
      prisma.assessmentSession.findFirst.mockResolvedValue({
        id: 'session-1',
        branch: AssessmentBranch.BEGINNER,
        currentTier: AssessmentBranch.BEGINNER,
        questionBudget: 6,
        answers: [],
      });

      const result = await service.startOrResumeSession('user-1');

      expect(prisma.assessmentSession.create).not.toHaveBeenCalled();
      expect(result.sessionId).toBe('session-1');
      expect(result.nextQuestion?.pillar).toBe(AssessmentPillar.FOREHAND);
    });

    it('creates a new Beginner session with budget 6 for a new player', async () => {
      prisma.tennisProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        experienceSignal: 'NEW',
      });
      prisma.assessmentSession.findFirst.mockResolvedValue(null);
      prisma.assessmentSession.create.mockResolvedValue({
        id: 'session-2',
        branch: AssessmentBranch.BEGINNER,
        currentTier: AssessmentBranch.BEGINNER,
        questionBudget: 6,
      });

      const result = await service.startOrResumeSession('user-1');

      expect(prisma.assessmentSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            branch: AssessmentBranch.BEGINNER,
            questionBudget: 6,
          }),
        }),
      );
      expect(result.nextQuestion?.pillar).toBe(AssessmentPillar.FOREHAND);
    });
  });

  describe('getActiveSession', () => {
    it('throws NotFoundException when nothing is in progress', async () => {
      prisma.tennisProfile.findUnique.mockResolvedValue({ id: 'profile-1' });
      prisma.assessmentSession.findFirst.mockResolvedValue(null);

      await expect(service.getActiveSession('user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('submitAnswer', () => {
    const baseSession = {
      id: 'session-1',
      tennisProfileId: 'profile-1',
      branch: AssessmentBranch.BEGINNER,
      currentTier: AssessmentBranch.BEGINNER,
      status: AssessmentSessionStatus.IN_PROGRESS,
      questionBudget: 6,
      answers: [] as { pointValue: number }[],
    };

    beforeEach(() => {
      prisma.tennisProfile.findUnique.mockResolvedValue({ id: 'profile-1' });
    });

    it('rejects a question that is not the expected next pillar', async () => {
      prisma.assessmentSession.findUnique.mockResolvedValue({
        ...baseSession,
        answers: [],
      });

      await expect(
        service.submitAnswer('user-1', 'session-1', 'BACKHAND_BASIC', 'A'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects submitting to a completed session', async () => {
      prisma.assessmentSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: AssessmentSessionStatus.COMPLETED,
      });

      await expect(
        service.submitAnswer('user-1', 'session-1', 'FOREHAND_BASIC', 'A'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns the next question when pillars remain', async () => {
      prisma.assessmentSession.findUnique.mockResolvedValue({
        ...baseSession,
        answers: [],
      });

      const result = await service.submitAnswer(
        'user-1',
        'session-1',
        'FOREHAND_BASIC',
        'F',
      );

      expect(prisma.assessmentAnswer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pointValue: 6, sequenceIndex: 0 }),
        }),
      );
      expect('nextQuestion' in result && result.nextQuestion.pillar).toBe(
        AssessmentPillar.BACKHAND,
      );
    });

    it('downshifts currentTier after two bottom-tier answers in a row', async () => {
      // Foundational scope: Forehand, Backhand, Serve, Return, Movement, Match Play.
      prisma.assessmentSession.findUnique.mockResolvedValue({
        ...baseSession,
        branch: AssessmentBranch.FOUNDATIONAL,
        currentTier: AssessmentBranch.FOUNDATIONAL,
        answers: [
          {
            pointValue: 1,
            pillar: AssessmentPillar.FOREHAND,
            sequenceIndex: 0,
          },
        ],
      });

      await service.submitAnswer('user-1', 'session-1', 'BACKHAND_BASIC', 'B');

      expect(prisma.assessmentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { currentTier: AssessmentBranch.BEGINNER },
        }),
      );
    });

    it('completes the session on the last pillar and computes the level/skill breakdown', async () => {
      // Beginner scope: Forehand, Backhand, Serve, Match Play (4 total).
      prisma.assessmentSession.findUnique.mockResolvedValue({
        ...baseSession,
        answers: [
          {
            pointValue: 6,
            pillar: AssessmentPillar.FOREHAND,
            sequenceIndex: 0,
          },
          {
            pointValue: 6,
            pillar: AssessmentPillar.BACKHAND,
            sequenceIndex: 1,
          },
          { pointValue: 6, pillar: AssessmentPillar.SERVE, sequenceIndex: 2 },
        ],
      });

      const result = await service.submitAnswer(
        'user-1',
        'session-1',
        'MATCH_PLAY_BASIC',
        'F',
      );

      expect('complete' in result && result.complete).toBe(true);
      if ('complete' in result) {
        expect(result.level).toBe(7.0);
        expect(result.label).toBe('Advanced');
        expect(result.skillBreakdown[AssessmentPillar.MATCH_PLAY]).toBe(6);
      }
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ onboardingStep: 'LEVEL_REVIEW' }),
        }),
      );
    });
  });
});
