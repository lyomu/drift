import type { PrismaClient } from '@prisma/client';

/**
 * `User.lastActiveAt` — "the last time this person did something while signed
 * in", on any client (mobile or web: both use the same player JWT).
 *
 * Deliberately NOT `lastLoginAt`. A login is one event; activity is a rolling
 * signal and is refreshed by ordinary authenticated requests, so a person
 * who stays signed in for 30 days still reads as active. If login tracking is
 * added later it gets its own column.
 *
 * Only call this from paths that have just proven a real user is present: a
 * successful sign-in/refresh, or a request that passed the player JWT guard.
 * Never from health checks, schedulers, webhooks or unauthenticated routes.
 *
 * `null` means "never recorded" and is shown as such — existing users are not
 * back-filled, so no historical activity is invented.
 */
export const LAST_ACTIVE_THROTTLE_MS = 60 * 60 * 1000;

/** True when a stored value is old enough (or absent) that a write is due. */
export function isLastActiveStale(
  lastActiveAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  return (
    !lastActiveAt || now.getTime() - lastActiveAt.getTime() >= LAST_ACTIVE_THROTTLE_MS
  );
}

/**
 * Record activity at most once per throttle window per user.
 *
 * The staleness check is repeated inside the UPDATE's WHERE clause, so it is
 * atomic: concurrent requests (several app calls fire at once on screen load)
 * race to the same row, exactly one matches, and the rest write nothing. No
 * read-modify-write, no lock. Callers that already hold the user row should
 * pre-check with `isLastActiveStale` to skip the round trip entirely.
 *
 * Best-effort: a failure here must never fail the user's request.
 */
export async function touchLastActive(
  prisma: Pick<PrismaClient, 'user'>,
  userId: string,
  now: Date = new Date(),
): Promise<boolean> {
  try {
    const { count } = await prisma.user.updateMany({
      where: {
        id: userId,
        OR: [
          { lastActiveAt: null },
          {
            lastActiveAt: {
              lte: new Date(now.getTime() - LAST_ACTIVE_THROTTLE_MS),
            },
          },
        ],
      },
      data: { lastActiveAt: now },
    });
    return count === 1;
  } catch {
    return false;
  }
}

export type LastActiveBucket =
  | 'today'
  | '7d'
  | '30d'
  | 'inactive_90d'
  | 'never';

export const LAST_ACTIVE_BUCKETS: readonly LastActiveBucket[] = [
  'today',
  '7d',
  '30d',
  'inactive_90d',
  'never',
];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Prisma filter for an admin "last active" bucket. All boundaries are computed
 * in UTC, matching how the column is stored (`timestamp(3)` holds UTC), so the
 * result does not depend on the server's or the admin's timezone:
 *  - today:        since 00:00 UTC today
 *  - 7d / 30d:     rolling windows ending now
 *  - inactive_90d: last active more than 90 days ago (never-active excluded)
 *  - never:        no recorded activity
 */
export function lastActiveWhere(
  bucket: LastActiveBucket,
  now: Date = new Date(),
): { lastActiveAt: null | { gte?: Date; lt?: Date } } {
  switch (bucket) {
    case 'today':
      return {
        lastActiveAt: {
          gte: new Date(
            Date.UTC(
              now.getUTCFullYear(),
              now.getUTCMonth(),
              now.getUTCDate(),
            ),
          ),
        },
      };
    case '7d':
      return { lastActiveAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } };
    case '30d':
      return { lastActiveAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } };
    case 'inactive_90d':
      return { lastActiveAt: { lt: new Date(now.getTime() - 90 * DAY_MS) } };
    case 'never':
      return { lastActiveAt: null };
  }
}
