import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  user: Record<string, jest.Mock>;
  tennisProfile: Record<string, jest.Mock>;
  refreshToken: Record<string, jest.Mock>;
  privacyRequest: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createMockPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@test.com',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    tennisProfile: {
      update: jest.fn().mockResolvedValue({
        skillBreakdownVisibility: 'EVERYONE',
        availabilityVisibility: 'CONNECTIONS_ONLY',
      }),
      findUnique: jest.fn().mockResolvedValue({
        skillBreakdownVisibility: 'CONNECTIONS_ONLY',
        availabilityVisibility: 'CONNECTIONS_ONLY',
      }),
    },
    refreshToken: { updateMany: jest.fn().mockResolvedValue({}) },
    privacyRequest: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockResolvedValue({ id: 'req-1', createdAt: new Date() }),
    },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return (arg as (tx: MockPrisma) => Promise<unknown>)(prisma);
  });

  return prisma;
}

describe('UsersService', () => {
  let service: UsersService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new UsersService(prisma as unknown as PrismaService);
  });

  describe('findById', () => {
    it('throws when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('never returns passwordHash', async () => {
      const result = await service.findById('user-1');
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('updateProfile', () => {
    it('updates only the User table when no dominantHand is given', async () => {
      await service.updateProfile('user-1', { firstName: 'New' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { firstName: 'New', lastName: undefined, bio: undefined },
      });
      expect(prisma.tennisProfile.update).not.toHaveBeenCalled();
    });

    it('updates the TennisProfile table when dominantHand is given', async () => {
      await service.updateProfile('user-1', { dominantHand: 'LEFT' });
      expect(prisma.tennisProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { dominantHand: 'LEFT' },
      });
    });
  });

  describe('updatePrivacySettings', () => {
    it('passes only the given fields through to the update', async () => {
      const result = await service.updatePrivacySettings('user-1', {
        skillBreakdownVisibility: 'EVERYONE',
      });
      expect(prisma.tennisProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data: expect.objectContaining({
            skillBreakdownVisibility: 'EVERYONE',
          }),
        }),
      );
      expect(result.skillBreakdownVisibility).toBe('EVERYONE');
    });
  });

  describe('deleteAccount', () => {
    it('sets accountStatus to DELETED and revokes active refresh tokens', async () => {
      await service.deleteAccount('user-1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { accountStatus: 'DELETED' },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('files a pending deletion request so the erasure is actually recorded', async () => {
      // Before this, tapping Delete Account set a flag and nothing else — the
      // request existed only in the person's head, with no clock running.
      const result = await service.deleteAccount('user-1');

      expect(prisma.privacyRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'DELETION',
            status: 'PENDING',
          }),
        }),
      );
      expect(result.retentionDays).toBe(30);
      expect(result.erasureScheduledFor).toEqual(expect.any(String));
    });

    it('reuses an existing pending request instead of restarting the clock', async () => {
      const filedAt = new Date('2026-09-01T00:00:00.000Z');
      prisma.privacyRequest.findFirst.mockResolvedValue({
        id: 'req-existing',
        createdAt: filedAt,
      });

      const result = await service.deleteAccount('user-1');

      // A second tap must not push the erasure date 30 days further out.
      expect(prisma.privacyRequest.create).not.toHaveBeenCalled();
      expect(result.erasureScheduledFor).toBe('2026-10-01T00:00:00.000Z');
    });
  });
});
