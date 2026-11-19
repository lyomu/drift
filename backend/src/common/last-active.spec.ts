import {
  LAST_ACTIVE_THROTTLE_MS,
  isLastActiveStale,
  lastActiveWhere,
  touchLastActive,
} from './last-active';

const HOUR = LAST_ACTIVE_THROTTLE_MS;

describe('isLastActiveStale (throttle decision)', () => {
  const now = new Date('2026-11-19T12:00:00.000Z');

  it('is stale when activity was never recorded', () => {
    expect(isLastActiveStale(null, now)).toBe(true);
    expect(isLastActiveStale(undefined, now)).toBe(true);
  });

  it('is fresh inside the one-hour window', () => {
    expect(isLastActiveStale(new Date(now.getTime() - 1), now)).toBe(false);
    expect(isLastActiveStale(new Date(now.getTime() - (HOUR - 1)), now)).toBe(
      false,
    );
  });

  it('is stale exactly at, and after, one hour', () => {
    expect(isLastActiveStale(new Date(now.getTime() - HOUR), now)).toBe(true);
    expect(isLastActiveStale(new Date(now.getTime() - 5 * HOUR), now)).toBe(
      true,
    );
  });
});

describe('touchLastActive', () => {
  const now = new Date('2026-11-19T12:00:00.000Z');

  function prismaWith(updateMany: jest.Mock) {
    return { user: { updateMany } } as never;
  }

  it('issues one atomic conditional update that re-checks staleness in SQL', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const written = await touchLastActive(prismaWith(updateMany), 'u1', now);

    expect(written).toBe(true);
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'u1',
        OR: [
          { lastActiveAt: null },
          { lastActiveAt: { lte: new Date(now.getTime() - HOUR) } },
        ],
      },
      data: { lastActiveAt: now },
    });
  });

  it('reports no write when a concurrent request already updated the row', async () => {
    // The WHERE clause matched nothing: another request won the race.
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    expect(await touchLastActive(prismaWith(updateMany), 'u1', now)).toBe(
      false,
    );
  });

  it('never throws — activity tracking must not fail a request', async () => {
    const updateMany = jest.fn().mockRejectedValue(new Error('db down'));
    await expect(
      touchLastActive(prismaWith(updateMany), 'u1', now),
    ).resolves.toBe(false);
  });

  it('only ever writes lastActiveAt (nothing resembling a login timestamp)', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    await touchLastActive(prismaWith(updateMany), 'u1', now);
    const { data } = updateMany.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(Object.keys(data)).toEqual(['lastActiveAt']);
  });
});

describe('lastActiveWhere (admin activity filter)', () => {
  // 23:30 UTC is already "tomorrow" in Nairobi and still "today" in New York;
  // the boundary must not move with either, or the filter would disagree
  // between an admin's browser, the server and the database.
  const now = new Date('2026-11-19T23:30:00.000Z');

  it('today starts at 00:00 UTC', () => {
    expect(lastActiveWhere('today', now)).toEqual({
      lastActiveAt: { gte: new Date('2026-11-19T00:00:00.000Z') },
    });
  });

  it('today does not depend on the process timezone', () => {
    const original = process.env.TZ;
    try {
      for (const tz of ['Africa/Nairobi', 'America/New_York', 'Pacific/Auckland']) {
        process.env.TZ = tz;
        expect(lastActiveWhere('today', now)).toEqual({
          lastActiveAt: { gte: new Date('2026-11-19T00:00:00.000Z') },
        });
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it('7d and 30d are rolling windows ending now', () => {
    expect(lastActiveWhere('7d', now)).toEqual({
      lastActiveAt: { gte: new Date('2026-11-12T23:30:00.000Z') },
    });
    expect(lastActiveWhere('30d', now)).toEqual({
      lastActiveAt: { gte: new Date('2026-10-20T23:30:00.000Z') },
    });
  });

  it('inactive_90d means last active over 90 days ago and excludes never-active users', () => {
    const where = lastActiveWhere('inactive_90d', now);
    expect(where).toEqual({
      lastActiveAt: { lt: new Date('2026-08-21T23:30:00.000Z') },
    });
    // A `lt` comparison never matches NULL in SQL, so users with no recorded
    // activity are not mislabelled as "inactive for 90 days".
    expect(where.lastActiveAt).not.toBeNull();
  });

  it('never matches only users with no recorded activity', () => {
    expect(lastActiveWhere('never', now)).toEqual({ lastActiveAt: null });
  });
});
