import { NotFoundException } from '@nestjs/common';
import { HomeService } from './home.service';
import { PrismaService } from '../prisma/prisma.service';
import { LearningService } from '../learning/learning.service';

type MockPrisma = {
  tennisProfile: Record<string, jest.Mock>;
};

function createMockPrisma(): MockPrisma {
  return {
    tennisProfile: { findUnique: jest.fn() },
  };
}

type MockLearning = { getSkillProfile: jest.Mock };

function createMockLearning(): MockLearning {
  return {
    getSkillProfile: jest.fn().mockResolvedValue({
      skills: [],
      weakestSkill: null,
      recommendations: [],
    }),
  };
}

function baseProfile(overrides: Record<string, unknown> = {}) {
  return {
    userSelectedLevel: null,
    systemSuggestedLevel: null,
    onboardingGoals: [] as string[],
    formatPreference: null,
    stylePreference: null,
    padelInterest: null,
    availabilitySlots: [] as unknown[],
    ...overrides,
  };
}

describe('HomeService', () => {
  let service: HomeService;
  let prisma: MockPrisma;
  let learning: MockLearning;

  beforeEach(() => {
    prisma = createMockPrisma();
    learning = createMockLearning();
    service = new HomeService(
      prisma as unknown as PrismaService,
      learning as unknown as LearningService,
    );
  });

  it('throws NotFoundException when the tennis profile is missing', async () => {
    prisma.tennisProfile.findUnique.mockResolvedValue(null);
    await expect(service.getFeed('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('falls back to a single EMPTY_FALLBACK card when nothing qualifies', async () => {
    prisma.tennisProfile.findUnique.mockResolvedValue(baseProfile());
    const { cards } = await service.getFeed('user-1');
    expect(cards).toHaveLength(1);
    expect(cards[0].type).toBe('EMPTY_FALLBACK');
  });

  it('includes the level card with the correct label, preferring userSelectedLevel', async () => {
    prisma.tennisProfile.findUnique.mockResolvedValue(
      baseProfile({ userSelectedLevel: 3.0, systemSuggestedLevel: 6.0 }),
    );
    const { cards } = await service.getFeed('user-1');
    const levelCard = cards.find((c) => c.type === 'LEVEL_SUMMARY');
    expect(levelCard).toBeDefined();
    expect(levelCard!.title).toContain('3.0');
    expect(levelCard!.title).toContain('Foundational');
  });

  it('falls back to systemSuggestedLevel when userSelectedLevel is unset', async () => {
    prisma.tennisProfile.findUnique.mockResolvedValue(
      baseProfile({ systemSuggestedLevel: 6.0 }),
    );
    const { cards } = await service.getFeed('user-1');
    const levelCard = cards.find((c) => c.type === 'LEVEL_SUMMARY');
    expect(levelCard!.title).toContain('6.0');
    expect(levelCard!.title).toContain('Advanced');
  });

  it('omits the goals card when onboardingGoals is empty', async () => {
    prisma.tennisProfile.findUnique.mockResolvedValue(
      baseProfile({ userSelectedLevel: 3.0, onboardingGoals: [] }),
    );
    const { cards } = await service.getFeed('user-1');
    expect(cards.find((c) => c.type === 'GOALS_SUMMARY')).toBeUndefined();
  });

  it('includes the goals card when goals were captured', async () => {
    prisma.tennisProfile.findUnique.mockResolvedValue(
      baseProfile({ onboardingGoals: ['Improve serve', 'Play more matches'] }),
    );
    const { cards } = await service.getFeed('user-1');
    const goalsCard = cards.find((c) => c.type === 'GOALS_SUMMARY');
    expect(goalsCard!.body).toBe('Improve serve • Play more matches');
  });

  it('omits the padel teaser when padelInterest is NO', async () => {
    prisma.tennisProfile.findUnique.mockResolvedValue(
      baseProfile({ userSelectedLevel: 3.0, padelInterest: 'NO' }),
    );
    const { cards } = await service.getFeed('user-1');
    expect(cards.find((c) => c.type === 'PADEL_TEASER')).toBeUndefined();
  });

  it.each(['YES', 'WANT_TO_LEARN'])(
    'includes the padel teaser when padelInterest is %s',
    async (padelInterest) => {
      prisma.tennisProfile.findUnique.mockResolvedValue(
        baseProfile({ padelInterest }),
      );
      const { cards } = await service.getFeed('user-1');
      expect(cards.find((c) => c.type === 'PADEL_TEASER')).toBeDefined();
    },
  );

  it('omits the development recommendation card when there is nothing to recommend', async () => {
    prisma.tennisProfile.findUnique.mockResolvedValue(
      baseProfile({ userSelectedLevel: 3.0 }),
    );
    const { cards } = await service.getFeed('user-1');
    expect(
      cards.find((c) => c.type === 'DEVELOPMENT_RECOMMENDATION'),
    ).toBeUndefined();
  });

  it('includes the development recommendation card when learning has a real suggestion', async () => {
    learning.getSkillProfile.mockResolvedValue({
      skills: [],
      weakestSkill: 'BACKHAND',
      recommendations: [{ id: 'c1', type: 'DRILL', title: 'Backhand basics' }],
    });
    prisma.tennisProfile.findUnique.mockResolvedValue(
      baseProfile({ userSelectedLevel: 3.0 }),
    );
    const { cards } = await service.getFeed('user-1');
    const card = cards.find((c) => c.type === 'DEVELOPMENT_RECOMMENDATION');
    expect(card).toBeDefined();
    expect(card!.title).toContain('backhand');
    expect(card!.body).toContain('Backhand basics');
  });

  it('orders cards by ascending priority', async () => {
    prisma.tennisProfile.findUnique.mockResolvedValue(
      baseProfile({
        userSelectedLevel: 3.0,
        onboardingGoals: ['Improve serve'],
        formatPreference: 'SINGLES',
        padelInterest: 'YES',
      }),
    );
    const { cards } = await service.getFeed('user-1');
    const priorities = cards.map((c) => c.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
    expect(cards.map((c) => c.type)).toEqual([
      'LEVEL_SUMMARY',
      'GOALS_SUMMARY',
      'PLAY_STYLE_SUMMARY',
      'PADEL_TEASER',
    ]);
  });
});
