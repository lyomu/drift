import { activityStreakWeeks, levelProgress, startOfWeek } from './home-progress';

/** Thursday 1 October 2026, the date on the redesign mocks. */
const NOW = new Date('2026-10-01T12:00:00.000Z');

const daysBefore = (n: number) =>
  new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

describe('startOfWeek', () => {
  it('returns the Monday of that week, at midnight UTC', () => {
    // 1 Oct 2026 is a Thursday; its Monday is 28 Sep.
    expect(startOfWeek(NOW).toISOString()).toBe('2026-09-28T00:00:00.000Z');
  });

  it('treats Sunday as the end of its week, not the start', () => {
    const sunday = new Date('2026-10-04T23:00:00.000Z');
    expect(startOfWeek(sunday).toISOString()).toBe('2026-09-28T00:00:00.000Z');
  });
});

describe('activityStreakWeeks', () => {
  it('is 0 with no activity at all', () => {
    expect(activityStreakWeeks([], NOW)).toBe(0);
  });

  it('counts the current week as 1', () => {
    expect(activityStreakWeeks([daysBefore(1)], NOW)).toBe(1);
  });

  it('counts consecutive weeks', () => {
    // This week, and each of the three before it.
    const dates = [daysBefore(1), daysBefore(8), daysBefore(15), daysBefore(22)];
    expect(activityStreakWeeks(dates, NOW)).toBe(4);
  });

  it('ignores duplicates within a week', () => {
    const dates = [daysBefore(1), daysBefore(2), daysBefore(3)];
    expect(activityStreakWeeks(dates, NOW)).toBe(1);
  });

  it('keeps a streak alive through the current week (grace period)', () => {
    // Nothing yet this week, but last week and the one before both count.
    const dates = [daysBefore(8), daysBefore(15)];
    expect(activityStreakWeeks(dates, NOW)).toBe(2);
  });

  it('breaks when both this week and last week are empty', () => {
    expect(activityStreakWeeks([daysBefore(15), daysBefore(22)], NOW)).toBe(0);
  });

  it('stops at the first gap rather than counting total active weeks', () => {
    // This week and last week, then a gap, then two more.
    const dates = [
      daysBefore(1),
      daysBefore(8),
      // (no week 3)
      daysBefore(22),
      daysBefore(29),
    ];
    expect(activityStreakWeeks(dates, NOW)).toBe(2);
  });
});

describe('levelProgress', () => {
  it('is null for an un-levelled player', () => {
    expect(levelProgress(null)).toBeNull();
  });

  it('fills toward the top of the current band', () => {
    // Beginner spans 1.0–2.5. 2.4 is 1.4 of that 1.5 span.
    expect(levelProgress(2.4)).toEqual({ nextLevel: 2.5, percent: 93 });
  });

  it('is 0% at the floor of a band', () => {
    expect(levelProgress(4.0)).toEqual({ nextLevel: 5.5, percent: 0 });
  });

  it('uses the band the level actually falls in', () => {
    // 4.75 is the midpoint of Intermediate (4.0–5.5).
    expect(levelProgress(4.75)).toEqual({ nextLevel: 5.5, percent: 50 });
  });

  it('is null in the top band, where there is no next level', () => {
    expect(levelProgress(6.0)).toBeNull();
    expect(levelProgress(7.0)).toBeNull();
  });
});
