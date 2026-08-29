import { LeagueRoundDeadlineContributor } from './league-round-deadline.contributor';
import { PrismaService } from '../../prisma/prisma.service';
import type { HomeContext, HomeProfile } from './home-contributor';

const NOW = new Date('2026-08-26T10:00:00Z');

const ctx: HomeContext = {
  userId: 'me',
  now: NOW,
  profile: {} as unknown as HomeProfile,
};

function fixtureRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fixture-1',
    sideAUserId: 'me',
    sideBUserId: 'them',
    match: { state: 'SCHEDULING', expiresAt: null, confirmedTime: null },
    round: {
      id: 'round-1',
      index: 2,
      // 6 hours out.
      deadline: new Date('2026-08-26T16:00:00Z'),
      season: {
        id: 'season-1',
        league: { name: 'Autumn Singles League' },
      },
    },
    ...overrides,
  };
}

describe('LeagueRoundDeadlineContributor', () => {
  let prisma: { fixture: { findMany: jest.Mock } };
  let contributor: LeagueRoundDeadlineContributor;

  beforeEach(() => {
    prisma = { fixture: { findMany: jest.fn() } };
    contributor = new LeagueRoundDeadlineContributor(
      prisma as unknown as PrismaService,
    );
  });

  it('warns about an unplayed fixture before its round closes', async () => {
    prisma.fixture.findMany.mockResolvedValue([fixtureRow()]);

    const [card] = await contributor.contribute(ctx);
    expect(card.type).toBe('LEAGUE_ROUND_DEADLINE');
    expect(card.title).toBe('Round 2 closes in 6 hours');
    expect(card.body).toContain('walkover');
    expect(card.action?.route).toBe('/compete/seasons/season-1/rounds/round-1');
  });

  it('is urgent and not dismissible — the cost of missing it is a lost fixture', async () => {
    prisma.fixture.findMany.mockResolvedValue([fixtureRow()]);
    const [card] = await contributor.contribute(ctx);
    expect(card.accent).toBe('urgent');
    expect(card.dismissible).toBe(false);
  });

  it('ignores a bye — there is nothing to play', async () => {
    prisma.fixture.findMany.mockResolvedValue([
      fixtureRow({ sideBUserId: null }),
    ]);
    expect(await contributor.contribute(ctx)).toEqual([]);
  });

  it.each(['COMPLETED', 'WALKOVER', 'RETIRED'])(
    'ignores a fixture already settled as %s',
    async (state) => {
      prisma.fixture.findMany.mockResolvedValue([
        fixtureRow({ match: { state, expiresAt: null, confirmedTime: null } }),
      ]);
      expect(await contributor.contribute(ctx)).toEqual([]);
    },
  );

  it('ignores a disputed fixture — a real result exists, it is just contested', async () => {
    prisma.fixture.findMany.mockResolvedValue([
      fixtureRow({
        match: { state: 'DISPUTED', expiresAt: null, confirmedTime: null },
      }),
    ]);
    expect(await contributor.contribute(ctx)).toEqual([]);
  });

  it('distinguishes a scheduled fixture from one with no agreed time', async () => {
    prisma.fixture.findMany.mockResolvedValue([
      fixtureRow({
        match: {
          state: 'SCHEDULED',
          expiresAt: null,
          confirmedTime: new Date('2026-08-26T14:00:00Z'),
        },
      }),
    ]);

    const [card] = await contributor.contribute(ctx);
    expect(card.body).toContain('Play your');

    prisma.fixture.findMany.mockResolvedValue([fixtureRow()]);
    const [unscheduled] = await contributor.contribute(ctx);
    expect(unscheduled.body).toContain("haven't agreed a time");
  });
});
