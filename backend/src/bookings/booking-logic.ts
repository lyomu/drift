/**
 * Pure court-booking logic: slot generation, opening-hours checks, overlap
 * and capacity. No Prisma, no Nest — everything is unit-testable. Time zones
 * are handled with `Intl` (no dependency); bookings are stored in UTC.
 */

export interface OpeningInterval {
  /** 0 = Sunday .. 6 = Saturday, in the court's local calendar. */
  dayOfWeek: number;
  /** Minutes from local midnight, 0..1440. */
  opensMinute: number;
  closesMinute: number;
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
}

export interface TimeRange {
  startsAt: Date;
  endsAt: Date;
}

export type BookingWindowError =
  | 'BAD_RANGE'
  | 'IN_PAST'
  | 'TOO_FAR_AHEAD'
  | 'OUTSIDE_HOURS'
  | 'OFF_GRID'
  | 'TOO_LONG';

interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

/** True when `timeZone` is a valid IANA zone for this runtime. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const out: Record<string, number> = {};
  for (const p of formatterFor(timeZone).formatToParts(date)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour % 24,
    minute: out.minute,
    second: out.second,
  };
}

/** Offset of `timeZone` from UTC at `date`, in minutes (Nairobi = +180). */
export function tzOffsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  const truncated = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((asUtc - truncated) / 60000);
}

/**
 * The UTC instant at which the wall clock in `timeZone` reads
 * `ymd` + `minuteOfDay`. Minutes may be 0..1440 (1440 = next local midnight).
 * In a DST gap the result is the instant just after the gap.
 */
export function zonedToUtc(
  ymd: string,
  minuteOfDay: number,
  timeZone: string,
): Date {
  const { year, month, day } = parseYmd(ymd);
  const naive = Date.UTC(year, month - 1, day, 0, minuteOfDay);
  const off1 = tzOffsetMinutes(new Date(naive), timeZone);
  let t = naive - off1 * 60000;
  const off2 = tzOffsetMinutes(new Date(t), timeZone);
  if (off2 !== off1) t = naive - off2 * 60000;
  return new Date(t);
}

