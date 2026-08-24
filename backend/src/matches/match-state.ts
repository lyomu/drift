import { BadRequestException } from '@nestjs/common';
import { MatchState } from '@prisma/client';

/**
 * Counter-proposal rounds before the API stops accepting counters and tells
 * the pair to talk it out in chat — `foundation/03-user-journeys.md` §4.2
 * ("bounded to prevent infinite loop — 3 rounds before prompting a
 * call-to-chat").
 */
export const MAX_PROPOSAL_ROUNDS = 3;

/** How long an unanswered challenge stays open before it reads as expired. */
export const CHALLENGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The legal state graph from `foundation/03-user-journeys.md` §4.2:
 * `Proposed → Scheduling → Scheduled → (Rescheduled | Cancelled | Expired)`.
 *
 * Terminal-for-this-phase states map to empty sets. The result states
 * (COMPLETED / WALKOVER / RETIRED / DISPUTED) exist in the enum because Doc 6
 * §1 models matches as one entity, but nothing here transitions into them —
 * that's §4.3 and Phase M7.
 */
const TRANSITIONS: Record<MatchState, MatchState[]> = {
  // WALKOVER is reachable directly from every still-open state — Phase M8's
  // round/season-close sweep forces an unplayed league fixture to a neutral
  // WALKOVER the moment its round's deadline passes, whatever stage the
  // negotiation was stuck at (competitions/competitions.service.ts).
  PROPOSED: [
    MatchState.SCHEDULING,
    MatchState.CANCELLED,
    MatchState.EXPIRED,
    MatchState.WALKOVER,
  ],
  SCHEDULING: [
    MatchState.SCHEDULED,
    MatchState.CANCELLED,
    MatchState.EXPIRED,
    MatchState.WALKOVER,
  ],
  SCHEDULED: [
    MatchState.RESCHEDULED,
    MatchState.CANCELLED,
    MatchState.COMPLETED,
    MatchState.WALKOVER,
    MatchState.RETIRED,
    // A submitted result can be disputed before the match ever reaches a
    // settled state — foundation/03-user-journeys.md §4.3.
    MatchState.DISPUTED,
  ],
  // Rescheduling reopens negotiation, so it behaves like SCHEDULING.
  RESCHEDULED: [
    MatchState.SCHEDULED,
    MatchState.CANCELLED,
    MatchState.EXPIRED,
    MatchState.WALKOVER,
  ],
  CANCELLED: [],
  EXPIRED: [],
  COMPLETED: [MatchState.DISPUTED],
  WALKOVER: [],
  RETIRED: [],
  // Resolution is mutual-reconfirmation only this phase (results.service.ts)
  // — whichever version both parties converge on can be any outcome, not
  // just a scored COMPLETED result.
  DISPUTED: [MatchState.COMPLETED, MatchState.WALKOVER, MatchState.RETIRED],
};

export function canTransition(from: MatchState, to: MatchState): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * Throws rather than returning false — callers are performing a transition,
 * not asking about one, so an illegal move should stop the request.
 */
export function assertTransition(from: MatchState, to: MatchState): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException(
      `A match that is ${from.toLowerCase()} cannot become ${to.toLowerCase()}.`,
    );
  }
}

/** States where the match is still being negotiated rather than settled. */
export function isNegotiable(state: MatchState): boolean {
  return (
    state === MatchState.SCHEDULING ||
    state === MatchState.RESCHEDULED ||
    state === MatchState.PROPOSED
  );
}

/**
 * States a player would expect to see under "Active" in the Play Hub — an
 * unresolved dispute is not "history," it's still actionable, so DISPUTED
 * lives here rather than in the settled `history` segment.
 */
export const ACTIVE_STATES: MatchState[] = [
  MatchState.PROPOSED,
  MatchState.SCHEDULING,
  MatchState.SCHEDULED,
  MatchState.RESCHEDULED,
  MatchState.DISPUTED,
];

/** The settled states — Play Hub's History segment. */
export const HISTORY_STATES: MatchState[] = [
  MatchState.COMPLETED,
  MatchState.WALKOVER,
  MatchState.RETIRED,
];

/**
 * Expiry is derived on read rather than swept by a cron job. Nothing needs to
 * *fire* when a challenge lapses until Notifications lands in M12 — at that
 * point this becomes a real scheduled transition so the notification has an
 * event to hang off.
 */
export function effectiveState(match: {
  state: MatchState;
  expiresAt: Date | null;
}): MatchState {
  const isOpen =
    match.state === MatchState.PROPOSED ||
    match.state === MatchState.SCHEDULING ||
    match.state === MatchState.RESCHEDULED;

  if (isOpen && match.expiresAt && match.expiresAt.getTime() < Date.now()) {
    return MatchState.EXPIRED;
  }
  return match.state;
}
