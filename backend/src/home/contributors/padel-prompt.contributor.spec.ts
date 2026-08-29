import { PadelPromptContributor } from './padel-prompt.contributor';
import { PrismaService } from '../../prisma/prisma.service';
import type { HomeContext, HomeProfile } from './home-contributor';

function ctx(padelInterest: string | null): HomeContext {
  return {
    userId: 'user-1',
    now: new Date('2026-08-26T10:00:00Z'),
    profile: { padelInterest } as unknown as HomeProfile,
  };
}

describe('PadelPromptContributor', () => {
  let prisma: { padelProfile: { findUnique: jest.Mock } };
  let contributor: PadelPromptContributor;

  beforeEach(() => {
    prisma = {
      padelProfile: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    contributor = new PadelPromptContributor(
      prisma as unknown as PrismaService,
    );
  });

  it.each(['YES', 'WANT_TO_LEARN'])(
    'prompts a user who expressed interest (%s) and has no Padel profile',
    async (interest) => {
      const cards = await contributor.contribute(ctx(interest));
      expect(cards).toHaveLength(1);
      expect(cards[0].type).toBe('PADEL_PROMPT');
    },
  );

  it('routes to Add Padel rather than promising a future release', async () => {
    const [card] = await contributor.contribute(ctx('YES'));

    expect(card.action).toEqual({
      label: 'Add Padel',
      route: '/profile/padel/add',
    });
    // Regression guard for the M4-era card that was still telling users
    // "Padel is coming to Drift" long after Padel shipped in M13.
    expect(`${card.title} ${card.body}`).not.toMatch(/coming|when it's ready/i);
  });

  it('says nothing to a user who is not interested', async () => {
    expect(await contributor.contribute(ctx('NO'))).toEqual([]);
    expect(await contributor.contribute(ctx(null))).toEqual([]);
  });

  it('stops prompting once the Padel profile exists', async () => {
    prisma.padelProfile.findUnique.mockResolvedValue({ id: 'padel-1' });
    expect(await contributor.contribute(ctx('YES'))).toEqual([]);
  });
});
