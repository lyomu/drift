import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SafetyService } from './safety.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  user: Record<string, jest.Mock>;
  block: Record<string, jest.Mock>;
  connection: Record<string, jest.Mock>;
  playerReport: Record<string, jest.Mock>;
  message: Record<string, jest.Mock>;
  conversationParticipant: Record<string, jest.Mock>;
  messageReport: Record<string, jest.Mock>;
  courtReport: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createMockPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'other' }) },
    block: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    connection: { deleteMany: jest.fn() },
    playerReport: {
      create: jest.fn().mockResolvedValue({ id: 'r1', status: 'OPEN' }),
    },
    message: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'other',
      }),
    },
    conversationParticipant: {
      findUnique: jest.fn().mockResolvedValue({ id: 'membership-1' }),
    },
    messageReport: {
      create: jest.fn().mockResolvedValue({ id: 'mr1', status: 'OPEN' }),
    },
    courtReport: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (ops: unknown) => {
      return Promise.all(ops as Promise<unknown>[]);
    }),
  };
  return prisma;
}

describe('SafetyService', () => {
  let service: SafetyService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new SafetyService(prisma as unknown as PrismaService);
  });

  describe('block', () => {
    it('rejects blocking yourself', async () => {
      await expect(service.block('me', 'me')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects blocking a user who does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.block('me', 'ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('drops any existing connection in the same transaction', async () => {
      await service.block('me', 'other');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.block.create).toHaveBeenCalledWith({
        data: { blockerId: 'me', blockedId: 'other' },
      });
      // Both directions, since either could hold the row.
      expect(prisma.connection.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { requesterId: 'me', addresseeId: 'other' },
            { requesterId: 'other', addresseeId: 'me' },
          ],
        },
      });
    });

    it('is idempotent — re-blocking does not create a second row', async () => {
      prisma.block.findUnique.mockResolvedValue({ id: 'b1' });

      await expect(service.block('me', 'other')).resolves.toEqual({
        blocked: true,
      });
      expect(prisma.block.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('isBlockedBetween', () => {
    it('is true when the block runs in either direction', async () => {
      prisma.block.findFirst.mockResolvedValue({ id: 'b1' });
      await expect(service.isBlockedBetween('a', 'b')).resolves.toBe(true);

      const where = prisma.block.findFirst.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { blockerId: 'a', blockedId: 'b' },
        { blockerId: 'b', blockedId: 'a' },
      ]);
    });

    it('is false when no block exists', async () => {
      await expect(service.isBlockedBetween('a', 'b')).resolves.toBe(false);
    });
  });

  describe('report', () => {
    it('rejects reporting yourself', async () => {
      await expect(
        service.report('me', {
          reportedUserId: 'me',
          reason: 'SPAM',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('records the report as OPEN for the moderation queue', async () => {
      const result = await service.report('me', {
        reportedUserId: 'other',
        reason: 'HARASSMENT',
        notes: 'Rude in chat',
      });

      expect(prisma.playerReport.create).toHaveBeenCalledWith({
        data: {
          reporterId: 'me',
          reportedUserId: 'other',
          reason: 'HARASSMENT',
          notes: 'Rude in chat',
        },
      });
      expect(result).toEqual({ reportId: 'r1', status: 'OPEN' });
    });
  });

  describe('reportMessage', () => {
    it('rejects reporting a message that does not exist', async () => {
      prisma.message.findUnique.mockResolvedValue(null);
      await expect(
        service.reportMessage('me', { messageId: 'ghost', reason: 'SPAM' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects reporting your own message', async () => {
      prisma.message.findUnique.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'me',
      });
      await expect(
        service.reportMessage('me', { messageId: 'msg-1', reason: 'SPAM' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects reporting a message outside your conversations', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue(null);
      await expect(
        service.reportMessage('me', { messageId: 'msg-1', reason: 'SPAM' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('records the report as OPEN for the moderation queue', async () => {
      const result = await service.reportMessage('me', {
        messageId: 'msg-1',
        reason: 'HARASSMENT',
        notes: 'Rude in chat',
      });

      expect(prisma.messageReport.create).toHaveBeenCalledWith({
        data: {
          reporterId: 'me',
          messageId: 'msg-1',
          reason: 'HARASSMENT',
          notes: 'Rude in chat',
        },
      });
      expect(result).toEqual({ reportId: 'mr1', status: 'OPEN' });
    });
  });

  describe('listCourtReportsForClub / resolveCourtReport (Phase M14)', () => {
    it('lists only this club’s court reports', async () => {
      prisma.courtReport.findMany.mockResolvedValue([
        {
          id: 'cr1',
          courtId: 'court-1',
          court: { id: 'court-1', name: 'Regent’s Park' },
          reason: 'INCORRECT_INFO',
          notes: null,
          status: 'OPEN',
          createdAt: new Date(),
        },
      ]);

      const result = await service.listCourtReportsForClub('club-1');

      expect(prisma.courtReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { court: { clubId: 'club-1' } },
        }),
      );
      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].courtName).toBe('Regent’s Park');
    });

    it('rejects resolving a report belonging to a different club’s court', async () => {
      prisma.courtReport.findUnique.mockResolvedValue({
        id: 'cr1',
        court: { clubId: 'other-club' },
      });
      await expect(
        service.resolveCourtReport('club-1', 'cr1', 'RESOLVED'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('resolves a report belonging to this club’s court', async () => {
      prisma.courtReport.findUnique.mockResolvedValue({
        id: 'cr1',
        court: { clubId: 'club-1' },
      });
      prisma.courtReport.update.mockResolvedValue({
        id: 'cr1',
        status: 'RESOLVED',
      });

      const result = await service.resolveCourtReport(
        'club-1',
        'cr1',
        'RESOLVED',
      );

      expect(result).toEqual({ id: 'cr1', status: 'RESOLVED' });
    });
  });
});
