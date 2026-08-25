import { BadRequestException } from '@nestjs/common';
import { CompetitionsService } from './competitions.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { NotificationsService } from '../notifications/notifications.service';

interface MockPrisma {
  league: Record<string, jest.Mock>;
  season: Record<string, jest.Mock>;
  seasonRegistration: Record<string, jest.Mock>;
  round: Record<string, jest.Mock>;
  fixture: Record<string, jest.Mock>;
  standing: Record<string, jest.Mock>;
  match: Record<string, jest.Mock>;
  user: Record<string, jest.Mock>;
  $transaction: jest.Mock;
}

function createMockPrisma(): MockPrisma {
  const prisma = {
    league: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    season: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    seasonRegistration: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      upsert: jest.fn().mockResolvedValue({ status: 'ENROLLED' }),
      updateMany: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    round: {
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    fixture: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    standing: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
    },
    match: { update: jest.fn().mockResolvedValue({}) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return (arg as (tx: MockPrisma) => Promise<unknown>)(prisma);
  });

  return prisma;
}

const HOUR = 60 * 60 * 1000;

function baseSeason(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    id: 's1',
    leagueId: 'l1',
    label: 'Season 1',
    registrationOpensAt: new Date(now - 2 * HOUR),
    registrationClosesAt: new Date(now - HOUR),
    startsAt: new Date(now - 30 * 60 * 1000),
    roundCount: 3,
    roundIntervalMinutes: 60,
    capacity: null,
    cancelledAt: null,
    league: { name: 'Test League', format: 'SINGLES' },
    ...overrides,
  };
}

