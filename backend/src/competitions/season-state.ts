/**
 * `foundation/03-user-journeys.md` §5's competition state model is
 * `Draft → RegistrationOpen → RegistrationClosed → Scheduled → Active →
 * Completed | Cancelled`. Nothing in this build actually happens between
 * "registration closing" and "the season starting" other than time passing
 * — there's no separate manual close-registration step — so
 * `RegistrationClosed` and `Scheduled` collapse into one derived `SCHEDULED`
 * window here. Everything but `CANCELLED`/`COMPLETED` is a pure function of
 * now() vs. the season's dates, same "derive on read" pattern as
 * `effectiveState()` in `matches/match-state.ts`.
 */
export type SeasonState =
  | 'DRAFT'
  | 'REGISTRATION_OPEN'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface SeasonDates {
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  startsAt: Date;
  cancelledAt: Date | null;
  completedAt?: Date | null;
}

/**
 * `finalRoundClosed` is supplied by the caller (competitions.service.ts
 * already has the rounds loaded when it needs this) rather than computed
 * here, since "is the season over" depends on Round data this module has no
 * access to.
 */
export function effectiveSeasonState(
  season: SeasonDates,
  finalRoundClosed: boolean,
): SeasonState {
  if (season.cancelledAt) {
    return 'CANCELLED';
  }
  if (season.completedAt) {
    return 'COMPLETED';
  }
  if (finalRoundClosed) {
    return 'COMPLETED';
  }
  const now = Date.now();
  if (now < season.registrationOpensAt.getTime()) {
    return 'DRAFT';
  }
  if (now < season.registrationClosesAt.getTime()) {
    return 'REGISTRATION_OPEN';
  }
  if (now < season.startsAt.getTime()) {
    return 'SCHEDULED';
  }
  return 'ACTIVE';
}

export function isRegistrationOpen(season: SeasonDates): boolean {
  return effectiveSeasonState(season, false) === 'REGISTRATION_OPEN';
}
