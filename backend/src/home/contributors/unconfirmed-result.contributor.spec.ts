import { UnconfirmedResultContributor } from './unconfirmed-result.contributor';
import { PrismaService } from '../../prisma/prisma.service';
import type { HomeContext, HomeProfile } from './home-contributor';

const ctx: HomeContext = {
  userId: 'me',
  now: new Date('2026-08-26T10:00:00Z'),
  profile: {} as unknown as HomeProfile,
};

function matchRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'match-1',
    sport: 'TENNIS',
    format: 'SINGLES',
    state: 'SCHEDULED',
    createdById: 'them',
    confirmedTime: null,
    courtName: null,
    courtNote: null,
    court: null,
    proposalRound: 0,
    expiresAt: null,
    cancelReason: null,
    conversation: { id: 'conv-1' },
    createdAt: new Date(),
    timeProposals: [],
    fixture: null,
    participants: [
      {
        userId: 'me',
        side: 'A',
        role: 'CHALLENGER',
        status: 'ACCEPTED',
        user: {
          id: 'me',
          firstName: 'Me',
          lastName: null,
          tennisProfile: null,
        },
      },
      {
        userId: 'them',
        side: 'B',
        role: 'OPPONENT',
        status: 'ACCEPTED',
        user: {
          id: 'them',
          firstName: 'Ana',
          lastName: 'Diaz',
          tennisProfile: null,
        },
      },
    ],
    result: {
      status: 'PENDING_CONFIRMATION',
      submittedById: 'them',
      outcome: 'SCORE',
      sets: null,
      winningSide: 'B',
      submittedAt: new Date(),
      confirmedById: null,
      confirmedAt: null,
      disputedById: null,
      disputedAt: null,
      disputantOutcome: null,
      disputantSets: null,
    },
    ...overrides,
  };
}

describe('UnconfirmedResultContributor', () => {
  let prisma: { match: { findMany: jest.Mock } };
  let contributor: UnconfirmedResultContributor;

  beforeEach(() => {
    prisma = { match: { findMany: jest.fn() } };
    contributor = new UnconfirmedResultContributor(
      prisma as unknown as PrismaService,
    );
  });

  it('asks the opponent to confirm a score somebody else submitted', async () => {
    prisma.match.findMany.mockResolvedValue([matchRow()]);

    const [card] = await contributor.contribute(ctx);
    expect(card.type).toBe('UNCONFIRMED_RESULT');
    expect(card.body).toContain('Ana Diaz');
    expect(card.action?.route).toBe('/matches/match-1');
  });

  it('stays silent about a result this user submitted themselves', async () => {
    // It is waiting on the *opponent*, so it is not an action this user can
    // take — surfacing it would be noise, not a prompt.
    prisma.match.findMany.mockResolvedValue([
      matchRow({
        result: { ...matchRow().result, submittedById: 'me' },
      }),
    ]);

    expect(await contributor.contribute(ctx)).toEqual([]);
  });

  it('routes a disputed result to the dispute screen instead', async () => {
    prisma.match.findMany.mockResolvedValue([
      matchRow({
        state: 'DISPUTED',
        result: { ...matchRow().result, status: 'DISPUTED' },
      }),
    ]);

    const [card] = await contributor.contribute(ctx);
    expect(card.title).toBe('A score is disputed');
    expect(card.action?.route).toBe('/matches/match-1/dispute');
  });

  it('is never dismissible — hiding it would strand the opponent', async () => {
    prisma.match.findMany.mockResolvedValue([matchRow()]);
    const [card] = await contributor.contribute(ctx);
    expect(card.dismissible).toBe(false);
    expect(card.accent).toBe('urgent');
  });
});
