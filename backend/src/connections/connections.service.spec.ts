import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type MockPrisma = {
  user: Record<string, jest.Mock>;
  block: Record<string, jest.Mock>;
  connection: Record<string, jest.Mock>;
};

function createMockPrisma(): MockPrisma {
  return {
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: 'other' }),
      findUnique: jest
        .fn()
        .mockResolvedValue({ firstName: 'Test', lastName: 'Player' }),
    },
    block: { findFirst: jest.fn().mockResolvedValue(null) },
    connection: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'c1', status: 'PENDING' }),
      update: jest.fn().mockResolvedValue({ id: 'c1', status: 'ACCEPTED' }),
      delete: jest.fn().mockResolvedValue({}),
    },
  };
}

type MockNotifications = { create: jest.Mock };

function createMockNotifications(): MockNotifications {
  return { create: jest.fn().mockResolvedValue(undefined) };
}

describe('ConnectionsService', () => {
  let service: ConnectionsService;
  let prisma: MockPrisma;
  let notifications: MockNotifications;

  beforeEach(() => {
    prisma = createMockPrisma();
    notifications = createMockNotifications();
    service = new ConnectionsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationsService,
    );
  });

  describe('request', () => {
    it('rejects connecting to yourself', async () => {
      await expect(service.request('me', 'me')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an addressee who has not completed onboarding', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.request('me', 'other')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('hides blocked users behind the same not-found error', async () => {
      prisma.block.findFirst.mockResolvedValue({ id: 'b1' });
      await expect(service.request('me', 'other')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('creates a pending request when no relationship exists', async () => {
      await service.request('me', 'other');
      expect(prisma.connection.create).toHaveBeenCalledWith({
        data: { requesterId: 'me', addresseeId: 'other' },
      });
    });

    it('notifies the addressee of a new request', async () => {
      await service.request('me', 'other');
      expect(notifications.create).toHaveBeenCalledWith(
        'other',
        'CONNECTIONS',
        expect.stringContaining('wants to connect'),
        expect.any(String),
        'CONNECTION',
        'other',
      );
    });

    it('rejects a duplicate outgoing request', async () => {
      prisma.connection.findFirst.mockResolvedValue({
        id: 'c1',
        requesterId: 'me',
        addresseeId: 'other',
        status: 'PENDING',
      });
      await expect(service.request('me', 'other')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects when already connected', async () => {
      prisma.connection.findFirst.mockResolvedValue({
        id: 'c1',
        requesterId: 'other',
        addresseeId: 'me',
        status: 'ACCEPTED',
      });
      await expect(service.request('me', 'other')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('accepts instead of mirroring when the other side already asked', async () => {
      const existing = {
        id: 'c1',
        requesterId: 'other',
        addresseeId: 'me',
        status: 'PENDING',
      };
      prisma.connection.findFirst.mockResolvedValue(existing);
      prisma.connection.findUnique.mockResolvedValue(existing);

      await service.request('me', 'other');

      expect(prisma.connection.create).not.toHaveBeenCalled();
      expect(prisma.connection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c1' },
          data: expect.objectContaining({ status: 'ACCEPTED' }),
        }),
      );
    });

    it('revives a previously declined row rather than creating a second', async () => {
      prisma.connection.findFirst.mockResolvedValue({
        id: 'c1',
        requesterId: 'other',
        addresseeId: 'me',
        status: 'DECLINED',
      });

      await service.request('me', 'other');

      expect(prisma.connection.create).not.toHaveBeenCalled();
      expect(prisma.connection.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: {
          requesterId: 'me',
          addresseeId: 'other',
          status: 'PENDING',
          respondedAt: null,
        },
      });
    });
  });

  describe('respond', () => {
    it('rejects a responder who is not the addressee', async () => {
      prisma.connection.findUnique.mockResolvedValue({
        id: 'c1',
        requesterId: 'me',
        addresseeId: 'other',
        status: 'PENDING',
      });
      await expect(
        service.respond('me', 'c1', 'ACCEPTED'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects responding twice', async () => {
      prisma.connection.findUnique.mockResolvedValue({
        id: 'c1',
        requesterId: 'other',
        addresseeId: 'me',
        status: 'ACCEPTED',
      });
      await expect(
        service.respond('me', 'c1', 'ACCEPTED'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stamps respondedAt on a valid response', async () => {
      prisma.connection.findUnique.mockResolvedValue({
        id: 'c1',
        requesterId: 'other',
        addresseeId: 'me',
        status: 'PENDING',
      });

      await service.respond('me', 'c1', 'ACCEPTED');

      const data = prisma.connection.update.mock.calls[0][0].data;
      expect(data.status).toBe('ACCEPTED');
      expect(data.respondedAt).toBeInstanceOf(Date);
    });

    it('notifies the original requester when accepted', async () => {
      prisma.connection.findUnique.mockResolvedValue({
        id: 'c1',
        requesterId: 'other',
        addresseeId: 'me',
        status: 'PENDING',
      });

      await service.respond('me', 'c1', 'ACCEPTED');

      expect(notifications.create).toHaveBeenCalledWith(
        'other',
        'CONNECTIONS',
        expect.stringContaining('accepted your connection request'),
        expect.any(String),
        'CONNECTION',
        'other',
      );
    });
  });

  describe('remove', () => {
    it('rejects removing a connection you are not part of', async () => {
      prisma.connection.findUnique.mockResolvedValue({
        id: 'c1',
        requesterId: 'a',
        addresseeId: 'b',
        status: 'ACCEPTED',
      });
      await expect(service.remove('me', 'c1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lets either participant remove it', async () => {
      prisma.connection.findUnique.mockResolvedValue({
        id: 'c1',
        requesterId: 'other',
        addresseeId: 'me',
        status: 'ACCEPTED',
      });
      await expect(service.remove('me', 'c1')).resolves.toEqual({
        removed: true,
      });
    });
  });

  describe('listPending', () => {
    it('splits incoming from outgoing by the viewer’s side', async () => {
      const player = {
        id: 'x',
        firstName: 'A',
        lastName: 'B',
        photoUrl: null,
        tennisProfile: null,
      };
      prisma.connection.findMany.mockResolvedValue([
        {
          id: 'in',
          requesterId: 'other',
          addresseeId: 'me',
          createdAt: new Date(),
          requester: player,
          addressee: player,
        },
        {
          id: 'out',
          requesterId: 'me',
          addresseeId: 'other',
          createdAt: new Date(),
          requester: player,
          addressee: player,
        },
      ]);

      const result = await service.listPending('me');
      expect(result.incoming.map((r) => r.connectionId)).toEqual(['in']);
      expect(result.outgoing.map((r) => r.connectionId)).toEqual(['out']);
    });
  });
});
