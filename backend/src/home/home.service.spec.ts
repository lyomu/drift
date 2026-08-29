import { NotFoundException } from '@nestjs/common';
import { HomeService } from './home.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  HOME_CARD_PRIORITY,
  type HomeCard,
  type HomeCardType,
} from './home-card';
import type { HomeCardContributor } from './contributors/home-contributor';

/**
 * These cover `HomeService`'s job, which after the contributor refactor is
 * *orchestration*: resolve context once, fan out, filter dismissals, order by
 * priority, and never let one contributor take the screen down. What each
 * card decides to emit is tested in that contributor's own spec.
 */

type MockPrisma = {
  tennisProfile: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
  dismissedHomeCard: { findMany: jest.Mock; upsert: jest.Mock };
};

function createMockPrisma(): MockPrisma {
  return {
    tennisProfile: { findUnique: jest.fn() },
    user: { findUnique: jest.fn().mockResolvedValue({ firstName: 'Ana' }) },
    dismissedHomeCard: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
    },
  };
}

function card(type: HomeCardType, id = type.toLowerCase()): HomeCard {
  return {
    id,
    type,
    priority: HOME_CARD_PRIORITY[type],
    title: `${type} title`,
    body: '',
    accent: 'neutral',
    action: null,
    dismissible: true,
    data: null,
  };
}

function stub(key: string, cards: HomeCard[] = []): HomeCardContributor {
  return { key, contribute: jest.fn().mockResolvedValue(cards) };
}

/**
 * The constructor takes its 13 contributors positionally. Building them here
 * keeps each test to the one or two it actually cares about.
 */
function createService(
  prisma: MockPrisma,
  contributors: HomeCardContributor[],
) {
  const filled = [...contributors];
  while (filled.length < 13) filled.push(stub(`filler-${filled.length}`));

  return new HomeService(
    prisma as unknown as PrismaService,
    ...(filled as unknown as [
      HomeCardContributor,
      HomeCardContributor,
      HomeCardContributor,
      HomeCardContributor,
      HomeCardContributor,
      HomeCardContributor,
      HomeCardContributor,
      HomeCardContributor,
      HomeCardContributor,
      HomeCardContributor,
      HomeCardContributor,
      HomeCardContributor,
      HomeCardContributor,
    ]),
  );
}

const profile = { padelInterest: null, availabilitySlots: [] };

describe('HomeService', () => {
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    prisma.tennisProfile.findUnique.mockResolvedValue(profile);
  });

  it('throws NotFoundException when the tennis profile is missing', async () => {
    prisma.tennisProfile.findUnique.mockResolvedValue(null);
    const service = createService(prisma, []);
    await expect(service.getFeed('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('falls back to a single EMPTY_FALLBACK card when nothing qualifies', async () => {
    const service = createService(prisma, []);
    const { cards } = await service.getFeed('user-1');
    expect(cards).toHaveLength(1);
    expect(cards[0].type).toBe('EMPTY_FALLBACK');
    // The fallback must still give the user somewhere to go.
    expect(cards[0].action).not.toBeNull();
  });

  it('orders cards by ascending priority regardless of contributor order', async () => {
    const service = createService(prisma, [
      stub('news', [card('NEWS_HIGHLIGHT')]),
      stub('unconfirmed', [card('UNCONFIRMED_RESULT')]),
      stub('courts', [card('NEARBY_COURTS')]),
      stub('challenge', [card('INCOMING_CHALLENGE')]),
    ]);

    const { cards } = await service.getFeed('user-1');
    expect(cards.map((c) => c.type)).toEqual([
      'UNCONFIRMED_RESULT',
      'INCOMING_CHALLENGE',
      'NEARBY_COURTS',
      'NEWS_HIGHLIGHT',
    ]);
  });

  it('keeps the rest of the feed when one contributor throws', async () => {
    const exploding: HomeCardContributor = {
      key: 'exploding',
      contribute: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const service = createService(prisma, [
      exploding,
      stub('upcoming', [card('UPCOMING_MATCH')]),
    ]);

    const { cards } = await service.getFeed('user-1');
    // Degrades to "that card is absent", never an error on the screen every
    // user lands on.
    expect(cards.map((c) => c.type)).toEqual(['UPCOMING_MATCH']);
  });

  it('filters out cards the user has dismissed', async () => {
    prisma.dismissedHomeCard.findMany.mockResolvedValue([
      { cardId: 'nearby_courts' },
    ]);
    const service = createService(prisma, [
      stub('courts', [card('NEARBY_COURTS')]),
      stub('news', [card('NEWS_HIGHLIGHT')]),
    ]);

    const { cards } = await service.getFeed('user-1');
    expect(cards.map((c) => c.type)).toEqual(['NEWS_HIGHLIGHT']);
  });

  it('shows the fallback when every card has been dismissed', async () => {
    prisma.dismissedHomeCard.findMany.mockResolvedValue([
      { cardId: 'nearby_courts' },
    ]);
    const service = createService(prisma, [
      stub('courts', [card('NEARBY_COURTS')]),
    ]);

    const { cards } = await service.getFeed('user-1');
    expect(cards.map((c) => c.type)).toEqual(['EMPTY_FALLBACK']);
  });

  it('gives every contributor the same `now`', async () => {
    const a = stub('a');
    const b = stub('b');
    const service = createService(prisma, [a, b]);

    await service.getFeed('user-1');

    const ctxA = (a.contribute as jest.Mock).mock.calls[0][0] as {
      now: Date;
    };
    const ctxB = (b.contribute as jest.Mock).mock.calls[0][0] as {
      now: Date;
    };
    expect(ctxA.now).toBe(ctxB.now);
  });

  describe('dismissCard', () => {
    it('records a permanent dismissal when no snooze is given', async () => {
      const service = createService(prisma, []);
      const result = await service.dismissCard('user-1', 'nearby_courts');

      expect(result.snoozedUntil).toBeNull();
      expect(prisma.dismissedHomeCard.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_cardId: { userId: 'user-1', cardId: 'nearby_courts' },
          },
          create: {
            userId: 'user-1',
            cardId: 'nearby_courts',
            snoozedUntil: null,
          },
        }),
      );
    });

    it('records a future expiry when snoozed', async () => {
      const service = createService(prisma, []);
      const before = Date.now();
      const result = await service.dismissCard('user-1', 'news_highlight', 24);

      expect(result.snoozedUntil).toBeInstanceOf(Date);
      expect(result.snoozedUntil!.getTime()).toBeGreaterThan(before);
    });
  });

  describe('getSummary', () => {
    it('prefers userSelectedLevel over the system suggestion', async () => {
      prisma.tennisProfile.findUnique.mockResolvedValue({
        userSelectedLevel: 3.0,
        systemSuggestedLevel: 6.0,
        singlesRating: null,
        doublesRating: null,
        onboardingGoals: [],
      });

      const service = createService(prisma, []);
      const summary = await service.getSummary('user-1');
      expect(summary.level).toBe(3.0);
      expect(summary.levelLabel).toBe('Foundational');
    });

    it('reports a null level rather than inventing a default', async () => {
      prisma.tennisProfile.findUnique.mockResolvedValue({
        userSelectedLevel: null,
        systemSuggestedLevel: null,
        singlesRating: null,
        doublesRating: null,
        onboardingGoals: [],
      });

      const service = createService(prisma, []);
      const summary = await service.getSummary('user-1');
      expect(summary.level).toBeNull();
      expect(summary.levelLabel).toBeNull();
    });
  });
});
