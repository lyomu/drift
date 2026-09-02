import { ErasureScheduler } from './erasure.scheduler';
import { ERASURE_RETENTION_DAYS, ErasureService } from './erasure.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ErasureScheduler', () => {
  let prisma: {
    privacyRequest: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let erasure: { eraseUser: jest.Mock };
  let scheduler: ErasureScheduler;

  beforeEach(() => {
    prisma = {
      privacyRequest: { findMany: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(prisma),
      ),
    };
    erasure = { eraseUser: jest.fn() };
    scheduler = new ErasureScheduler(
      prisma as unknown as PrismaService,
      erasure as unknown as ErasureService,
    );
  });

  it('only picks up requests older than the retention window', async () => {
    prisma.privacyRequest.findMany.mockResolvedValue([]);

    await scheduler.runDueErasures();

    const where = prisma.privacyRequest.findMany.mock.calls[0][0].where;
    expect(where.type).toBe('DELETION');
    expect(where.status).toBe('PENDING');

    const cutoff = where.createdAt.lte as Date;
    const days = (Date.now() - cutoff.getTime()) / 86_400_000;
    // Anything newer than this is still inside the window and must be left be.
    expect(Math.round(days)).toBe(ERASURE_RETENTION_DAYS);
  });

  it('does nothing at all when nothing is due', async () => {
    prisma.privacyRequest.findMany.mockResolvedValue([]);

    await scheduler.runDueErasures();

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(erasure.eraseUser).not.toHaveBeenCalled();
  });

  it('erases each due request and marks it fulfilled', async () => {
    prisma.privacyRequest.findMany.mockResolvedValue([
      { id: 'req-1', userId: 'user-1' },
      { id: 'req-2', userId: 'user-2' },
    ]);

    await scheduler.runDueErasures();

    expect(erasure.eraseUser).toHaveBeenCalledTimes(2);
    expect(erasure.eraseUser).toHaveBeenCalledWith(prisma, 'user-1', 'req-1');
    expect(prisma.privacyRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'req-1' },
        data: expect.objectContaining({ status: 'FULFILLED' }),
      }),
    );
  });

  it('carries on after one failure, and leaves that request for tomorrow', async () => {
    prisma.privacyRequest.findMany.mockResolvedValue([
      { id: 'bad', userId: 'user-1' },
      { id: 'good', userId: 'user-2' },
    ]);
    erasure.eraseUser.mockImplementation(
      async (_tx: unknown, _userId: string, requestId: string) => {
        if (requestId === 'bad') throw new Error('constraint violation');
      },
    );

    // One poisonous row must not stop the queue, and must not throw out of a
    // cron handler where nothing would catch it.
    await expect(scheduler.runDueErasures()).resolves.toBeUndefined();

    expect(erasure.eraseUser).toHaveBeenCalledTimes(2);
    const updated = prisma.privacyRequest.update.mock.calls.map(
      (c) => c[0].where.id,
    );
    // The failed one stays PENDING, so the next run retries it.
    expect(updated).toEqual(['good']);
  });

  it('uses a separate transaction per request', async () => {
    prisma.privacyRequest.findMany.mockResolvedValue([
      { id: 'req-1', userId: 'user-1' },
      { id: 'req-2', userId: 'user-2' },
    ]);

    await scheduler.runDueErasures();

    // Not one big transaction: a late failure must not roll back erasures
    // that already succeeded.
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });
});
