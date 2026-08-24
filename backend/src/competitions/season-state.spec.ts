import { effectiveSeasonState, isRegistrationOpen } from './season-state';

const HOUR = 60 * 60 * 1000;

function seasonAt(offsets: {
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

describe('season-state', () => {
  it('is DRAFT before registration opens', () => {
    const season = seasonAt({
      opensIn: HOUR,
      closesIn: 2 * HOUR,
      startsIn: 3 * HOUR,
    });
    expect(effectiveSeasonState(season, false)).toBe('DRAFT');
    expect(isRegistrationOpen(season)).toBe(false);
  });

  it('is REGISTRATION_OPEN between opens and closes', () => {
    const season = seasonAt({
      opensIn: -HOUR,
      closesIn: HOUR,
      startsIn: 2 * HOUR,
    });
    expect(effectiveSeasonState(season, false)).toBe('REGISTRATION_OPEN');
    expect(isRegistrationOpen(season)).toBe(true);
  });

  it('is SCHEDULED between registration close and season start', () => {
    const season = seasonAt({
      opensIn: -2 * HOUR,
      closesIn: -HOUR,
      startsIn: HOUR,
    });
    expect(effectiveSeasonState(season, false)).toBe('SCHEDULED');
    expect(isRegistrationOpen(season)).toBe(false);
  });

  it('is ACTIVE once the season has started', () => {
    const season = seasonAt({
      opensIn: -3 * HOUR,
      closesIn: -2 * HOUR,
      startsIn: -HOUR,
    });
    expect(effectiveSeasonState(season, false)).toBe('ACTIVE');
  });

  it('is COMPLETED once the final round has closed, regardless of dates', () => {
    const season = seasonAt({
      opensIn: -3 * HOUR,
      closesIn: -2 * HOUR,
      startsIn: -HOUR,
    });
    expect(effectiveSeasonState(season, true)).toBe('COMPLETED');
  });

  it('is CANCELLED whenever cancelledAt is set, overriding everything else', () => {
    const season = seasonAt({
      opensIn: -HOUR,
      closesIn: HOUR,
      startsIn: 2 * HOUR,
      cancelled: true,
    });
    expect(effectiveSeasonState(season, false)).toBe('CANCELLED');
    expect(isRegistrationOpen(season)).toBe(false);
  });
});
