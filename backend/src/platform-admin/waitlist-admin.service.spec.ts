import { BadRequestException } from '@nestjs/common';
import { WaitlistAdminService } from './waitlist-admin.service';
import type { SendWaitlistBroadcastDto } from './dto/waitlist-admin.dto';

type MockPrisma = {
  waitlistSignup: Record<string, jest.Mock>;
  waitlistBroadcast: Record<string, jest.Mock>;
};

type MockAudit = { record: jest.Mock };
type MockMailer = { enabled: boolean; sendWaitlistBroadcast: jest.Mock };

function createMockPrisma(): MockPrisma {
  return {
    waitlistSignup: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    waitlistBroadcast: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({
        id: 'broadcast-1',
        audience: null,
        recipientCount: 2,
        deliveredCount: 2,
        failedCount: 0,
      }),
    },
  };
}

function signup(overrides: Record<string, unknown> = {}) {
  return {
    email: 'player@example.com',
    firstName: 'Sarah',
    ...overrides,
  };
}

function dto(
  overrides: Partial<SendWaitlistBroadcastDto> = {},
): SendWaitlistBroadcastDto {
  return {
    subject: 'Drift Tennis is live',
    body: 'The app is on the stores today. Thank you for waiting.',
    ...overrides,
  };
}

function buildService(
  prisma: MockPrisma,
  audit: MockAudit,
  mailer: MockMailer,
) {
  return new WaitlistAdminService(
    prisma as never,
    audit as never,
    mailer as never,
  );
}

describe('WaitlistAdminService', () => {
  let prisma: MockPrisma;
  let audit: MockAudit;
  let mailer: MockMailer;
  let service: WaitlistAdminService;

  beforeEach(() => {
    prisma = createMockPrisma();
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    mailer = {
      enabled: true,
      sendWaitlistBroadcast: jest.fn().mockResolvedValue(true),
    };
    service = buildService(prisma, audit, mailer);
  });

  describe('broadcast', () => {
    it('sends to every recipient, stamps lastEmailedAt, and records the send', async () => {
      prisma.waitlistSignup.findMany.mockResolvedValue([
        signup(),
        signup({ email: 'club@example.com', firstName: null }),
      ]);

      const result = await service.broadcast('admin-1', dto());

      expect(mailer.sendWaitlistBroadcast).toHaveBeenCalledTimes(2);
      expect(mailer.sendWaitlistBroadcast).toHaveBeenCalledWith(
        'player@example.com',
        'Sarah',
        'Drift Tennis is live',
        'The app is on the stores today. Thank you for waiting.',
      );
      expect(prisma.waitlistSignup.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            email: { in: ['player@example.com', 'club@example.com'] },
          },
        }),
      );
      expect(prisma.waitlistBroadcast.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientCount: 2,
            deliveredCount: 2,
            failedCount: 0,
            sentById: 'admin-1',
          }),
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        'admin-1',
        'waitlist.broadcast',
        'WaitlistBroadcast',
        'broadcast-1',
        expect.objectContaining({ recipientCount: 2 }),
      );
      expect(result).toEqual(
        expect.objectContaining({ recipientCount: 2, deliveredCount: 2 }),
      );
    });

    it('does not stamp addresses the transport failed on', async () => {
      prisma.waitlistSignup.findMany.mockResolvedValue([
        signup(),
        signup({ email: 'bounced@example.com' }),
      ]);
      mailer.sendWaitlistBroadcast.mockImplementation(
        (to: string) => to !== 'bounced@example.com',
      );

      await service.broadcast('admin-1', dto());

      expect(prisma.waitlistSignup.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: { in: ['player@example.com'] } },
        }),
      );
      expect(prisma.waitlistBroadcast.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientCount: 2,
            deliveredCount: 1,
            failedCount: 1,
          }),
        }),
      );
    });

    it('refuses when SMTP is not configured', async () => {
      mailer.enabled = false;

      await expect(service.broadcast('admin-1', dto())).rejects.toThrow(
        BadRequestException,
      );
      expect(mailer.sendWaitlistBroadcast).not.toHaveBeenCalled();
      expect(prisma.waitlistBroadcast.create).not.toHaveBeenCalled();
    });

    it('refuses when nobody matches the audience', async () => {
      prisma.waitlistSignup.findMany.mockResolvedValue([]);

      await expect(
        service.broadcast('admin-1', dto({ audience: 'CLUB' })),
      ).rejects.toThrow(BadRequestException);
      expect(mailer.sendWaitlistBroadcast).not.toHaveBeenCalled();
    });

    it('scopes recipients to the requested audience', async () => {
      prisma.waitlistSignup.findMany.mockResolvedValue([signup()]);

      await service.broadcast('admin-1', dto({ audience: 'CLUB' }));

      expect(prisma.waitlistSignup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { audience: 'CLUB' } }),
      );
      expect(prisma.waitlistBroadcast.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ audience: 'CLUB' }),
        }),
      );
    });
  });

  describe('overview', () => {
    it('returns the list slice and the stat band', async () => {
      prisma.waitlistSignup.findMany.mockResolvedValue([
        signup({ email: 'newest@example.com' }),
      ]);
      prisma.waitlistSignup.count
        .mockResolvedValueOnce(1) // filtered
        .mockResolvedValueOnce(7) // players
        .mockResolvedValueOnce(3) // clubs
        .mockResolvedValueOnce(2) // last 7 days
        .mockResolvedValueOnce(9); // not emailed yet
      prisma.waitlistSignup.findFirst.mockResolvedValue({
        createdAt: new Date('2026-09-10T00:00:00Z'),
      });

      const result = await service.overview({});

      expect(result.stats).toEqual(
        expect.objectContaining({
          filtered: 1,
          total: 10,
          players: 7,
          clubs: 3,
          last7Days: 2,
          notEmailedYet: 9,
        }),
      );
      expect(result.signups).toHaveLength(1);
    });

    it('applies the audience filter to the list but not the split', async () => {
      await service.overview({ audience: 'club' });

      expect(prisma.waitlistSignup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { audience: 'CLUB' } }),
      );
      expect(prisma.waitlistSignup.count).toHaveBeenCalledWith({
        where: { audience: 'PLAYER' },
      });
      expect(prisma.waitlistSignup.count).toHaveBeenCalledWith({
        where: { audience: 'CLUB' },
      });
    });
  });

  describe('exportCsv', () => {
    it('quotes fields and escapes embedded quotes', async () => {
      prisma.waitlistSignup.findMany.mockResolvedValue([
        signup({
          city: 'Nairobi, Kenya',
          firstName: 'Sa"rah',
          createdAt: new Date('2026-09-01T00:00:00Z'),
          lastEmailedAt: null,
        }),
      ]);

      const csv = await service.exportCsv();

      expect(csv.split('\r\n')).toHaveLength(2);
      expect(csv.split('\r\n')[0]).toContain('firstName,email');
      expect(csv.split('\r\n')[1]).toContain('"Sa""rah"');
      expect(csv.split('\r\n')[1]).toContain('"Nairobi, Kenya"');
    });
  });
});
