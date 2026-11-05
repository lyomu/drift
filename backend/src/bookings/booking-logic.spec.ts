import {
  addDaysYmd,
  dayOfWeekOf,
  generateSlots,
  isValidTimeZone,
  isWithinHours,
  localYmd,
  openMinutesInRange,
  overlaps,
  remainingCapacity,
  validateBookingWindow,
  validateOpeningHours,
  zonedToUtc,
  OpeningInterval,
} from './booking-logic';

const NAIROBI = 'Africa/Nairobi'; // UTC+3, no DST
const NY = 'America/New_York';

const d = (iso: string) => new Date(iso);
const range = (a: string, b: string) => ({ startsAt: d(a), endsAt: d(b) });

// 2026-11-09 is a Monday (dayOfWeek 1).
const MON = '2026-11-09';
const weekdayHours: OpeningInterval[] = [
  { dayOfWeek: 1, opensMinute: 8 * 60, closesMinute: 12 * 60 },
  { dayOfWeek: 1, opensMinute: 14 * 60, closesMinute: 18 * 60 },
];

describe('time zone helpers', () => {
  it('validates IANA zones', () => {
    expect(isValidTimeZone(NAIROBI)).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });

  it('converts local wall time to UTC (Nairobi +3)', () => {
    expect(zonedToUtc(MON, 8 * 60, NAIROBI).toISOString()).toBe(
      '2026-11-09T05:00:00.000Z',
    );
  });

  it('respects DST in New York', () => {
    // Before spring-forward (EST, -5) and after (EDT, -4).
    expect(zonedToUtc('2026-03-07', 8 * 60, NY).toISOString()).toBe(
      '2026-03-07T13:00:00.000Z',
    );
    expect(zonedToUtc('2026-03-08', 8 * 60, NY).toISOString()).toBe(
      '2026-03-08T12:00:00.000Z',
    );
    // After fall-back (EST again).
    expect(zonedToUtc('2026-11-01', 9 * 60, NY).toISOString()).toBe(
      '2026-11-01T14:00:00.000Z',
    );
  });

  it('computes the local date across the UTC date line', () => {
    // 22:30Z is already the next day in Nairobi.
    expect(localYmd(d('2026-11-09T22:30:00Z'), NAIROBI)).toBe('2026-11-10');
    expect(localYmd(d('2026-11-09T22:30:00Z'), NY)).toBe('2026-11-09');
  });

  it('does calendar math', () => {
    expect(dayOfWeekOf(MON)).toBe(1);
    expect(addDaysYmd('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysYmd('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('rejects impossible dates', () => {
    expect(() => dayOfWeekOf('2026-02-30')).toThrow();
    expect(() => dayOfWeekOf('nope')).toThrow();
  });
});

describe('generateSlots', () => {
  it('builds a grid per interval and skips closed days', () => {
    const slots = generateSlots({
      date: MON,
      timeZone: NAIROBI,
      slotMinutes: 60,
      hours: weekdayHours,
    });
    expect(slots).toHaveLength(8);
    expect(slots[0].startsAt.toISOString()).toBe('2026-11-09T05:00:00.000Z');
    expect(slots[0].endsAt.toISOString()).toBe('2026-11-09T06:00:00.000Z');
    // Gap 12:00-14:00 is not bookable.
    expect(slots[3].endsAt.toISOString()).toBe('2026-11-09T09:00:00.000Z');
    expect(slots[4].startsAt.toISOString()).toBe('2026-11-09T11:00:00.000Z');

    expect(
      generateSlots({
        date: '2026-11-10', // Tuesday, no hours
        timeZone: NAIROBI,
        slotMinutes: 60,
        hours: weekdayHours,
      }),
    ).toEqual([]);
  });

  it('drops a trailing partial slot', () => {
    const slots = generateSlots({
      date: MON,
      timeZone: NAIROBI,
      slotMinutes: 90,
      hours: [{ dayOfWeek: 1, opensMinute: 480, closesMinute: 700 }],
    });
    // 480-570, 570-660; 660-750 would exceed 700.
    expect(slots).toHaveLength(2);
  });

  it('returns nothing for a non-positive slot length', () => {
    expect(
      generateSlots({
        date: MON,
        timeZone: NAIROBI,
        slotMinutes: 0,
        hours: weekdayHours,
      }),
    ).toEqual([]);
  });

  it('uses the local weekday, not the UTC weekday', () => {
    // Sunday 23:00-24:00 local in Nairobi is Sunday 20:00-21:00Z, but a
    // 00:00-01:00 Monday-local slot is still Sunday in UTC.
    const slots = generateSlots({
      date: MON,
      timeZone: NAIROBI,
      slotMinutes: 60,
      hours: [{ dayOfWeek: 1, opensMinute: 0, closesMinute: 120 }],
    });
    expect(slots[0].startsAt.toISOString()).toBe('2026-11-08T21:00:00.000Z');
  });
});

describe('isWithinHours', () => {
  it('accepts ranges inside an interval, including exact edges', () => {
    expect(
      isWithinHours(
        range('2026-11-09T05:00:00Z', '2026-11-09T09:00:00Z'),
        NAIROBI,
        weekdayHours,
      ),
    ).toBe(true);
  });

  it('rejects ranges that spill past closing or span the gap', () => {
    expect(
      isWithinHours(
        range('2026-11-09T08:00:00Z', '2026-11-09T10:00:00Z'), // 11:00-13:00
        NAIROBI,
        weekdayHours,
      ),
    ).toBe(false);
    expect(
      isWithinHours(
        range('2026-11-09T04:00:00Z', '2026-11-09T06:00:00Z'), // opens 08:00
        NAIROBI,
        weekdayHours,
      ),
    ).toBe(false);
  });

  it('treats the next local midnight as minute 1440', () => {
    const late: OpeningInterval[] = [
      { dayOfWeek: 1, opensMinute: 22 * 60, closesMinute: 1440 },
    ];
    expect(
      isWithinHours(
        range('2026-11-09T19:00:00Z', '2026-11-09T21:00:00Z'), // 22:00-24:00
        NAIROBI,
        late,
      ),
    ).toBe(true);
    // Running past midnight is not allowed.
    expect(
      isWithinHours(
        range('2026-11-09T20:00:00Z', '2026-11-09T22:00:00Z'), // 23:00-01:00
        NAIROBI,
        late,
      ),
    ).toBe(false);
  });
});

describe('overlaps', () => {
  it('is half-open: touching ranges do not overlap', () => {
    const a = range('2026-11-09T05:00:00Z', '2026-11-09T06:00:00Z');
    const b = range('2026-11-09T06:00:00Z', '2026-11-09T07:00:00Z');
    expect(overlaps(a, b)).toBe(false);
    expect(overlaps(b, a)).toBe(false);
  });

  it('detects partial, contained and identical overlaps', () => {
    const a = range('2026-11-09T05:00:00Z', '2026-11-09T07:00:00Z');
    expect(
      overlaps(a, range('2026-11-09T06:59:00Z', '2026-11-09T08:00:00Z')),
    ).toBe(true);
    expect(
      overlaps(a, range('2026-11-09T05:30:00Z', '2026-11-09T06:00:00Z')),
    ).toBe(true);
    expect(overlaps(a, a)).toBe(true);
  });
});

describe('remainingCapacity', () => {
  const win = range('2026-11-09T05:00:00Z', '2026-11-09T07:00:00Z');

  it('is the full capacity with no bookings', () => {
    expect(remainingCapacity(2, [], win)).toBe(2);
  });

  it('ignores bookings that merely touch the window', () => {
    expect(
      remainingCapacity(
        1,
        [range('2026-11-09T07:00:00Z', '2026-11-09T08:00:00Z')],
        win,
      ),
    ).toBe(1);
  });

  it('uses peak concurrency, not the booking count', () => {
    // Two back-to-back bookings never run at the same time → 1 court used.
    const sequential = [
      range('2026-11-09T05:00:00Z', '2026-11-09T06:00:00Z'),
      range('2026-11-09T06:00:00Z', '2026-11-09T07:00:00Z'),
    ];
    expect(remainingCapacity(2, sequential, win)).toBe(1);

    // Two overlapping bookings do → both courts used.
    const concurrent = [
      range('2026-11-09T05:00:00Z', '2026-11-09T06:30:00Z'),
      range('2026-11-09T06:00:00Z', '2026-11-09T07:00:00Z'),
    ];
    expect(remainingCapacity(2, concurrent, win)).toBe(0);
  });

  it('never goes negative', () => {
    const b = range('2026-11-09T05:00:00Z', '2026-11-09T07:00:00Z');
    expect(remainingCapacity(1, [b, b, b], win)).toBe(0);
  });
});

describe('validateBookingWindow', () => {
  const now = d('2026-11-04T09:00:00Z');
  const base = {
    now,
    timeZone: NAIROBI,
    slotMinutes: 60,
    maxSlots: 3,
    advanceDays: 30,
    hours: weekdayHours,
  };

  it('accepts a valid 2-slot request', () => {
    expect(
      validateBookingWindow({
        ...base,
        range: range('2026-11-09T05:00:00Z', '2026-11-09T07:00:00Z'),
      }),
    ).toBeNull();
  });

  it('flags a reversed or empty range', () => {
    expect(
      validateBookingWindow({
        ...base,
        range: range('2026-11-09T06:00:00Z', '2026-11-09T06:00:00Z'),
      }),
    ).toBe('BAD_RANGE');
  });

  it('flags the past', () => {
    expect(
      validateBookingWindow({
        ...base,
        now: d('2026-11-09T05:30:00Z'),
        range: range('2026-11-09T05:00:00Z', '2026-11-09T06:00:00Z'),
      }),
    ).toBe('IN_PAST');
  });

  it('flags requests beyond the advance window (local date)', () => {
    // Today (Nairobi) 2026-11-04 + 3 days = last bookable 2026-11-07.
    expect(
      validateBookingWindow({
        ...base,
        advanceDays: 3,
        range: range('2026-11-09T05:00:00Z', '2026-11-09T06:00:00Z'),
      }),
    ).toBe('TOO_FAR_AHEAD');
  });

  it('flags outside-hours and off-grid starts', () => {
    expect(
      validateBookingWindow({
        ...base,
        range: range('2026-11-09T09:00:00Z', '2026-11-09T10:00:00Z'), // 12-13
      }),
    ).toBe('OUTSIDE_HOURS');
    expect(
      validateBookingWindow({
        ...base,
        range: range('2026-11-09T05:30:00Z', '2026-11-09T06:30:00Z'), // 08:30
      }),
    ).toBe('OFF_GRID');
    expect(
      validateBookingWindow({
        ...base,
        range: range('2026-11-09T05:00:00Z', '2026-11-09T06:30:00Z'), // 90 min
      }),
    ).toBe('OFF_GRID');
  });

  it('measures the grid from the interval opening, not midnight', () => {
    const odd: OpeningInterval[] = [
      { dayOfWeek: 1, opensMinute: 8 * 60 + 30, closesMinute: 12 * 60 + 30 },
    ];
    expect(
      validateBookingWindow({
        ...base,
        hours: odd,
        range: range('2026-11-09T05:30:00Z', '2026-11-09T06:30:00Z'), // 08:30
      }),
    ).toBeNull();
  });

  it('enforces the max slot count', () => {
    expect(
      validateBookingWindow({
        ...base,
        maxSlots: 2,
        range: range('2026-11-09T05:00:00Z', '2026-11-09T08:00:00Z'),
      }),
    ).toBe('TOO_LONG');
  });
});

describe('validateOpeningHours', () => {
  it('accepts several non-overlapping intervals per day', () => {
    expect(validateOpeningHours(weekdayHours)).toBeNull();
  });

  it('allows back-to-back intervals', () => {
    expect(
      validateOpeningHours([
        { dayOfWeek: 2, opensMinute: 480, closesMinute: 720 },
        { dayOfWeek: 2, opensMinute: 720, closesMinute: 900 },
      ]),
    ).toBeNull();
  });

  it('rejects overlap, inverted and out-of-range input', () => {
    expect(
      validateOpeningHours([
        { dayOfWeek: 2, opensMinute: 480, closesMinute: 720 },
        { dayOfWeek: 2, opensMinute: 700, closesMinute: 900 },
      ]),
    ).toBe('OVERLAP');
    expect(
      validateOpeningHours([
        { dayOfWeek: 2, opensMinute: 720, closesMinute: 720 },
      ]),
    ).toBe('CLOSES_BEFORE_OPENS');
    expect(
      validateOpeningHours([
        { dayOfWeek: 7, opensMinute: 0, closesMinute: 60 },
      ]),
    ).toBe('BAD_DAY');
    expect(
      validateOpeningHours([
        { dayOfWeek: 1, opensMinute: 0, closesMinute: 1500 },
      ]),
    ).toBe('BAD_MINUTES');
  });

  it('lets different days overlap in minutes', () => {
    expect(
      validateOpeningHours([
        { dayOfWeek: 1, opensMinute: 480, closesMinute: 720 },
        { dayOfWeek: 2, opensMinute: 480, closesMinute: 720 },
      ]),
    ).toBeNull();
  });
});

describe('openMinutesInRange', () => {
  it('sums open minutes over a calendar range, inclusive', () => {
    // Monday has 8h open; the range holds two Mondays (9th and 16th).
    expect(openMinutesInRange(weekdayHours, '2026-11-09', '2026-11-16')).toBe(
      2 * 8 * 60,
    );
    expect(openMinutesInRange(weekdayHours, '2026-11-10', '2026-11-15')).toBe(
      0,
    );
  });
});
