import type { Prisma } from '@prisma/client';
import type { HomeCard } from '../home-card';

export type HomeProfile = Prisma.TennisProfileGetPayload<{
  include: { availabilitySlots: true };
}>;

/**
 * Everything a contributor is allowed to assume has already been resolved.
 *
 * `now` is captured once per feed build and shared, so two contributors can't
 * disagree about whether a deadline has passed — the same discipline
 * `season-state.ts` and `match-state.ts` already apply to derived state.
 */
export interface HomeContext {
  userId: string;
  now: Date;
  profile: HomeProfile;
}

/**
 * One card type, one contributor.
 *
 * Split this way for the same reason `round-robin.ts`, `rating.ts` and
 * `skill-score.ts` were extracted: anything with real branching gets its own
 * file and its own spec, rather than growing `getFeed` into a method nobody
 * can hold in their head. `HomeService` runs them all under `Promise.all`.
 *
 * A contributor returns zero or more cards. Returning `[]` is the normal way
 * to say "nothing to surface for this user right now" — it is not an error,
 * and must not be signalled by throwing.
 */
export interface HomeCardContributor {
  /** Used in logs when a contributor fails, so the culprit is identifiable. */
  readonly key: string;
  contribute(ctx: HomeContext): Promise<HomeCard[]>;
}