export function parseYmd(ymd: string): {
  year: number;
  month: number;
  day: number;
} {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) throw new Error(`Invalid date "${ymd}", expected YYYY-MM-DD`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date "${ymd}"`);
  }
  return { year, month, day };
}

/** `YYYY-MM-DD` of `date` on the wall clock of `timeZone`. */
export function localYmd(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Minutes from local midnight of `date` in `timeZone`. */
export function localMinuteOfDay(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  return p.hour * 60 + p.minute;
}

/** Day of week (0 = Sunday) of a `YYYY-MM-DD` calendar date. */
export function dayOfWeekOf(ymd: string): number {
  const { year, month, day } = parseYmd(ymd);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Adds whole calendar days to a `YYYY-MM-DD`. */
export function addDaysYmd(ymd: string, days: number): string {
  const { year, month, day } = parseYmd(ymd);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function intervalsFor(
  hours: OpeningInterval[],
  dayOfWeek: number,
): OpeningInterval[] {
  return hours
    .filter((h) => h.dayOfWeek === dayOfWeek && h.closesMinute > h.opensMinute)
    .sort((a, b) => a.opensMinute - b.opensMinute);
}

/** Every bookable slot on local calendar day `ymd`, in start order. */
export function generateSlots(args: {
  date: string;
  timeZone: string;
  slotMinutes: number;
  hours: OpeningInterval[];
}): Slot[] {
  const { date, timeZone, slotMinutes, hours } = args;
  if (!(slotMinutes > 0)) return [];
  const slots: Slot[] = [];
  const seen = new Set<number>();
  for (const iv of intervalsFor(hours, dayOfWeekOf(date))) {
    for (
      let m = iv.opensMinute;
      m + slotMinutes <= iv.closesMinute;
      m += slotMinutes
    ) {
      const startsAt = zonedToUtc(date, m, timeZone);
      if (seen.has(startsAt.getTime())) continue;
      seen.add(startsAt.getTime());
      slots.push({
        startsAt,
        endsAt: zonedToUtc(date, m + slotMinutes, timeZone),
      });
    }
  }
  return slots;
}

/**
 * The local interval that fully contains [startsAt, endsAt), if any. The
 * range must sit inside one local calendar day (it may end exactly at the
 * next local midnight, which counts as minute 1440).
 */
export function containingInterval(
  range: TimeRange,
  timeZone: string,
  hours: OpeningInterval[],
): {
  interval: OpeningInterval;
  startMinute: number;
  endMinute: number;
} | null {
  const ymd = localYmd(range.startsAt, timeZone);
  const startMinute = localMinuteOfDay(range.startsAt, timeZone);
  const endYmd = localYmd(range.endsAt, timeZone);
  const endMinuteRaw = localMinuteOfDay(range.endsAt, timeZone);
  let endMinute: number;
  if (endYmd === ymd) {
    endMinute = endMinuteRaw;
  } else if (endYmd === addDaysYmd(ymd, 1) && endMinuteRaw === 0) {
    endMinute = 1440;
  } else {
    return null;
  }
  for (const iv of intervalsFor(hours, dayOfWeekOf(ymd))) {
    if (startMinute >= iv.opensMinute && endMinute <= iv.closesMinute) {
      return { interval: iv, startMinute, endMinute };
    }
  }
  return null;
}

export function isWithinHours(
  range: TimeRange,
  timeZone: string,
  hours: OpeningInterval[],
): boolean {
  return containingInterval(range, timeZone, hours) !== null;
}

/** Half-open overlap: touching ranges (a.end === b.start) do NOT overlap. */
export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return (
    a.startsAt.getTime() < b.endsAt.getTime() &&
    b.startsAt.getTime() < a.endsAt.getTime()
  );
}

/**
 * Free capacity over [range): `capacity` minus the peak number of `booked`
 * ranges that are simultaneously active inside the window. Never negative.
 */
export function remainingCapacity(
  capacity: number,
  booked: TimeRange[],
  range: TimeRange,
): number {
  const relevant = booked.filter((b) => overlaps(b, range));
  if (relevant.length === 0) return Math.max(0, capacity);
  const checkpoints = new Set<number>([range.startsAt.getTime()]);
  for (const b of relevant) {
    const s = b.startsAt.getTime();
    if (s > range.startsAt.getTime() && s < range.endsAt.getTime()) {
      checkpoints.add(s);
    }
  }
  let peak = 0;
  for (const t of checkpoints) {
    const active = relevant.filter(
      (b) => b.startsAt.getTime() <= t && t < b.endsAt.getTime(),
    ).length;
    peak = Math.max(peak, active);
  }
  return Math.max(0, capacity - peak);
}

/**
 * Validates a requested booking window against a court's rules. Returns the
 * first violated rule, or null when the window is acceptable. (Capacity and
 * the per-player open-request cap are database-backed and live in the
 * service.)
 */
export function validateBookingWindow(args: {
  range: TimeRange;
  now: Date;
  timeZone: string;
  slotMinutes: number;
  maxSlots: number;
  advanceDays: number;
  hours: OpeningInterval[];
}): BookingWindowError | null {
  const { range, now, timeZone, slotMinutes, maxSlots, advanceDays, hours } =
    args;
  const startMs = range.startsAt.getTime();
  const endMs = range.endsAt.getTime();
  if (!(endMs > startMs)) return 'BAD_RANGE';
  if (startMs < now.getTime()) return 'IN_PAST';

  // Advance window: the local calendar date of the start may be at most
  // `advanceDays` days after today's local date.
  const today = localYmd(now, timeZone);
  const lastDay = addDaysYmd(today, advanceDays);
  if (localYmd(range.startsAt, timeZone) > lastDay) return 'TOO_FAR_AHEAD';

  const found = containingInterval(range, timeZone, hours);
  if (!found) return 'OUTSIDE_HOURS';

  const { interval, startMinute, endMinute } = found;
  const length = endMinute - startMinute;
  if (
    (startMinute - interval.opensMinute) % slotMinutes !== 0 ||
    length % slotMinutes !== 0
  ) {
    return 'OFF_GRID';
  }
  const slots = length / slotMinutes;
  if (slots < 1 || slots > maxSlots) return 'TOO_LONG';
  return null;
}

/**
 * Checks weekly-hours input from the club console: each interval must close
 * after it opens, sit in 0..1440, and intervals on one day may not overlap.
 * Returns a human-readable code for the first problem, or null.
 */
export function validateOpeningHours(
  hours: OpeningInterval[],
): 'BAD_DAY' | 'BAD_MINUTES' | 'CLOSES_BEFORE_OPENS' | 'OVERLAP' | null {
  for (const h of hours) {
    if (!Number.isInteger(h.dayOfWeek) || h.dayOfWeek < 0 || h.dayOfWeek > 6) {
      return 'BAD_DAY';
    }
    if (
      !Number.isInteger(h.opensMinute) ||
      !Number.isInteger(h.closesMinute) ||
      h.opensMinute < 0 ||
      h.closesMinute > 1440
    ) {
      return 'BAD_MINUTES';
    }
    if (h.closesMinute <= h.opensMinute) return 'CLOSES_BEFORE_OPENS';
  }
  for (let d = 0; d < 7; d++) {
    const day = hours
      .filter((h) => h.dayOfWeek === d)
      .sort((a, b) => a.opensMinute - b.opensMinute);
    for (let i = 1; i < day.length; i++) {
      if (day[i].opensMinute < day[i - 1].closesMinute) return 'OVERLAP';
    }
  }
  return null;
}

/** Total minutes the court is open between local dates [fromYmd, toYmd] inclusive. */
export function openMinutesInRange(
  hours: OpeningInterval[],
  fromYmd: string,
  toYmd: string,
): number {
  let total = 0;
  for (let d = fromYmd; d <= toYmd; d = addDaysYmd(d, 1)) {
    for (const iv of intervalsFor(hours, dayOfWeekOf(d))) {
      total += iv.closesMinute - iv.opensMinute;
    }
  }
  return total;
}
