/**
 * `foundation/03-user-journeys.md` §5's competition state model is
 * `Draft → RegistrationOpen → RegistrationClosed → Scheduled → Active →
 * Completed | Cancelled`. Nothing in this build happens between "registration
 * closing" and "the competition starting" other than time passing — there's
 * no separate manual close-registration step — so `RegistrationClosed` and
 * `Scheduled` collapse into one derived `SCHEDULED` window here. Everything
 * but `CANCELLED`/`COMPLETED` is a pure function of now() vs. the league's
 * dates, same "derive on read" pattern as `effectiveState()` in
 * `matches/match-state.ts`.
 *
 * Since M15 a league *is* the competition (the Season layer is gone), so
 * these dates live on the League row and a null date means the competition
 * hasn't been scheduled yet — it reads as `DRAFT`.
 */
export type CompetitionState =
  | 'DRAFT'
  | 'REGISTRATION_OPEN'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface CompetitionDates {
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  startsAt: Date | null;
  cancelledAt: Date | null;
  completedAt?: Date | null;
}

/**
 * `finalRoundClosed` is supplied by the caller (competitions.service.ts
 * already has the rounds loaded when it needs this) rather than computed
 * here, since "is the competition over" depends on Round data this module
 * has no access to.
 */
export function effectiveCompetitionState(
  league: CompetitionDates,
  finalRoundClosed: boolean,
): CompetitionState {
  if (league.cancelledAt) {
    return 'CANCELLED';
  }
  if (league.completedAt) {
    return 'COMPLETED';
  }
  if (finalRoundClosed) {
    return 'COMPLETED';
  }
  if (
    !league.registrationOpensAt ||
    !league.registrationClosesAt ||
    !league.startsAt
  ) {
    return 'DRAFT';
  }
  const now = Date.now();
  if (now < league.registrationOpensAt.getTime()) {
    return 'DRAFT';
  }
  if (now < league.registrationClosesAt.getTime()) {
    return 'REGISTRATION_OPEN';
  }
  if (now < league.startsAt.getTime()) {
    return 'SCHEDULED';
  }
  return 'ACTIVE';
}

export function isRegistrationOpen(league: CompetitionDates): boolean {
  return effectiveCompetitionState(league, false) === 'REGISTRATION_OPEN';
}
