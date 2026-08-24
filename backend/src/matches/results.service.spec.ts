import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ResultsService } from './results.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from './matches.service';

type MockPrisma = {
  match: Record<string, jest.Mock>;
  matchResult: Record<string, jest.Mock>;
  matchReflection: Record<string, jest.Mock>;
  tennisProfile: Record<string, jest.Mock>;
  padelProfile: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createMockPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    match: { update: jest.fn().mockResolvedValue({}) },
    matchResult: {
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    matchReflection: { upsert: jest.fn().mockResolvedValue({}) },
    tennisProfile: { update: jest.fn().mockResolvedValue({}) },
    padelProfile: { update: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return (arg as (tx: MockPrisma) => Promise<unknown>)(prisma);
  });

  return prisma;
}

function user(
  id: string,
  rating?: { singlesRating?: number; doublesRating?: number },
) {
  return {
    id,
    firstName: 'Test',
    lastName: id,
    tennisProfile: {
      singlesRating: rating?.singlesRating ?? null,
      doublesRating: rating?.doublesRating ?? null,
      userSelectedLevel: 4.0,
    },
    padelProfile: {
      singlesRating: rating?.singlesRating ?? null,
      doublesRating: rating?.doublesRating ?? null,
      systemSuggestedLevel: 4.0,
    },
  };
}

function participant(
  userId: string,
  side: 'A' | 'B',
  overrides: {
    rating?: { singlesRating?: number; doublesRating?: number };
  } = {},
) {
  return {
    userId,
    side,
    role: 'CHALLENGER',
    status: 'ACCEPTED',
    user: user(userId, overrides.rating),
  };
}

function matchRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    format: 'SINGLES',
    sport: 'TENNIS',
    state: 'SCHEDULED',
    conversation: { id: 'c1' },
    participants: [participant('a', 'A'), participant('b', 'B')],
    result: null,
    ...overrides,
  };
}

const futureSets = [{ sideAGames: 6, sideBGames: 3 }];

