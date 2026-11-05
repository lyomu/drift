/**
 * Member engagement for the club-admin member profile.
 *
 * The score is derived only from activity the app really records, over a fixed
 * window, and is a *product decision* kept in one place so it can be tuned
 * without touching the queries: each signal earns a fixed number of points per
 * occurrence up to a cap, so no single behaviour can dominate.
 *
 *   league matches played   8 each, up to 5   -> max 40
 *   club events attended    5 each, up to 5   -> max 25
 *   posts + reactions       2 each, up to 10  -> max 20
 *   leagues currently in    5 each, up to 3   -> max 15
 *
 * It deliberately says nothing about court bookings or time on court: they are
 * shown as display-only stats and never feed the score.
 */

/** Days of history the stats cover. */
export const ENGAGEMENT_WINDOW_DAYS = 90;

export interface EngagementInputs {
  matchesPlayed: number;
  eventsAttended: number;
  posts: number;
  reactions: number;
  activeLeagues: number;
}

export type EngagementBand = 'HIGHLY_ACTIVE' | 'ACTIVE' | 'LOW' | 'INACTIVE';

const capped = (count: number, each: number, cap: number) =>
  Math.min(Math.max(0, Math.floor(count)), cap) * each;

export function engagementScore(input: EngagementInputs): number {
  return (
    capped(input.matchesPlayed, 8, 5) +
    capped(input.eventsAttended, 5, 5) +
    capped(input.posts + input.reactions, 2, 10) +
    capped(input.activeLeagues, 5, 3)
  );
}

export function engagementBand(score: number): EngagementBand {
  if (score >= 70) return 'HIGHLY_ACTIVE';
  if (score >= 40) return 'ACTIVE';
  if (score >= 1) return 'LOW';
  return 'INACTIVE';
}