describe('CompetitionsService', () => {
  let service: CompetitionsService;
  let prisma: MockPrisma;
  let matches: { [K in keyof MatchesService]?: jest.Mock };
  let notifications: { [K in keyof NotificationsService]?: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrisma();
    matches = {
      displayName: jest.fn((u: { firstName: string }) => u.firstName),
      createFixtureMatch: jest.fn().mockResolvedValue({ id: 'match-new' }),
      loadMatch: jest.fn().mockResolvedValue({ id: 'm1' }),
      announce: jest.fn().mockResolvedValue(undefined),
    };
    notifications = { create: jest.fn().mockResolvedValue(undefined) };
    service = new CompetitionsService(
      prisma as unknown as PrismaService,
      matches as unknown as MatchesService,
      notifications as unknown as NotificationsService,
    );
  });

  describe('register', () => {
    it('rejects when registration is not open', async () => {
      prisma.season.findUnique.mockResolvedValue(
        baseSeason({
          registrationOpensAt: new Date(Date.now() + HOUR),
          registrationClosesAt: new Date(Date.now() + 2 * HOUR),
          startsAt: new Date(Date.now() + 3 * HOUR),
        }),
      );

      await expect(service.register('u1', 's1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a duplicate registration', async () => {
      prisma.season.findUnique.mockResolvedValue(
        baseSeason({
          registrationOpensAt: new Date(Date.now() - HOUR),
          registrationClosesAt: new Date(Date.now() + HOUR),
          startsAt: new Date(Date.now() + 2 * HOUR),
        }),
      );
      prisma.seasonRegistration.findUnique.mockResolvedValue({
        status: 'ENROLLED',
      });

      await expect(service.register('u1', 's1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('enrolls when under capacity', async () => {
      prisma.season.findUnique.mockResolvedValue(
        baseSeason({
          registrationOpensAt: new Date(Date.now() - HOUR),
          registrationClosesAt: new Date(Date.now() + HOUR),
          startsAt: new Date(Date.now() + 2 * HOUR),
          capacity: 4,
        }),
      );
      prisma.seasonRegistration.findUnique.mockResolvedValue(null);
      prisma.seasonRegistration.count.mockResolvedValue(2);
      prisma.seasonRegistration.upsert.mockResolvedValue({
        id: 'reg-1',
        status: 'ENROLLED',
      });

      await service.register('u1', 's1');

      expect(prisma.seasonRegistration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: 'ENROLLED' }),
        }),
      );
      expect(notifications.create).toHaveBeenCalledWith(
        'u1',
        'COMPETITIONS',
        "You're registered",
        expect.any(String),
        'SEASON',
        's1',
      );
    });

    it('waitlists once capacity is reached', async () => {
      prisma.season.findUnique.mockResolvedValue(
        baseSeason({
          registrationOpensAt: new Date(Date.now() - HOUR),
          registrationClosesAt: new Date(Date.now() + HOUR),
          startsAt: new Date(Date.now() + 2 * HOUR),
          capacity: 2,
        }),
      );
      prisma.seasonRegistration.findUnique.mockResolvedValue(null);
      prisma.seasonRegistration.count.mockResolvedValue(2);
      prisma.seasonRegistration.upsert.mockResolvedValue({
        id: 'reg-1',
        status: 'WAITLISTED',
      });

      await service.register('u1', 's1');

      expect(prisma.seasonRegistration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: 'WAITLISTED' }),
        }),
      );
      expect(notifications.create).toHaveBeenCalledWith(
        'u1',
        'COMPETITIONS',
        "You're on the waitlist",
        expect.any(String),
        'SEASON',
        's1',
      );
    });
  });

  describe('withdraw', () => {
    it('rejects once the season has started', async () => {
      prisma.season.findUnique.mockResolvedValue(
        baseSeason({ startsAt: new Date(Date.now() - HOUR) }),
      );

      await expect(service.withdraw('u1', 's1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('promotes the earliest waitlisted player when a spot opens', async () => {
      prisma.season.findUnique.mockResolvedValue(
        baseSeason({ startsAt: new Date(Date.now() + HOUR), capacity: 4 }),
      );
      prisma.seasonRegistration.findFirst.mockResolvedValue({
        id: 'reg-waiting',
        userId: 'u-waiting',
      });

      await service.withdraw('u1', 's1');

      expect(prisma.seasonRegistration.updateMany).toHaveBeenCalledWith({
        where: { seasonId: 's1', userId: 'u1' },
        data: { status: 'WITHDRAWN' },
      });
      expect(prisma.seasonRegistration.update).toHaveBeenCalledWith({
        where: { id: 'reg-waiting' },
        data: { status: 'ENROLLED' },
      });
      // The promotion is never silent again (Wave 4 fix).
      expect(notifications.create).toHaveBeenCalledWith(
        'u-waiting',
        'COMPETITIONS',
        "You're in",
        expect.stringContaining('enrolled'),
        'SEASON',
        's1',
      );
    });

    it('does not notify a promotion when there is no waitlist', async () => {
      prisma.season.findUnique.mockResolvedValue(
        baseSeason({ startsAt: new Date(Date.now() + HOUR), capacity: 4 }),
      );
      prisma.seasonRegistration.findFirst.mockResolvedValue(null);

      await service.withdraw('u1', 's1');

      expect(prisma.seasonRegistration.update).not.toHaveBeenCalled();
      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  describe('ensureSeasonProgressed', () => {
    it('does nothing when the season is cancelled', async () => {
      prisma.season.findUnique.mockResolvedValue(
        baseSeason({ cancelledAt: new Date() }),
      );

      await service.ensureSeasonProgressed('s1');

      expect(prisma.round.count).not.toHaveBeenCalled();
    });

    it('generates and opens Round 1 once the season has started', async () => {
      const season = baseSeason();
      prisma.season.findUnique.mockResolvedValue(season);
      prisma.round.count.mockResolvedValue(0);
      prisma.seasonRegistration.findMany.mockResolvedValue([
        { userId: 'a' },
        { userId: 'b' },
      ]);
      prisma.round.findUnique.mockResolvedValue({
        id: 'r1',
        openedAt: null,
        fixtures: [{ id: 'fx1', sideAUserId: 'a', sideBUserId: 'b' }],
        season: { league: { format: 'SINGLES', name: 'Test League' } },
        index: 1,
      });

      await service.ensureSeasonProgressed('s1');

      // Two rounds' worth of pairing data get created (roundCount: 3, but
      // only n-1=1 unique pairing for 2 players — repeats across rounds).
      expect(prisma.round.create).toHaveBeenCalledTimes(3);
      expect(matches.createFixtureMatch).toHaveBeenCalledWith(
        'a',
        'b',
        'SINGLES',
        expect.stringContaining('Round 1'),
      );
      expect(prisma.fixture.update).toHaveBeenCalledWith({
        where: { id: 'fx1' },
        data: { matchId: 'match-new' },
      });
      expect(prisma.round.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { openedAt: expect.any(Date) },
      });
    });

    it('notifies every enrolled player when a round opens', async () => {
      const season = baseSeason();
      prisma.season.findUnique.mockResolvedValue(season);
      prisma.round.count.mockResolvedValue(0);
      prisma.seasonRegistration.findMany.mockResolvedValue([
        { userId: 'a' },
        { userId: 'b' },
      ]);
      prisma.round.findUnique.mockResolvedValue({
        id: 'r1',
        seasonId: 's1',
        openedAt: null,
        fixtures: [{ id: 'fx1', sideAUserId: 'a', sideBUserId: 'b' }],
        season: { league: { format: 'SINGLES', name: 'Test League' } },
        index: 1,
      });

      await service.ensureSeasonProgressed('s1');

      expect(notifications.create).toHaveBeenCalledWith(
        'a',
        'COMPETITIONS',
        expect.stringContaining('Round 1 is now open'),
        expect.any(String),
        'SEASON',
        's1',
      );
      expect(notifications.create).toHaveBeenCalledWith(
        'b',
        'COMPETITIONS',
        expect.any(String),
        expect.any(String),
        'SEASON',
        's1',
      );
    });

    it('generates no rounds with fewer than two enrolled players', async () => {
      prisma.season.findUnique.mockResolvedValue(baseSeason());
      prisma.round.count.mockResolvedValue(0);
      prisma.seasonRegistration.findMany.mockResolvedValue([{ userId: 'a' }]);

      await service.ensureSeasonProgressed('s1');

      expect(prisma.round.create).not.toHaveBeenCalled();
    });

    it('forces an unplayed fixture to WALKOVER and leaves a DISPUTED fixture alone when a round closes', async () => {
      const season = baseSeason({ roundCount: 1 });
      prisma.season.findUnique.mockResolvedValue(season);
      prisma.round.count.mockResolvedValue(1);
      prisma.round.findFirst.mockResolvedValue({
        id: 'r1',
        index: 1,
        deadline: new Date(Date.now() - HOUR),
        openedAt: new Date(Date.now() - 2 * HOUR),
        closedAt: null,
      });

      const unplayed = {
        id: 'fx1',
        matchId: 'm1',
        match: { id: 'm1', state: 'SCHEDULED', expiresAt: null, result: null },
        sideAUserId: 'a',
        sideBUserId: 'b',
        sideA: { id: 'a', firstName: 'A', lastName: 'A' },
        sideB: { id: 'b', firstName: 'B', lastName: 'B' },
      };
      const disputed = {
        id: 'fx2',
        matchId: 'm2',
        match: {
          id: 'm2',
          state: 'DISPUTED',
          expiresAt: null,
          result: { winningSide: null },
        },
        sideAUserId: 'c',
        sideBUserId: 'd',
        sideA: { id: 'c', firstName: 'C', lastName: 'C' },
        sideB: { id: 'd', firstName: 'D', lastName: 'D' },
      };
      prisma.fixture.findMany.mockResolvedValue([unplayed, disputed]);

      await service.ensureSeasonProgressed('s1');

      expect(prisma.match.update).toHaveBeenCalledTimes(1);
      expect(prisma.match.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { state: 'WALKOVER' },
      });
      expect(matches.announce).toHaveBeenCalledTimes(1);
      expect(prisma.round.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { closedAt: expect.any(Date) },
      });
      // roundCount: 1 and this was round 1 — no next round to open.
      expect(prisma.round.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('club-admin writes (Phase M14)', () => {
    it('createLeague creates a DRAFT league owned by the given club', async () => {
      prisma.league.create.mockResolvedValue({
        id: 'l1',
        sport: 'TENNIS',
        name: 'New League',
        description: null,
        rulesText: null,
        format: 'SINGLES',
        state: 'DRAFT',
      });

      await service.createLeague('club-1', { name: 'New League' });

      expect(prisma.league.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clubId: 'club-1', state: 'DRAFT' }),
        }),
      );
    });

    it('createSeason rejects registration windows that open after they close', async () => {
      const now = new Date();
      await expect(
        service.createSeason('l1', {
          label: 'Season 1',
          registrationOpensAt: new Date(now.getTime() + HOUR),
          registrationClosesAt: now,
          startsAt: now,
          roundCount: 3,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('createSeason rejects registration closing after the season starts', async () => {
      const now = new Date();
      await expect(
        service.createSeason('l1', {
          label: 'Season 1',
          registrationOpensAt: now,
          registrationClosesAt: new Date(now.getTime() + 2 * HOUR),
          startsAt: new Date(now.getTime() + HOUR),
          roundCount: 3,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('adminGenerateFixtures generates rounds even before season.startsAt, unlike the lazy path', async () => {
      const future = new Date(Date.now() + 10 * HOUR);
      prisma.season.findUnique.mockResolvedValue(
        baseSeason({ startsAt: future }),
      );
      prisma.seasonRegistration.findMany.mockResolvedValue([
        { userId: 'a' },
        { userId: 'b' },
      ]);
      prisma.round.findFirst.mockResolvedValue(null);

      await service.adminGenerateFixtures('s1');

      expect(prisma.round.create).toHaveBeenCalled();
    });

    it('updateFixture rejects reassigning sides once the fixture has a live match', async () => {
      prisma.fixture.findUniqueOrThrow.mockResolvedValue({
        id: 'f1',
        matchId: 'm1',
      });
      await expect(
        service.updateFixture('f1', { sideAUserId: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updateFixture allows reassigning sides before a match exists', async () => {
      prisma.fixture.findUniqueOrThrow.mockResolvedValue({
        id: 'f1',
        matchId: null,
      });
      prisma.fixture.update.mockResolvedValue({ id: 'f1' });

      await service.updateFixture('f1', { sideAUserId: 'x' });

      expect(prisma.fixture.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { sideAUserId: 'x', sideBUserId: undefined },
      });
    });

    it('leagueClubId/seasonClubId/fixtureClubId resolve the owning club for the authorization layer', async () => {
      prisma.league.findUnique.mockResolvedValue({ clubId: 'club-1' });
      await expect(service.leagueClubId('l1')).resolves.toBe('club-1');

      prisma.season.findUnique.mockResolvedValue({
        league: { clubId: 'club-2' },
      });
      await expect(service.seasonClubId('s1')).resolves.toBe('club-2');

      prisma.fixture.findUnique.mockResolvedValue({
        round: { season: { league: { clubId: 'club-3' } } },
      });
      await expect(service.fixtureClubId('f1')).resolves.toBe('club-3');
    });
  });
});
