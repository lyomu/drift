import { demoScope, demoScopeFor } from './demo-scope';
import { PrismaService } from '../prisma/prisma.service';

describe('demoScopeFor', () => {
  it('separates users strictly by demo status', () => {
    expect(demoScopeFor(false).user).toEqual({ isDemo: false });
    expect(demoScopeFor(true).user).toEqual({ isDemo: true });
  });

  it('hides demo clubs and club-owned rows from real viewers only', () => {
    const real = demoScopeFor(false);
    expect(real.club).toEqual({ isDemo: false });
    expect(real.clubRequired).toEqual({ club: { is: { isDemo: false } } });
    expect(real.clubOptional).toEqual({
      OR: [{ clubId: null }, { club: { is: { isDemo: false } } }],
    });

    const demo = demoScopeFor(true);
    expect(demo.club).toEqual({});
    expect(demo.clubRequired).toEqual({});
    expect(demo.clubOptional).toEqual({});
  });
});

describe('demoScope', () => {
  const prismaWith = (viewer: { isDemo: boolean } | null) =>
    ({
      user: { findUnique: jest.fn().mockResolvedValue(viewer) },
    }) as unknown as PrismaService;

  it('reads the viewer flag', async () => {
    expect(
      (await demoScope(prismaWith({ isDemo: true }), 'u')).viewerIsDemo,
    ).toBe(true);
    expect(
      (await demoScope(prismaWith({ isDemo: false }), 'u')).viewerIsDemo,
    ).toBe(false);
  });

  it('treats an unknown viewer as a real user (fails closed for demo data)', async () => {
    expect((await demoScope(prismaWith(null), 'u')).viewerIsDemo).toBe(false);
  });
});
