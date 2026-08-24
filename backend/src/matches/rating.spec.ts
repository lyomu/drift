import { MatchSide } from '@prisma/client';
import {
  MAX_RATING,
  MIN_RATING,
  RATING_K_FACTOR,
  applyDoublesResult,
  applyResult,
  expectedScore,
  seedRating,
  sideWon,
} from './rating';

describe('rating', () => {
  describe('expectedScore', () => {
    it('is 0.5 for equal ratings', () => {
      expect(expectedScore(4.0, 4.0)).toBeCloseTo(0.5);
    });

    it('favours the higher-rated side', () => {
      expect(expectedScore(6.0, 3.0)).toBeGreaterThan(0.5);
      expect(expectedScore(3.0, 6.0)).toBeLessThan(0.5);
    });

    it('is symmetric', () => {
      const a = expectedScore(5.0, 3.0);
      const b = expectedScore(3.0, 5.0);
      expect(a + b).toBeCloseTo(1);
    });
  });

  describe('applyResult', () => {
    it('moves the winner up and the loser down by the same magnitude', () => {
      const { deltaA, deltaB } = applyResult(4.0, 4.0, 1);
      expect(deltaA).toBeGreaterThan(0);
      expect(deltaB).toBeLessThan(0);
      expect(deltaA).toBeCloseTo(-deltaB);
    });

    it('moves an underdog winner further than a favourite winner', () => {
      const underdogWin = applyResult(3.0, 6.0, 1); // A (lower-rated) wins
      const favouriteWin = applyResult(6.0, 3.0, 1); // A (higher-rated) wins
      expect(underdogWin.deltaA).toBeGreaterThan(favouriteWin.deltaA);
    });

    it('never moves more than one K-factor', () => {
      const { deltaA } = applyResult(1.0, 7.0, 1); // biggest possible upset
      expect(Math.abs(deltaA)).toBeLessThanOrEqual(RATING_K_FACTOR);
    });

    it('clamps at the ceiling — a maxed-out winner shows zero movement', () => {
      const { newRatingA, deltaA } = applyResult(MAX_RATING, 1.0, 1);
      expect(newRatingA).toBe(MAX_RATING);
      expect(deltaA).toBe(0);
    });

    it('clamps at the floor — a maxed-out loser shows zero movement', () => {
      // scoreA=1 means A wins, so B (already at the floor) loses again.
      const { newRatingB, deltaB } = applyResult(7.0, MIN_RATING, 1);
      expect(newRatingB).toBe(MIN_RATING);
      expect(deltaB).toBe(0);
    });
  });

  describe('applyDoublesResult', () => {
    it('averages each pair for the expected-score calculation', () => {
      // Pair A averages 5.0, pair B averages 3.0 — A is favoured.
      const { deltaA } = applyDoublesResult([4.0, 6.0], [2.0, 4.0], true);
      expect(deltaA).toBeGreaterThan(0);
      expect(deltaA).toBeLessThan(RATING_K_FACTOR / 2);
    });

    it('is symmetric to a losing side', () => {
      const win = applyDoublesResult([4.0, 4.0], [4.0, 4.0], true);
      const loss = applyDoublesResult([4.0, 4.0], [4.0, 4.0], false);
      expect(win.deltaA).toBeCloseTo(-loss.deltaA);
    });
  });

  describe('seedRating', () => {
    it('seeds from the player’s selected level', () => {
      expect(seedRating(4.5)).toBe(4.5);
    });

    it('defaults to the midpoint when there is no level at all', () => {
      expect(seedRating(null)).toBe((MIN_RATING + MAX_RATING) / 2);
    });

    it('clamps an out-of-range level', () => {
      expect(seedRating(9.0)).toBe(MAX_RATING);
    });
  });

  describe('sideWon', () => {
    it('is true only for the winning side', () => {
      expect(sideWon(MatchSide.A, MatchSide.A)).toBe(true);
      expect(sideWon(MatchSide.A, MatchSide.B)).toBe(false);
    });
  });
});
