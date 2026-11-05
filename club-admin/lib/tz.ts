/** Time-zone helpers for the booking screens (court-local wall time <-> UTC), via Intl only. */

function parts(date: Date, timeZone: string) {
  const out: Record<string, number> = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out;
}

function offsetMinutes(date: Date, timeZone: string) {
  const p = parts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** `YYYY-MM-DD` for `date` on the wall clock of `timeZone`. */
export function localYmd(date: Date, timeZone: string) {
  const p = parts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** The UTC instant at which `timeZone`'s wall clock reads `ymd` + `hhmm` ("09:30"). */
export function zonedToUtc(ymd: string, hhmm: string, timeZone: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  const off1 = offsetMinutes(new Date(naive), timeZone);
  let t = naive - off1 * 60000;
  const off2 = offsetMinutes(new Date(t), timeZone);
  if (off2 !== off1) t = naive - off2 * 60000;
  return new Date(t);
}

export function addDays(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1, d + days));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
}

/** Minutes from midnight -> "HH:MM" (1440 shows as "24:00"). */
export function minuteToHhmm(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

export function hhmmToMinute(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