describe('ResultsService', () => {
  let service: ResultsService;
  let prisma: MockPrisma;
  let matches: { [K in keyof MatchesService]?: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrisma();
    matches = {
      loadForParticipant: jest.fn(),
      loadMatch: jest.fn(),
      assertLive: jest.fn((m: { state: string }) => m.state),
      displayName: jest.fn((u: { firstName: string }) => u.firstName),
      announce: jest.fn().mockResolvedValue(undefined),
      notifyOthers: jest.fn().mockResolvedValue(undefined),
    };
    service = new ResultsService(
      prisma as unknown as PrismaService,
      matches as unknown as MatchesService,
    );
  });

  describe('submit', () => {
    it('rejects submitting before the match is scheduled', async () => {
      const match = matchRecord({ state: 'SCHEDULING' });
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[0],
      });

      await expect(
        service.submit('a', 'm1', {
          outcome: 'SCORE',
          sets: futureSets,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a second submission', async () => {
      const match = matchRecord({ result: { id: 'r1' } });
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[0],
      });

      await expect(
        service.submit('a', 'm1', {
          outcome: 'SCORE',
          sets: futureSets,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('derives winningSide from the sets server-side', async () => {
      const match = matchRecord();
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[0],
      });
      matches.loadMatch!.mockResolvedValue(match);

      await service.submit('a', 'm1', {
        outcome: 'SCORE',
        sets: futureSets,
      });

      expect(prisma.matchResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'PENDING_CONFIRMATION',
          winningSide: 'A',
          submittedById: 'a',
        }),
      });
    });

    it('requires a winner to be named for a retirement', async () => {
      const match = matchRecord();
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[0],
      });

      await expect(
        service.submit('a', 'm1', { outcome: 'RETIREMENT' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('confirm', () => {
    it('404s when there is nothing to confirm', async () => {
      const match = matchRecord();
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[0],
      });
      await expect(service.confirm('b', 'm1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects a confirmer on the submitter’s own side', async () => {
      const match = matchRecord({
        result: {
          status: 'PENDING_CONFIRMATION',
          outcome: 'SCORE',
          sets: futureSets,
          winningSide: 'A',
          submittedById: 'a',
        },
      });
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[0],
      });

      await expect(service.confirm('a', 'm1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('applies a singles rating change and settles to COMPLETED', async () => {
      const match = matchRecord({
        participants: [
          participant('a', 'A', { rating: { singlesRating: 4.0 } }),
          participant('b', 'B', { rating: { singlesRating: 4.0 } }),
        ],
        result: {
          status: 'PENDING_CONFIRMATION',
          outcome: 'SCORE',
          sets: futureSets,
          winningSide: 'A',
          submittedById: 'a',
        },
      });
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[1],
      });
      matches.loadMatch!.mockResolvedValue(match);

      await service.confirm('b', 'm1');

      // Winner's rating goes up, loser's goes down, by equal magnitude.
      const [winnerUpdate, loserUpdate] =
        prisma.tennisProfile.update.mock.calls;
      expect(winnerUpdate[0].where.userId).toBe('a');
      expect(winnerUpdate[0].data.singlesRating).toBeGreaterThan(4.0);
      expect(loserUpdate[0].where.userId).toBe('b');
      expect(loserUpdate[0].data.singlesRating).toBeLessThan(4.0);

      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { state: 'COMPLETED' },
      });
      const resultUpdate = prisma.matchResult.update.mock.calls[0][0];
      expect(resultUpdate.data.status).toBe('CONFIRMED');
      expect(resultUpdate.data.ratingDeltaA).toBeGreaterThan(0);
    });

    it('applies a Padel match’s rating change to PadelProfile, not TennisProfile', async () => {
      const match = matchRecord({
        sport: 'PADEL',
        participants: [
          participant('a', 'A', { rating: { singlesRating: 4.0 } }),
          participant('b', 'B', { rating: { singlesRating: 4.0 } }),
        ],
        result: {
          status: 'PENDING_CONFIRMATION',
          outcome: 'SCORE',
          sets: futureSets,
          winningSide: 'A',
          submittedById: 'a',
        },
      });
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[1],
      });
      matches.loadMatch!.mockResolvedValue(match);

      await service.confirm('b', 'm1');

      expect(prisma.tennisProfile.update).not.toHaveBeenCalled();
      const [winnerUpdate, loserUpdate] = prisma.padelProfile.update.mock.calls;
      expect(winnerUpdate[0].where.userId).toBe('a');
      expect(winnerUpdate[0].data.singlesRating).toBeGreaterThan(4.0);
      expect(loserUpdate[0].where.userId).toBe('b');
      expect(loserUpdate[0].data.singlesRating).toBeLessThan(4.0);
    });

    it('rates nobody on a walkover in favour of neither player', async () => {
      const match = matchRecord({
        result: {
          status: 'PENDING_CONFIRMATION',
          outcome: 'WALKOVER',
          sets: null,
          winningSide: null,
          submittedById: 'a',
        },
      });
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[1],
      });
      matches.loadMatch!.mockResolvedValue(match);

      await service.confirm('b', 'm1');

      expect(prisma.tennisProfile.update).not.toHaveBeenCalled();
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { state: 'WALKOVER' },
      });
    });
  });

  describe('dispute', () => {
    it('rejects a disputer on the submitter’s own side', async () => {
      const match = matchRecord({
        result: {
          status: 'PENDING_CONFIRMATION',
          outcome: 'SCORE',
          sets: futureSets,
          winningSide: 'A',
          submittedById: 'a',
        },
      });
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[0],
      });

      await expect(
        service.dispute('a', 'm1', {
          outcome: 'SCORE',
          sets: futureSets,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('stores the disputer’s own version and moves the match to DISPUTED', async () => {
      const match = matchRecord({
        result: {
          status: 'PENDING_CONFIRMATION',
          outcome: 'SCORE',
          sets: futureSets,
          winningSide: 'A',
          submittedById: 'a',
        },
      });
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[1],
      });
      matches.loadMatch!.mockResolvedValue(match);

      const counterSets = [{ sideAGames: 3, sideBGames: 6 }];
      await service.dispute('b', 'm1', {
        outcome: 'SCORE',
        sets: counterSets,
      });

      expect(prisma.matchResult.update).toHaveBeenCalledWith({
        where: { matchId: 'm1' },
        data: expect.objectContaining({
          status: 'DISPUTED',
          disputedById: 'b',
          disputantWinningSide: 'B',
        }),
      });
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { state: 'DISPUTED' },
      });
    });
  });

  describe('resubmit', () => {
    function disputedMatch() {
      return matchRecord({
        state: 'DISPUTED',
        result: {
          status: 'DISPUTED',
          outcome: 'SCORE',
          sets: futureSets,
          winningSide: 'A',
          submittedById: 'a',
          disputedById: 'b',
          disputantOutcome: 'SCORE',
          disputantSets: [{ sideAGames: 3, sideBGames: 6 }],
          disputantWinningSide: 'B',
        },
      });
    }

    it('rejects resubmitting when there is no open dispute', async () => {
      const match = matchRecord({ state: 'SCHEDULED', result: null });
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[0],
      });

      await expect(
        service.resubmit('a', 'm1', {
          outcome: 'SCORE',
          sets: futureSets,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('auto-resolves once both versions match', async () => {
      const match = disputedMatch();
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[0],
      });
      matches.loadMatch!.mockResolvedValue(match);

      // Submitter (side A) revises to match the disputer's version exactly.
      await service.resubmit('a', 'm1', {
        outcome: 'SCORE',
        sets: [{ sideAGames: 3, sideBGames: 6 }] as never,
      });

      const resultUpdate = prisma.matchResult.update.mock.calls[0][0];
      expect(resultUpdate.data.status).toBe('CONFIRMED');
      expect(resultUpdate.data.confirmedById).toBe('b');
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { state: 'COMPLETED' },
      });
    });

    it('stays disputed when the revised version still disagrees', async () => {
      const match = disputedMatch();
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[0],
      });
      matches.loadMatch!.mockResolvedValue(match);

      await service.resubmit('a', 'm1', {
        outcome: 'SCORE',
        sets: [{ sideAGames: 7, sideBGames: 5 }] as never,
      });

      expect(prisma.matchResult.update).toHaveBeenCalledWith({
        where: { matchId: 'm1' },
        data: expect.objectContaining({ outcome: 'SCORE' }),
      });
      expect(prisma.match.update).not.toHaveBeenCalled();
    });
  });

  describe('adminResolveDispute (Phase M14)', () => {
    function disputedMatch() {
      return matchRecord({
        state: 'DISPUTED',
        result: {
          status: 'DISPUTED',
          outcome: 'SCORE',
          sets: futureSets,
          winningSide: 'A',
          submittedById: 'a',
          disputedById: 'b',
          disputantOutcome: 'SCORE',
          disputantSets: [{ sideAGames: 3, sideBGames: 6 }],
          disputantWinningSide: 'B',
        },
      });
    }

    it('rejects ruling on a match with no open dispute', async () => {
      matches.loadMatch!.mockResolvedValue(matchRecord({ state: 'SCHEDULED' }));
      await expect(
        service.adminResolveDispute('m1', 'admin-1', 'SUBMITTED'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('a SUBMITTED ruling settles in favour of the original submitter’s version', async () => {
      const match = disputedMatch();
      matches.loadMatch!.mockResolvedValue(match);

      await service.adminResolveDispute('m1', 'admin-1', 'SUBMITTED');

      expect(prisma.matchResult.update).toHaveBeenCalledWith({
        where: { matchId: 'm1' },
        data: expect.objectContaining({
          status: 'CONFIRMED',
          confirmedById: 'admin-1',
          winningSide: 'A',
        }),
      });
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { state: 'COMPLETED' },
      });
    });

    it('a DISPUTANT ruling settles in favour of the disputer’s version instead', async () => {
      const match = disputedMatch();
      matches.loadMatch!.mockResolvedValue(match);

      await service.adminResolveDispute('m1', 'admin-1', 'DISPUTANT');

      expect(prisma.matchResult.update).toHaveBeenCalledWith({
        where: { matchId: 'm1' },
        data: expect.objectContaining({
          status: 'CONFIRMED',
          winningSide: 'B',
        }),
      });
    });
  });

  describe('submitReflection', () => {
    it('rejects a reflection before the match is settled', async () => {
      const match = matchRecord({ state: 'SCHEDULED' });
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[0],
      });

      await expect(
        service.submitReflection('a', 'm1', { confidence: 4 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('upserts once the match is settled', async () => {
      const match = matchRecord({ state: 'COMPLETED' });
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[0],
      });

      await service.submitReflection('a', 'm1', {
        confidence: 4,
        notes: 'Felt good',
      });

      expect(prisma.matchReflection.upsert).toHaveBeenCalledWith({
        where: { matchId_userId: { matchId: 'm1', userId: 'a' } },
        create: {
          matchId: 'm1',
          userId: 'a',
          confidence: 4,
          notes: 'Felt good',
        },
        update: { confidence: 4, notes: 'Felt good' },
      });
    });
  });
  // ------------------------------------------------------- notification wiring
  //
  // ResultsService fired nothing at all before Wave 1.4 — a submitted score
  // reached the opponent only if they opened the match thread.

  describe('notification triggers', () => {
    const callFor = (index: number) =>
      matches.notifyOthers!.mock.calls[index] as unknown[];

    const scheduled = () => matchRecord();

    const pending = (submittedById: string) =>
      matchRecord({
        result: {
          status: 'PENDING_CONFIRMATION',
          outcome: 'SCORE',
          sets: futureSets,
          winningSide: 'A',
          submittedById,
        },
      });

    it('tells the other side to review a submitted result', async () => {
      const match = scheduled();
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[0],
      });
      matches.loadMatch!.mockResolvedValue(match);

      await service.submit('a', 'm1', {
        outcome: 'SCORE',
        sets: futureSets,
      } as never);

      const [, except, title, body] = callFor(0);
      expect(except).toBe('a');
      expect(title).toContain('submitted a result');
      expect(body).toContain('confirm or dispute');
    });

    it('tells the submitter their result was confirmed', async () => {
      const match = pending('a');
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[1],
      });
      matches.loadMatch!.mockResolvedValue(match);

      await service.confirm('b', 'm1');

      const [, except, title] = callFor(0);
      expect(except).toBe('b');
      expect(title).toContain('confirmed your result');
    });

    it('tells the submitter their result was disputed', async () => {
      const match = pending('a');
      matches.loadForParticipant!.mockResolvedValue({
        match,
        participant: match.participants[1],
      });
      matches.loadMatch!.mockResolvedValue(match);

      await service.dispute('b', 'm1', {
        outcome: 'SCORE',
        sets: [{ sideAGames: 3, sideBGames: 6 }],
      } as never);

      const [, except, title] = callFor(0);
      expect(except).toBe('b');
      expect(title).toContain('disputed the result');
    });

    it('notifies every player when an admin rules, because the admin is not one', async () => {
      const disputed = matchRecord({
        state: 'DISPUTED',
        result: {
          status: 'DISPUTED',
          outcome: 'SCORE',
          sets: futureSets,
          winningSide: 'A',
          submittedById: 'a',
          disputedById: 'b',
          disputantOutcome: 'SCORE',
          disputantSets: [{ sideAGames: 3, sideBGames: 6 }],
          disputantWinningSide: 'B',
        },
      });
      matches.loadMatch!.mockResolvedValue(disputed);

      await service.adminResolveDispute('m1', 'admin-user', 'SUBMITTED');

      const [, except, title] = callFor(0);
      // null, not 'admin-user' — otherwise a participant would be skipped
      // only when their id happened to match the admin's.
      expect(except).toBeNull();
      expect(title).toContain('club admin ruled');
    });
  });
});
