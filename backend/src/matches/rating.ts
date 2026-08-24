import { MatchSide } from '@prisma/client';

/**
 * Rating engine. `foundation/06-domain-technical-architecture.md` §2 says
 * competitive rating "trends toward being driven by verified match results
 * over time (result confirmation, opponent strength, competition level)"
 * but never gives a formula — this is a documented implementation decision,
 * same class as the NTRP-style level formula (M3) and the discovery ranking
 * weights (M5).
 *
 * Deliberately kept on the same 1.0–7.0 scale as `userSelectedLevel` rather
 * than a conventional ~1000-2000 Elo range, so every number the app shows a
 * player is in one comparable unit. Standard Elo expected-score logistic,
 * recalibrated for that narrower scale (a divisor of ~400 would make every
 * plausible rating gap read as "coin flip"), with a small K so one match
 * moves rating a fraction of a level rather than a whole one.
 */
export const RATING_SCALE_DIVISOR = 2.0;
export const RATING_K_FACTOR = 0.4;
export const MIN_RATING = 1.0;
export const MAX_RATING = 7.0;

function clampRating(rating: number): number {
  return Math.min(MAX_RATING, Math.max(MIN_RATING, rating));
}

/** Elo expected-score: probability side A "wins" against side B's rating. */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / RATING_SCALE_DIVISOR));
}

export interface RatingUpdate {
  newRatingA: number;
  newRatingB: number;
  deltaA: number;
  deltaB: number;
}

/**
 * `scoreA` is 1 for an A win, 0 for a B win — no draws in tennis/padel
 * scoring, so this is always one or the other.
 */
export function applyResult(
  ratingA: number,
  ratingB: number,
  scoreA: 0 | 1,
): RatingUpdate {
  const expectedA = expectedScore(ratingA, ratingB);
  const deltaA = RATING_K_FACTOR * (scoreA - expectedA);
  const deltaB = -deltaA;

  const newRatingA = clampRating(ratingA + deltaA);
  const newRatingB = clampRating(ratingB + deltaB);

  return {
    newRatingA,
    newRatingB,
    // Report the actual clamped movement, not the theoretical delta, so a
    // rating already pinned at 7.0 correctly shows zero movement.
    deltaA: newRatingA - ratingA,
    deltaB: newRatingB - ratingB,
  };
}

/**
 * Doubles: each pair's rating is the average of its two members for the
 * expected-score calculation, and the resulting delta is applied equally to
 * both partners on a side. The simplest fair split, and the common
 * convention for doubles Elo variants.
 */
export function applyDoublesResult(
  pairARatings: [number, number],
  pairBRatings: [number, number],
  sideAWon: boolean,
): { deltaA: number; deltaB: number } {
  const avgA = (pairARatings[0] + pairARatings[1]) / 2;
  const avgB = (pairBRatings[0] + pairBRatings[1]) / 2;
  const { deltaA, deltaB } = applyResult(avgA, avgB, sideAWon ? 1 : 0);
  return { deltaA, deltaB };
}

/** A player's seed rating the first time they play a given format. */
export function seedRating(userSelectedLevel: number | null): number {
  return clampRating(userSelectedLevel ?? (MIN_RATING + MAX_RATING) / 2);
}

export function sideWon(winningSide: MatchSide, side: MatchSide): boolean {
  return winningSide === side;
}
