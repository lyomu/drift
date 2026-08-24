import { BadRequestException } from '@nestjs/common';
import { MatchState } from '@prisma/client';
import {
  ACTIVE_STATES,
  CHALLENGE_TTL_MS,
  MAX_PROPOSAL_ROUNDS,
  assertTransition,
  canTransition,
  effectiveState,
  isNegotiable,
} from './match-state';

describe('match-state', () => {
  describe('canTransition', () => {
    it('follows the happy path from foundation/03-user-journeys.md §4.2', () => {
      expect(canTransition(MatchState.PROPOSED, MatchState.SCHEDULING)).toBe(
        true,
      );
      expect(canTransition(MatchState.SCHEDULING, MatchState.SCHEDULED)).toBe(
        true,
      );
      expect(canTransition(MatchState.SCHEDULED, MatchState.RESCHEDULED)).toBe(
        true,
      );
      expect(canTransition(MatchState.RESCHEDULED, MatchState.SCHEDULED)).toBe(
        true,
      );
    });

    it('allows cancelling from any live state', () => {
      for (const state of [
        MatchState.PROPOSED,
        MatchState.SCHEDULING,
        MatchState.SCHEDULED,
        MatchState.RESCHEDULED,
      ]) {
        expect(canTransition(state, MatchState.CANCELLED)).toBe(true);
      }
    });

    it('cannot skip straight from proposed to scheduled', () => {
      expect(canTransition(MatchState.PROPOSED, MatchState.SCHEDULED)).toBe(
        false,
      );
    });

    it('cannot expire a match that was already agreed', () => {
      expect(canTransition(MatchState.SCHEDULED, MatchState.EXPIRED)).toBe(
        false,
      );
    });

    it('treats cancelled and expired as terminal', () => {
      for (const terminal of [MatchState.CANCELLED, MatchState.EXPIRED]) {
        for (const target of Object.values(MatchState)) {
          expect(canTransition(terminal, target)).toBe(false);
        }
      }
    });

    it('does not let this phase reach a result state from negotiation', () => {
      // Results are §4.3 / M7 — only a SCHEDULED match can complete.
      expect(canTransition(MatchState.SCHEDULING, MatchState.COMPLETED)).toBe(
        false,
      );
      expect(canTransition(MatchState.SCHEDULED, MatchState.COMPLETED)).toBe(
        true,
      );
    });
  });

  describe('assertTransition', () => {
    it('is silent on a legal move', () => {
      expect(() =>
        assertTransition(MatchState.PROPOSED, MatchState.SCHEDULING),
      ).not.toThrow();
    });

    it('throws on an illegal move rather than returning false', () => {
      expect(() =>
        assertTransition(MatchState.CANCELLED, MatchState.SCHEDULED),
      ).toThrow(BadRequestException);
    });
  });

  describe('effectiveState', () => {
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + 60_000);

    it('reports an open, lapsed challenge as expired', () => {
      expect(
        effectiveState({ state: MatchState.PROPOSED, expiresAt: past }),
      ).toBe(MatchState.EXPIRED);
    });

    it('leaves an unexpired challenge alone', () => {
      expect(
        effectiveState({ state: MatchState.PROPOSED, expiresAt: future }),
      ).toBe(MatchState.PROPOSED);
    });

    it('never expires a scheduled match, even with a stale expiresAt', () => {
      expect(
        effectiveState({ state: MatchState.SCHEDULED, expiresAt: past }),
      ).toBe(MatchState.SCHEDULED);
    });

    it('handles a null expiresAt', () => {
      expect(
        effectiveState({ state: MatchState.SCHEDULING, expiresAt: null }),
      ).toBe(MatchState.SCHEDULING);
    });
  });

  describe('constants', () => {
    it('bounds counter-proposals at 3 rounds per §4.2', () => {
      expect(MAX_PROPOSAL_ROUNDS).toBe(3);
    });

    it('keeps a challenge open for a week', () => {
      expect(CHALLENGE_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('treats every unsettled state as active, including an open dispute', () => {
      expect(ACTIVE_STATES).toEqual([
        MatchState.PROPOSED,
        MatchState.SCHEDULING,
        MatchState.SCHEDULED,
        MatchState.RESCHEDULED,
        MatchState.DISPUTED,
      ]);
    });

    it('counts only unsettled states as negotiable', () => {
      expect(isNegotiable(MatchState.SCHEDULING)).toBe(true);
      expect(isNegotiable(MatchState.SCHEDULED)).toBe(false);
    });
  });
});
