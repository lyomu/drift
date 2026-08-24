import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClubsAdminService } from './clubs-admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type MockPrisma = {
  club: Record<string, jest.Mock>;
  clubMembership: Record<string, jest.Mock>;
  user: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createMockPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    club: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    clubMembership: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    async (fn: (tx: MockPrisma) => Promise<unknown>) => fn(prisma),
  );
  return prisma;
}

describe('ClubsAdminService', () => {
  let service: ClubsAdminService;
  let prisma: MockPrisma;
  let notifications: { [K in keyof NotificationsService]?: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrisma();
    notifications = { create: jest.fn().mockResolvedValue(undefined) };
    service = new ClubsAdminService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  describe('createClub', () => {
    it('creates the club and makes the caller OWNER, in one transaction', async () => {
      prisma.club.create.mockResolvedValue({ id: 'club-1', name: 'Test Club' });
      prisma.club.findUniqueOrThrow.mockResolvedValue({
        id: 'club-1',
        name: 'Test Club',
        courts: [],
      });

      await service.createClub('user-1', { name: 'Test Club' });

      expect(prisma.clubMembership.create).toHaveBeenCalledWith({
        data: {
          clubId: 'club-1',
          userId: 'user-1',
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });
    });
  });

  describe('myMemberships', () => {
    it('returns only ACTIVE memberships with the club name and role', async () => {
      prisma.clubMembership.findMany.mockResolvedValue([
        { clubId: 'club-1', role: 'OWNER', club: { name: 'Test Club' } },
      ]);
      const result = await service.myMemberships('user-1');
      expect(result.memberships).toEqual([
        { clubId: 'club-1', clubName: 'Test Club', role: 'OWNER' },
      ]);
      expect(prisma.clubMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', status: 'ACTIVE' },
        }),
      );
    });
  });

  describe('submitVerificationRequest', () => {
    it('throws when the club does not exist', async () => {
      prisma.club.findUnique.mockResolvedValue(null);
      await expect(
        service.submitVerificationRequest('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('moves UNVERIFIED to PENDING', async () => {
      prisma.club.findUnique.mockResolvedValue({
        id: 'club-1',
        verificationStatus: 'UNVERIFIED',
      });
      const result = await service.submitVerificationRequest('club-1');
      expect(result).toEqual({ verificationStatus: 'PENDING' });
      expect(prisma.club.update).toHaveBeenCalledWith({
        where: { id: 'club-1' },
        data: { verificationStatus: 'PENDING' },
      });
    });

    it('rejects submitting a second request while one is already pending', async () => {
      prisma.club.findUnique.mockResolvedValue({
        id: 'club-1',
        verificationStatus: 'PENDING',
      });
      await expect(
        service.submitVerificationRequest('club-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('inviteMember', () => {
    it('rejects inviting an email with no Drift account', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.inviteMember('club-1', {
          email: 'nobody@test.com',
          role: 'ADMIN',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects inviting someone who is already a member', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      prisma.clubMembership.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.inviteMember('club-1', { email: 'a@test.com', role: 'ADMIN' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('adds an existing user straight into ACTIVE membership', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      prisma.clubMembership.findUnique.mockResolvedValue(null);
      prisma.clubMembership.create.mockResolvedValue({
        id: 'membership-1',
        role: 'ADMIN',
      });

      await service.inviteMember('club-1', {
        email: 'a@test.com',
        role: 'ADMIN',
      });

      expect(prisma.clubMembership.create).toHaveBeenCalledWith({
        data: {
          clubId: 'club-1',
          userId: 'user-2',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
    });
  });

  describe('updateMembership / removeMember — last-Owner protection', () => {
    it('rejects demoting the only Owner', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: 'm1',
        clubId: 'club-1',
        role: 'OWNER',
      });
      prisma.clubMembership.count.mockResolvedValue(0);

      await expect(
        service.updateMembership('club-1', 'm1', { role: 'ADMIN' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows demoting an Owner when another Owner remains', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: 'm1',
        clubId: 'club-1',
        role: 'OWNER',
      });
      prisma.clubMembership.count.mockResolvedValue(1);
      prisma.clubMembership.update.mockResolvedValue({
        id: 'm1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      const result = await service.updateMembership('club-1', 'm1', {
        role: 'ADMIN',
      });
      expect(result.role).toBe('ADMIN');
    });

    it('rejects removing the only Owner', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: 'm1',
        clubId: 'club-1',
        role: 'OWNER',
      });
      prisma.clubMembership.count.mockResolvedValue(0);

      await expect(service.removeMember('club-1', 'm1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws when the membership belongs to a different club', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: 'm1',
        clubId: 'other-club',
        role: 'ADMIN',
      });
      await expect(service.removeMember('club-1', 'm1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
  describe('requestToJoin', () => {
    beforeEach(() => {
      prisma.club.findUnique.mockResolvedValue({
        id: 'club-1',
        name: 'Test Club',
      });
    });

    it('creates a PENDING, READ_ONLY membership', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue(null);
      prisma.clubMembership.create.mockResolvedValue({
        id: 'mem-1',
        status: 'PENDING',
      });
      prisma.clubMembership.findMany.mockResolvedValue([]);
      prisma.user.findUnique.mockResolvedValue({
        firstName: 'Ana',
        lastName: 'Diaz',
      });

      const result = await service.requestToJoin('club-1', 'user-1');

      expect(prisma.clubMembership.create).toHaveBeenCalledWith({
        data: {
          clubId: 'club-1',
          userId: 'user-1',
          role: 'READ_ONLY',
          status: 'PENDING',
        },
      });
      expect(result.status).toBe('PENDING');
    });

    it('notifies every OWNER and ADMIN of the club', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue(null);
      prisma.clubMembership.create.mockResolvedValue({
        id: 'mem-1',
        status: 'PENDING',
      });
      prisma.clubMembership.findMany.mockResolvedValue([
        { userId: 'owner-1' },
        { userId: 'admin-1' },
      ]);
      prisma.user.findUnique.mockResolvedValue({
        firstName: 'Ana',
        lastName: 'Diaz',
      });

      await service.requestToJoin('club-1', 'user-1');

      expect(prisma.clubMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: { in: ['OWNER', 'ADMIN'] },
            status: 'ACTIVE',
          }),
        }),
      );
      expect(notifications.create).toHaveBeenCalledTimes(2);
      expect(notifications.create).toHaveBeenCalledWith(
        'owner-1',
        'CLUBS',
        'Ana Diaz asked to join Test Club',
        expect.any(String),
        'CLUB',
        'club-1',
      );
    });

    it('rejects a second request while one is pending', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: 'mem-1',
        status: 'PENDING',
      });

      await expect(service.requestToJoin('club-1', 'user-1')).rejects.toThrow(
        'Your request to join is already pending.',
      );
    });

    it('rejects joining a club you are already in', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: 'mem-1',
        status: 'ACTIVE',
      });

      await expect(service.requestToJoin('club-1', 'user-1')).rejects.toThrow(
        'You are already a member of this club.',
      );
    });

    it('hides an unknown club behind not-found', async () => {
      prisma.club.findUnique.mockResolvedValue(null);

      await expect(
        service.requestToJoin('nope', 'user-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('leave', () => {
    it('deletes the membership', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: 'mem-1',
        role: 'READ_ONLY',
      });

      await service.leave('club-1', 'user-1');

      expect(prisma.clubMembership.delete).toHaveBeenCalledWith({
        where: { id: 'mem-1' },
      });
    });

    it('refuses to let the last Owner walk out', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: 'mem-1',
        role: 'OWNER',
      });
      prisma.clubMembership.count.mockResolvedValue(0);

      await expect(service.leave('club-1', 'owner-1')).rejects.toThrow(
        'A club must always have at least one Owner.',
      );
      expect(prisma.clubMembership.delete).not.toHaveBeenCalled();
    });

    it('rejects leaving a club you are not in', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue(null);

      await expect(service.leave('club-1', 'stranger')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateMembership — approval', () => {
    it('notifies the player when PENDING is flipped to ACTIVE', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: 'mem-1',
        clubId: 'club-1',
        userId: 'user-1',
        role: 'READ_ONLY',
        status: 'PENDING',
      });
      prisma.clubMembership.update.mockResolvedValue({
        id: 'mem-1',
        userId: 'user-1',
        role: 'READ_ONLY',
        status: 'ACTIVE',
      });
      prisma.club.findUnique.mockResolvedValue({ name: 'Test Club' });

      await service.updateMembership('club-1', 'mem-1', { status: 'ACTIVE' });

      expect(notifications.create).toHaveBeenCalledWith(
        'user-1',
        'CLUBS',
        "You've joined Test Club",
        expect.any(String),
        'CLUB',
        'club-1',
      );
    });

    it('stays quiet for a plain role change on an existing member', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: 'mem-1',
        clubId: 'club-1',
        userId: 'user-1',
        role: 'READ_ONLY',
        status: 'ACTIVE',
      });
      prisma.clubMembership.update.mockResolvedValue({
        id: 'mem-1',
        userId: 'user-1',
        role: 'COACH',
        status: 'ACTIVE',
      });

      await service.updateMembership('club-1', 'mem-1', { role: 'COACH' });

      expect(notifications.create).not.toHaveBeenCalled();
    });
  });
});
