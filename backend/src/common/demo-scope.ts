import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Demo-account isolation. The seeded demo persona (`isDemo` users + club)
 * lives in the production database, so every discovery surface scopes what a
 * viewer can find by whether the viewer is themselves a demo account.
 *
 * - Users: strictly separated. A real user never finds a demo user, and a
 *   demo user never finds a real one (a demo challenge or connection request
 *   would otherwise notify a real person).
 * - Clubs and club-owned things (courts, leagues, tournaments, ladders):
 *   real viewers never see demo ones; demo viewers see everything, so the
 *   demo still has real-looking neighbours.
 */
export interface DemoScope {
  viewerIsDemo: boolean;
  /** Spread into a `User` where-clause. */
  user: Prisma.UserWhereInput;
  /** Spread into a `Club` where-clause. */
  club: Prisma.ClubWhereInput;
  /**
   * For models with a REQUIRED `club` relation (Tournament, Ladder). Spread
   * into the where-clause.
   */
  clubRequired: { club?: { is: { isDemo: false } } };
  /**
   * For models with a NULLABLE `clubId` (Court, League): independent rows
   * always pass. Put it in an `AND` so it cannot clobber the query's own `OR`.
   */
  clubOptional: {
    OR?: [{ clubId: null }, { club: { is: { isDemo: false } } }];
  };
}

export function demoScopeFor(viewerIsDemo: boolean): DemoScope {
  return {
    viewerIsDemo,
    user: { isDemo: viewerIsDemo },
    club: viewerIsDemo ? {} : { isDemo: false },
    clubRequired: viewerIsDemo ? {} : { club: { is: { isDemo: false } } },
    clubOptional: viewerIsDemo
      ? {}
      : { OR: [{ clubId: null }, { club: { is: { isDemo: false } } }] },
  };
}

export async function demoScope(
  prisma: PrismaService,
  viewerId: string,
): Promise<DemoScope> {
  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { isDemo: true },
  });
  return demoScopeFor(viewer?.isDemo ?? false);
}
