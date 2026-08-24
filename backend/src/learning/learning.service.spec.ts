import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LearningService } from './learning.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  tennisProfile: Record<string, jest.Mock>;
  assessmentSession: Record<string, jest.Mock>;
  practiceSession: Record<string, jest.Mock>;
  learningContent: Record<string, jest.Mock>;
  learningContentCompletion: Record<string, jest.Mock>;
  goal: Record<string, jest.Mock>;
  goalMilestone: Record<string, jest.Mock>;
};

function createMockPrisma(): MockPrisma {
  return {
    tennisProfile: { findUnique: jest.fn() },
    assessmentSession: { findFirst: jest.fn(), findMany: jest.fn() },
    practiceSession: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    learningContent: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    learningContentCompletion: { upsert: jest.fn() },
    goal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    goalMilestone: { update: jest.fn() },
  };
}

const profile = { id: 'profile-1', userId: 'user-1' };

describe('LearningService', () => {
  let service: LearningService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new LearningService(prisma as unknown as PrismaService);
    prisma.tennisProfile.findUnique.mockResolvedValue(profile);
    prisma.assessmentSession.findFirst.mockResolvedValue(null);
  });

  describe('getSkillProfile', () => {
    it('throws when the viewer has no tennis profile', async () => {
      prisma.tennisProfile.findUnique.mockResolvedValue(null);
      await expect(service.getSkillProfile('user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns null scores and no weakest skill when there is no data at all', async () => {
      const result = await service.getSkillProfile('user-1');
      expect(result.skills).toHaveLength(7);
      expect(result.skills.every((s) => s.score === null)).toBe(true);
      expect(result.weakestSkill).toBeNull();
      expect(result.recommendations).toEqual([]);
    });

    it('surfaces recommendations for the weakest skill once assessment data exists', async () => {
      prisma.assessmentSession.findFirst.mockResolvedValue({
        resultSkillBreakdown: { FOREHAND: 5, BACKHAND: 1 },
        branch: 'BEGINNER',
      });
      prisma.learningContent.findMany.mockResolvedValue([
        {
          id: 'c1',
          type: 'DRILL',
          targetSkill: 'BACKHAND',
          branch: 'BEGINNER',
          sport: 'TENNIS',
          title: 'Backhand basics',
          summary: null,
          durationMinutes: 10,
        },
      ]);

      const result = await service.getSkillProfile('user-1');
      expect(result.weakestSkill).toBe('BACKHAND');
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].id).toBe('c1');
    });
  });

  describe('getSkillDetail', () => {
    it('rejects a skill that is not one of the seven dimensions', async () => {
      await expect(
        service.getSkillDetail('user-1', 'COMPETITION_EXPERIENCE'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns the "Not enough data" shape (null score) for an untouched skill', async () => {
      const result = await service.getSkillDetail('user-1', 'SERVE');
      expect(result.score).toBeNull();
      expect(result.assessmentBaseline).toBeNull();
      expect(result.practiceSessions).toEqual([]);
    });
  });

  describe('logPracticeSession', () => {
    const dto = {
      occurredAt: new Date(),
      durationMinutes: 30,
      skillFocus: 'FOREHAND' as const,
      perceivedPerformance: 4,
    };

    it('throws when a drillId is given but no matching published drill exists', async () => {
      prisma.learningContent.findFirst.mockResolvedValue(null);
      await expect(
        service.logPracticeSession('user-1', { ...dto, drillId: 'missing' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates a session without requiring a drill', async () => {
      prisma.practiceSession.create.mockResolvedValue({
        id: 's1',
        occurredAt: dto.occurredAt,
        durationMinutes: 30,
        skillFocus: 'FOREHAND',
        notes: null,
        perceivedPerformance: 4,
        drill: null,
      });
      const result = await service.logPracticeSession('user-1', dto);
      expect(result.id).toBe('s1');
      expect(prisma.practiceSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tennisProfileId: 'profile-1' }),
        }),
      );
    });
  });

  describe('createGoal', () => {
    it('snapshots the current computed score as the baseline', async () => {
      prisma.assessmentSession.findFirst.mockResolvedValue({
        resultSkillBreakdown: { SERVE: 3 },
        branch: 'BEGINNER',
      });
      prisma.goal.create.mockResolvedValue({
        id: 'g1',
        skill: 'SERVE',
        baseline: 3,
        target: 5,
        deadline: null,
        achievedAt: null,
        createdAt: new Date(),
        milestones: [],
      });

      await service.createGoal('user-1', { skill: 'SERVE', target: 5 });

      expect(prisma.goal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ baseline: 3, target: 5 }),
        }),
      );
    });

    it('defaults baseline to 0 when there is no data yet for that skill', async () => {
      prisma.goal.create.mockResolvedValue({
        id: 'g1',
        skill: 'SERVE',
        baseline: 0,
        target: 5,
        deadline: null,
        achievedAt: null,
        createdAt: new Date(),
        milestones: [],
      });

      await service.createGoal('user-1', { skill: 'SERVE', target: 5 });

      expect(prisma.goal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ baseline: 0 }),
        }),
      );
    });
  });

  describe('getGoal', () => {
    it('throws when the goal does not belong to the viewer', async () => {
      prisma.goal.findFirst.mockResolvedValue(null);
      await expect(
        service.getGoal('user-1', 'not-mine'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('derives status from the current score rather than a stored field', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        id: 'g1',
        skill: 'SERVE',
        baseline: 2,
        target: 4,
        deadline: null,
        achievedAt: null,
        createdAt: new Date(),
        milestones: [],
      });
      prisma.assessmentSession.findFirst.mockResolvedValue({
        resultSkillBreakdown: { SERVE: 4 },
        branch: null,
      });

      const result = await service.getGoal('user-1', 'g1');
      expect(result.status).toBe('ACHIEVED');
    });
  });

  describe('completeMilestone', () => {
    it('throws when the milestone does not belong to the goal', async () => {
      prisma.goal.findFirst.mockResolvedValue({
        id: 'g1',
        skill: 'SERVE',
        baseline: 0,
        target: 5,
        deadline: null,
        achievedAt: null,
        createdAt: new Date(),
        milestones: [{ id: 'm1', label: 'x', achievedAt: null }],
      });
      await expect(
        service.completeMilestone('user-1', 'g1', 'wrong-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
