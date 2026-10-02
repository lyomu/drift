/**
 * The two derived numbers on Home's hero card: the activity streak and
 * progress through the current level band.
 *
 * Both are pure functions over dates/levels so they can be tested without a
 * database, and so the rules live in one readable place rather than inside a
 * Prisma query.
 */

/** Monday-start week, normalised to midnight UTC. */
export function startOfWeek(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // getUTCDay(): 0 = Sunday. Shift so Monday is 0.
  const dayFromMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayFromMonday);
  return d;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Consecutive weeks, counting back from now, in which the player did at least
 * one thing: logged a practice session or played a match.
 *
 * WEEKLY, NOT DAILY — a deliberate product decision (2026-10). Tennis is not
 * a daily habit for most people, so a daily streak would read 0 or 1 almost
 * always: useless as a signal and quietly shaming. A week is the unit people
 * actually plan tennis in.
 *
 * The current week is a grace period, not a requirement: a streak is still
 * alive if the most recent activity was last week, because Monday morning
 * should not wipe out a run the player has not yet had a chance to extend.
 * So the count starts from this week if it has activity, otherwise from last
 * week, and stops at the first gap.
 *
 * @param activityDates every practice/match date; order and duplicates do not
 *   matter, they are bucketed by week.
 */
export function activityStreakWeeks(
  activityDates: Date[],
  now: Date = new Date(),
): number {
  if (activityDates.length === 0) return 0;

  const activeWeeks = new Set(
    activityDates.map((d) => startOfWeek(d).getTime()),
  );

  const thisWeek = startOfWeek(now).getTime();
  // Start on this week when it counts, else last week (the grace period).
  // If neither has activity the streak is broken, whatever came before.
  let cursor = activeWeeks.has(thisWeek) ? thisWeek : thisWeek - WEEK_MS;
  if (!activeWeeks.has(cursor)) return 0;

  let streak = 0;
  while (activeWeeks.has(cursor)) {
    streak += 1;
    cursor -= WEEK_MS;
  }
  return streak;
}

/**
 * The level bands below the top one, matching `labelForLevel` exactly:
 * Beginner 1.0–2.5, Foundational 2.5–4.0, Intermediate 4.0–5.5.
 *
 * Advanced (5.5 and up) is deliberately absent. It is the last band, so there
 * is no next one to fill toward; a bar pointing at the 7.0 scale ceiling would
 * be measuring something different from the three below it.
 */
const BANDS = [
  { floor: 1.0, ceiling: 2.5 },
  { floor: 2.5, ceiling: 4.0 },
  { floor: 4.0, ceiling: 5.5 },
];

export interface LevelProgress {
  /** The level at the top of the current band — what the bar fills toward. */
  nextLevel: number;
  /** 0–100, rounded. */
  percent: number;
}

/**
 * How far through the current level band this player is.
 *
 * CAVEAT, recorded because it will look like a bug otherwise: `level` only
 * changes when the player completes an assessment (`assessment.service.ts` is
 * the sole writer of `systemSuggestedLevel`) or edits their self-selected
 * level. Nothing accrues toward the next band in between, so this bar sits
 * still between assessments by design. It describes where the player stands,
 * not momentum. This was a deliberate choice over a skill-score-based bar,
 * which would move more often but measure something else.
 *
 * Returns null for an un-levelled player and for anyone in the top band,
 * where there is no next level to progress toward — the caller hides the bar
 * rather than showing a full one.
 */
export function levelProgress(level: number | null): LevelProgress | null {
  if (level === null) return null;

  for (const { floor, ceiling } of BANDS) {
    if (level < ceiling) {
      // Below the first floor (shouldn't happen — levels start at 1.0), clamp
      // rather than return a negative percentage.
      const through = Math.max(0, level - floor);
      return {
        nextLevel: ceiling,
        percent: Math.min(100, Math.round((through / (ceiling - floor)) * 100)),
      };
    }
  }
  // Advanced: the top band, nothing left to progress toward.
  return null;
}
