import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { LAST_ACTIVE_THROTTLE_MS } from '../../common/last-active';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy activity tracking', () => {
  let findUnique: jest.Mock;
  let updateMany: jest.Mock;
  let strategy: JwtStrategy;

  beforeEach(() => {
    findUnique = jest.fn();
    updateMany = jest.fn().mockResolvedValue({ count: 1 });
    strategy = new JwtStrategy(
      { get: () => 'secret' } as unknown as ConfigService,
      { user: { findUnique, updateMany } } as unknown as PrismaService,
    );
  });

  const flush = () => new Promise((resolve) => setImmediate(resolve));

  it('records activity for an authenticated user who has none recorded', async () => {
    findUnique.mockResolvedValue({
      id: 'u1',
      accountStatus: 'ACTIVE',
      lastActiveAt: null,
    });
    await expect(strategy.validate({ sub: 'u1' })).resolves.toEqual({
      userId: 'u1',
    });
    await flush();
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it('records activity once the last write is over an hour old', async () => {
    findUnique.mockResolvedValue({
      id: 'u1',
      accountStatus: 'ACTIVE',
      lastActiveAt: new Date(Date.now() - LAST_ACTIVE_THROTTLE_MS - 1000),
    });
    await strategy.validate({ sub: 'u1' });
    await flush();
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it('performs NO write while the stored timestamp is fresh', async () => {
    findUnique.mockResolvedValue({
      id: 'u1',
      accountStatus: 'ACTIVE',
      lastActiveAt: new Date(Date.now() - 60_000),
    });
    // Many requests in the same window (a screen firing parallel calls).
    await Promise.all(
      Array.from({ length: 10 }, () => strategy.validate({ sub: 'u1' })),
    );
    await flush();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('does not count suspended or deleted users, and still rejects them', async () => {
    for (const accountStatus of ['SUSPENDED', 'DELETED']) {
      findUnique.mockResolvedValue({
        id: 'u1',
        accountStatus,
        lastActiveAt: null,
      });
      await expect(strategy.validate({ sub: 'u1' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    }
    await flush();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('does not count a platform-admin token as user activity', async () => {
    await expect(
      strategy.validate({ sub: 'admin-1', scope: 'platform' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findUnique).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('a failed activity write does not fail the request', async () => {
    findUnique.mockResolvedValue({
      id: 'u1',
      accountStatus: 'ACTIVE',
      lastActiveAt: null,
    });
    updateMany.mockRejectedValue(new Error('db down'));
    await expect(strategy.validate({ sub: 'u1' })).resolves.toEqual({
      userId: 'u1',
    });
    await flush();
  });
});
