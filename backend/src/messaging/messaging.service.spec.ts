import { NotFoundException } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimePublisher } from './realtime.publisher';
import { NotificationsService } from '../notifications/notifications.service';

type MockPrisma = {
  conversation: Record<string, jest.Mock>;
  conversationParticipant: Record<string, jest.Mock>;
  message: Record<string, jest.Mock>;
  user: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createMockPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    conversation: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'c1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    conversationParticipant: {
      findUnique: jest.fn().mockResolvedValue({ conversationId: 'c1' }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({}),
    },
    message: {
      create: jest.fn().mockResolvedValue({
        id: 'msg1',
        conversationId: 'c1',
        senderId: 'me',
        kind: 'TEXT',
        body: 'hi',
        systemEvent: null,
        relatedMatchId: null,
        createdAt: new Date(),
      }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ firstName: 'Test', lastName: 'Sender' }),
    },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: MockPrisma) => Promise<unknown>)(prisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });

  return prisma;
}

describe('MessagingService', () => {
  let service: MessagingService;
  let prisma: MockPrisma;
  let realtime: RealtimePublisher;
  let notifications: { [K in keyof NotificationsService]?: jest.Mock };

  let publishMessageSpy: jest.SpiedFunction<
    RealtimePublisher['publishMessage']
  >;

  beforeEach(() => {
    prisma = createMockPrisma();
    realtime = new RealtimePublisher();
    publishMessageSpy = jest.spyOn(realtime, 'publishMessage');
    notifications = { create: jest.fn().mockResolvedValue(undefined) };
    service = new MessagingService(
      prisma as unknown as PrismaService,
      realtime,
      notifications as unknown as NotificationsService,
    );
  });

  describe('access control', () => {
    it('hides a conversation you are not a participant of', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue(null);
      await expect(
        service.getMessages('stranger', 'c1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuses to send into a conversation you are not in', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue(null);
      await expect(
        service.sendMessage('stranger', 'c1', 'hi'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('refuses to mark someone else’s conversation read', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue(null);
      await expect(service.markRead('stranger', 'c1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('sendMessage', () => {
    it('broadcasts over the socket after committing', async () => {
      await service.sendMessage('me', 'c1', 'hi');
      expect(prisma.message.create).toHaveBeenCalled();
      expect(publishMessageSpy).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ body: 'hi' }),
      );
    });

    it('marks the thread read for the sender', async () => {
      await service.sendMessage('me', 'c1', 'hi');
      expect(prisma.conversationParticipant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            conversationId_userId: { conversationId: 'c1', userId: 'me' },
          },
        }),
      );
    });

    it('bumps lastMessageAt so the inbox sorts correctly', async () => {
      await service.sendMessage('me', 'c1', 'hi');
      expect(prisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'c1' } }),
      );
    });

    it('notifies other participants but never the sender', async () => {
      prisma.conversationParticipant.findMany.mockResolvedValue([
        { userId: 'other' },
      ]);
      await service.sendMessage('me', 'c1', 'hi');
      expect(notifications.create).toHaveBeenCalledTimes(1);
      expect(notifications.create).toHaveBeenCalledWith(
        'other',
        'MESSAGES',
        expect.stringContaining('New message from'),
        expect.any(String),
        'CONVERSATION',
        'c1',
      );
    });
  });

  describe('writeSystemMessage', () => {
    it('records the event type and match link', async () => {
      await service.writeSystemMessage(
        'c1',
        'Match confirmed.',
        'match_confirmed',
        'm1',
      );

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'c1',
          kind: 'SYSTEM',
          body: 'Match confirmed.',
          systemEvent: 'match_confirmed',
          relatedMatchId: 'm1',
        },
      });
    });

    it('leaves the sender null — system messages have no author', async () => {
      await service.writeSystemMessage('c1', 'x', 'match_cancelled', 'm1');
      const data = prisma.message.create.mock.calls[0][0].data;
      expect(data.senderId).toBeUndefined();
    });
  });

  describe('ensureMatchConversation', () => {
    it('reuses an existing thread rather than creating a second', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 'existing' });
      const result = await service.ensureMatchConversation('m1', ['a', 'b']);
      expect(result).toEqual({ id: 'existing' });
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('creates a MATCH conversation with all participants', async () => {
      await service.ensureMatchConversation('m1', ['a', 'b']);
      const data = prisma.conversation.create.mock.calls[0][0].data;
      expect(data.type).toBe('MATCH');
      expect(data.matchId).toBe('m1');
      expect(data.participants.create).toEqual([
        { userId: 'a' },
        { userId: 'b' },
      ]);
    });
  });

  describe('unread counts', () => {
    it('counts only messages from others after lastReadAt', async () => {
      const lastReadAt = new Date(Date.now() - 60_000);
      prisma.conversationParticipant.findMany.mockResolvedValue([
        {
          conversationId: 'c1',
          lastReadAt,
          conversation: {
            id: 'c1',
            type: 'DIRECT',
            matchId: null,
            lastMessageAt: new Date(),
            participants: [],
            messages: [],
          },
        },
      ]);
      prisma.message.count.mockResolvedValue(3);

      const { conversations } = await service.listConversations('me');

      expect(conversations[0].unreadCount).toBe(3);
      expect(prisma.message.count).toHaveBeenCalledWith({
        where: {
          conversationId: 'c1',
          senderId: { not: 'me' },
          createdAt: { gt: lastReadAt },
        },
      });
    });
  });

  describe('getMessages', () => {
    it('returns oldest-first so the client can append', async () => {
      const older = {
        id: 'a',
        conversationId: 'c1',
        senderId: 'me',
        kind: 'TEXT',
        body: 'first',
        systemEvent: null,
        relatedMatchId: null,
        createdAt: new Date(Date.now() - 1000),
      };
      const newer = {
        ...older,
        id: 'b',
        body: 'second',
        createdAt: new Date(),
      };
      // The query pulls newest-first; the service reverses it.
      prisma.message.findMany.mockResolvedValue([newer, older]);

      const { messages } = await service.getMessages('me', 'c1');
      expect(messages.map((m) => m.id)).toEqual(['a', 'b']);
    });
  });
});
