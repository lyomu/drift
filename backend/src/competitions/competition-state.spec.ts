import {
  effectiveCompetitionState,
  isRegistrationOpen,
} from './competition-state';

const HOUR = 60 * 60 * 1000;

function competitionAt(offsets: {
  opensIn: number;
  closesIn: number;
  startsIn: number;
  cancelled?: boolean;
}) {
  const now = Date.now();
  return {
    registrationOpensAt: new Date(now + offsets.opensIn),
    registrationClosesAt: new Date(now + offsets.closesIn),
    startsAt: new Date(now + offsets.startsIn),
    cancelledAt: offsets.cancelled ? new Date() : null,
  };
}

describe('competition-state', () => {
  it('is DRAFT before registration opens', () => {
    const league = competitionAt({
      opensIn: HOUR,
      closesIn: 2 * HOUR,
      startsIn: 3 * HOUR,
    });
    expect(effectiveCompetitionState(league, false)).toBe('DRAFT');
    expect(isRegistrationOpen(league)).toBe(false);
  });

  it('is DRAFT when the competition has no dates set yet', () => {
    const league = {
      registrationOpensAt: null,
      registrationClosesAt: null,
      startsAt: null,
      cancelledAt: null,
    };
    expect(effectiveCompetitionState(league, false)).toBe('DRAFT');
    expect(isRegistrationOpen(league)).toBe(false);
  });

  it('is REGISTRATION_OPEN between opens and closes', () => {
    const league = competitionAt({
      opensIn: -HOUR,
      closesIn: HOUR,
      startsIn: 2 * HOUR,
    });
    expect(effectiveCompetitionState(league, false)).toBe('REGISTRATION_OPEN');
    expect(isRegistrationOpen(league)).toBe(true);
  });

  it('is SCHEDULED between registration close and competition start', () => {
    const league = competitionAt({
      opensIn: -2 * HOUR,
      closesIn: -HOUR,
      startsIn: HOUR,
    });
    expect(effectiveCompetitionState(league, false)).toBe('SCHEDULED');
    expect(isRegistrationOpen(league)).toBe(false);
  });

  it('is ACTIVE once the competition has started', () => {
    const league = competitionAt({
      opensIn: -3 * HOUR,
      closesIn: -2 * HOUR,
      startsIn: -HOUR,
    });
    expect(effectiveCompetitionState(league, false)).toBe('ACTIVE');
  });

  it('is COMPLETED once the final round has closed, regardless of dates', () => {
    const league = competitionAt({
      opensIn: -3 * HOUR,
      closesIn: -2 * HOUR,
      startsIn: -HOUR,
    });
    expect(effectiveCompetitionState(league, true)).toBe('COMPLETED');
  });

  it('is CANCELLED whenever cancelledAt is set, overriding everything else', () => {
    const league = competitionAt({
      opensIn: -HOUR,
      closesIn: HOUR,
      startsIn: 2 * HOUR,
      cancelled: true,
    });
    expect(effectiveCompetitionState(league, false)).toBe('CANCELLED');
    expect(isRegistrationOpen(league)).toBe(false);
  });
});
