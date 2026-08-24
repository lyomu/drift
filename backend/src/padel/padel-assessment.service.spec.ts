import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  AssessmentSessionStatus,
  PadelAssessmentBranch,
  PadelAssessmentPillar,
} from '@prisma/client';
import { PadelAssessmentService } from './padel-assessment.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  padelProfile: Record<string, jest.Mock>;
  padelAssessmentSession: Record<string, jest.Mock>;
  padelAssessmentAnswer: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createMockPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    padelProfile: { findUnique: jest.fn(), update: jest.fn() },
    padelAssessmentSession: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    padelAssessmentAnswer: { create: jest.fn() },
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

describe('PadelAssessmentService', () => {
  let service: PadelAssessmentService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new PadelAssessmentService(prisma as unknown as PrismaService);
  });

  describe('scopeFor', () => {
    it('Beginner scope is the 6 beginner-eligible pillars, Rally Consistency first', () => {
      expect(service.scopeFor(PadelAssessmentBranch.BEGINNER)).toEqual([
        PadelAssessmentPillar.RALLY_CONSISTENCY,
        PadelAssessmentPillar.FOREHAND,
        PadelAssessmentPillar.BACKHAND,
        PadelAssessmentPillar.SERVE,
        PadelAssessmentPillar.RETURN,
        PadelAssessmentPillar.VOLLEY,
      ]);
    });

    it('Experienced scope includes all 16 pillars, Tactical Awareness last', () => {
      const scope = service.scopeFor(PadelAssessmentBranch.EXPERIENCED);
      expect(scope).toHaveLength(16);
      expect(scope[scope.length - 1]).toBe(
        PadelAssessmentPillar.TACTICAL_AWARENESS,
      );
      expect(scope).toContain(PadelAssessmentPillar.BANDEJA);
      expect(scope).toContain(PadelAssessmentPillar.VIBORA);
    });
  });

  describe('startOrResumeSession', () => {
    it('rejects when Padel has not been added yet', async () => {
      prisma.padelProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.startOrResumeSession('user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the existing in-progress session instead of creating a new one', async () => {
      prisma.padelProfile.findUnique.mockResolvedValue({ id: 'profile-1' });
      prisma.padelAssessmentSession.findFirst.mockResolvedValue({
        id: 'session-1',
        branch: PadelAssessmentBranch.EXPERIENCED,
        questionBudget: 16,
        answers: [],
      });

      const result = await service.startOrResumeSession('user-1');

      expect(prisma.padelAssessmentSession.create).not.toHaveBeenCalled();
      expect(result.sessionId).toBe('session-1');
      expect(result.nextQuestion?.pillar).toBe(
        PadelAssessmentPillar.RALLY_CONSISTENCY,
      );
    });

    it('creates a new session starting as EXPERIENCED with budget 16 — the branch is not known yet', async () => {
      prisma.padelProfile.findUnique.mockResolvedValue({ id: 'profile-1' });
      prisma.padelAssessmentSession.findFirst.mockResolvedValue(null);
      prisma.padelAssessmentSession.create.mockResolvedValue({
        id: 'session-2',
        branch: PadelAssessmentBranch.EXPERIENCED,
        questionBudget: 16,
      });

      const result = await service.startOrResumeSession('user-1');

      expect(prisma.padelAssessmentSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            branch: PadelAssessmentBranch.EXPERIENCED,
            questionBudget: 16,
          }),
        }),
      );
      expect(result.nextQuestion?.pillar).toBe(
        PadelAssessmentPillar.RALLY_CONSISTENCY,
      );
    });
  });

  describe('getActiveSession', () => {
    it('throws NotFoundException when nothing is in progress', async () => {
      prisma.padelProfile.findUnique.mockResolvedValue({ id: 'profile-1' });
      prisma.padelAssessmentSession.findFirst.mockResolvedValue(null);

      await expect(service.getActiveSession('user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('submitAnswer', () => {
    const baseSession = {
      id: 'session-1',
      padelProfileId: 'profile-1',
      branch: PadelAssessmentBranch.EXPERIENCED,
      status: AssessmentSessionStatus.IN_PROGRESS,
      questionBudget: 16,
      answers: [] as { pointValue: number }[],
    };

    beforeEach(() => {
      prisma.padelProfile.findUnique.mockResolvedValue({ id: 'profile-1' });
    });

    it('rejects a question that is not the expected next pillar', async () => {
      prisma.padelAssessmentSession.findUnique.mockResolvedValue({
        ...baseSession,
        answers: [],
      });

      await expect(
        service.submitAnswer('user-1', 'session-1', 'FOREHAND_BASIC', 'A'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects submitting to a completed session', async () => {
      prisma.padelAssessmentSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: AssessmentSessionStatus.COMPLETED,
      });

      await expect(
        service.submitAnswer(
          'user-1',
          'session-1',
          'RALLY_CONSISTENCY_BASIC',
          'A',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('locks the branch to BEGINNER after a low first answer, narrowing later questions', async () => {
      prisma.padelAssessmentSession.findUnique.mockResolvedValue({
        ...baseSession,
        answers: [],
      });

      const result = await service.submitAnswer(
        'user-1',
        'session-1',
        'RALLY_CONSISTENCY_BASIC',
        'B', // points: 2 — at the "beginner" threshold
      );

      expect(prisma.padelAssessmentSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            branch: PadelAssessmentBranch.BEGINNER,
            questionBudget: 6,
          },
        }),
      );
      expect('nextQuestion' in result && result.nextQuestion.pillar).toBe(
        PadelAssessmentPillar.FOREHAND,
      );
    });

    it('keeps the EXPERIENCED branch after a confident first answer', async () => {
      prisma.padelAssessmentSession.findUnique.mockResolvedValue({
        ...baseSession,
        answers: [],
      });

      await service.submitAnswer(
        'user-1',
        'session-1',
        'RALLY_CONSISTENCY_BASIC',
        'D', // points: 4 — above the beginner threshold
      );

      expect(prisma.padelAssessmentSession.update).not.toHaveBeenCalled();
    });

    it('completes a BEGINNER session on its 6th pillar without touching onboarding step', async () => {
      // Beginner scope: Rally Consistency, Forehand, Backhand, Serve, Return, Volley.
      prisma.padelAssessmentSession.findUnique.mockResolvedValue({
        ...baseSession,
        branch: PadelAssessmentBranch.BEGINNER,
        questionBudget: 6,
        answers: [
          {
            pointValue: 2,
            pillar: PadelAssessmentPillar.RALLY_CONSISTENCY,
            sequenceIndex: 0,
          },
          {
            pointValue: 6,
            pillar: PadelAssessmentPillar.FOREHAND,
            sequenceIndex: 1,
          },
          {
            pointValue: 6,
            pillar: PadelAssessmentPillar.BACKHAND,
            sequenceIndex: 2,
          },
          {
            pointValue: 6,
            pillar: PadelAssessmentPillar.SERVE,
            sequenceIndex: 3,
          },
          {
            pointValue: 6,
            pillar: PadelAssessmentPillar.RETURN,
            sequenceIndex: 4,
          },
        ],
      });

      const result = await service.submitAnswer(
        'user-1',
        'session-1',
        'VOLLEY_BASIC',
        'F',
      );

      expect('complete' in result && result.complete).toBe(true);
      if ('complete' in result) {
        // avg points = (2+6+6+6+6+6)/6 = 5.33 -> level 6.2
        expect(result.level).toBe(6.2);
        expect(result.skillBreakdown[PadelAssessmentPillar.VOLLEY]).toBe(6);
      }
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.padelProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'profile-1' },
          data: expect.objectContaining({ systemSuggestedLevel: 6.2 }),
        }),
      );
    });
  });
});
