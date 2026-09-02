import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

type MockPrisma = {
  notification: Record<string, jest.Mock>;
  notificationPreference: Record<string, jest.Mock>;
};

function defaultPreference(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'user-1',
    connections: true,
    matches: true,
    messages: true,
    competitions: true,
    learning: true,
    news: false,
    ...overrides,
  };
}

function createMockPrisma(): MockPrisma {
  return {
    notification: {
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn().mockResolvedValue(defaultPreference()),
      create: jest.fn().mockResolvedValue(defaultPreference()),
      update: jest.fn(),
    },
  };
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: MockPrisma;
  let push: { sendToUser: jest.Mock };

  beforeEach(() => {
    prisma = createMockPrisma();
    push = { sendToUser: jest.fn().mockResolvedValue(undefined) };
    service = new NotificationsService(
      prisma as unknown as PrismaService,
      push as unknown as PushService,
    );
  });

  describe('create', () => {
    it('creates a notification when the category is enabled', async () => {
      await service.create('user-1', 'CONNECTIONS', 'Title', 'Body');
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          category: 'CONNECTIONS',
          title: 'Title',
          body: 'Body',
          relatedEntityType: undefined,
          relatedEntityId: undefined,
        },
      });
    });

    it('skips the write entirely when the category is disabled', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(
        defaultPreference({ news: false }),
      );
      await service.create('user-1', 'NEWS', 'Title', 'Body');
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('pushes the same notification it just wrote', async () => {
      await service.create(
        'user-1',
        'MATCHES',
        'Title',
        'Body',
        'MATCH',
        'match-1',
      );
      expect(push.sendToUser).toHaveBeenCalledWith('user-1', 'Title', 'Body', {
        category: 'MATCHES',
        relatedEntityType: 'MATCH',
        relatedEntityId: 'match-1',
      });
    });

    it('does not push a category the recipient opted out of', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(
        defaultPreference({ messages: false }),
      );
      await service.create('user-1', 'MESSAGES', 'Title', 'Body');
      // The preference check guards the push for free precisely because it
      // sits above the write — if push ever moves above it, someone who
      // muted a category starts getting it on their lock screen.
      expect(push.sendToUser).not.toHaveBeenCalled();
    });

    it('respects an explicit opt-out on an otherwise-default-on category', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(
        defaultPreference({ messages: false }),
      );
      await service.create('user-1', 'MESSAGES', 'Title', 'Body');
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('lazily creates a default preference row when none exists yet', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(null);
      await service.create('user-1', 'MATCHES', 'Title', 'Body');
      expect(prisma.notificationPreference.create).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
      });
      expect(prisma.notification.create).toHaveBeenCalled();
    });

    it('passes through the related-entity reference when given', async () => {
      await service.create(
        'user-1',
        'MATCHES',
        'Title',
        'Body',
        'MATCH',
        'match-1',
      );
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          relatedEntityType: 'MATCH',
          relatedEntityId: 'match-1',
        }),
      });
    });
  });

  describe('markRead', () => {
    it('throws when the notification does not belong to the viewer', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);
      await expect(
        service.markRead('user-1', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('is idempotent — marking an already-read notification keeps its original readAt', async () => {
      const originalReadAt = new Date('2026-01-01T00:00:00Z');
      prisma.notification.findFirst.mockResolvedValue({
        id: 'n1',
        readAt: originalReadAt,
      });
      await service.markRead('user-1', 'n1');
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { readAt: originalReadAt },
      });
    });
  });

  describe('updatePreferences', () => {
    it('creates a default row first if none exists, then updates it', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(null);
      prisma.notificationPreference.update.mockResolvedValue(
        defaultPreference({ news: true }),
      );
      const result = await service.updatePreferences('user-1', {
        news: true,
      });
      expect(prisma.notificationPreference.create).toHaveBeenCalled();
      expect(result.news).toBe(true);
    });
  });
});
