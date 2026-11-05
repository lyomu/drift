/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BookingsService, MAX_OPEN_REQUESTS } from './bookings.service';
import { addDaysYmd, localYmd, zonedToUtc } from './booking-logic';
import { NotificationsService } from '../notifications/notifications.service';

const TZ = 'Africa/Nairobi';
const tomorrow = addDaysYmd(localYmd(new Date(), TZ), 1);
const at = (hour: number) => zonedToUtc(tomorrow, hour * 60, TZ);

const hours = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  opensMinute: 8 * 60,
  closesMinute: 18 * 60,
}));

const group = {
  id: 'g1',
  surface: 'HARD',
  indoor: false,
  lighting: true,
  count: 1,
};

const court = {
  id: 'c1',
  name: 'Centre Court',
  clubId: 'club1',
  timezone: TZ,
  bookingSlotMinutes: 60,
  bookingMaxSlots: 3,
  bookingAdvanceDays: 30,
  bookingType: 'NATIVE_PARTNER',
  bookingUrl: null,
  courtGroups: [group],
  openingHours: hours,
};

function setup() {
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue({ isDemo: false }) },
    court: {
      findFirst: jest.fn().mockResolvedValue(court),
      update: jest.fn(),
    },
    courtBooking: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    clubMembership: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ userId: 'owner1' }, { userId: 'admin1' }]),
      findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
    },
    clubAuditLog: { create: jest.fn() },
    courtOpeningHours: { deleteMany: jest.fn(), createMany: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation((arg: any) =>
    typeof arg === 'function' ? arg(prisma) : Promise.all(arg),
  );
  const notifications = { create: jest.fn().mockResolvedValue(true) };
  const service = new BookingsService(
    prisma,
    notifications as unknown as NotificationsService,
  );
  return { prisma, notifications, service };
}

const created = (over: object = {}) => ({
  id: 'b1',
  status: 'PENDING',
  courtId: 'c1',
  courtGroupId: 'g1',
  userId: 'p1',
  guestName: null,
  startsAt: at(10),
  endsAt: at(11),
  note: null,
  decisionNote: null,
  decidedAt: null,
  cancelledAt: null,
  cancelledBy: null,
  createdAt: new Date(),
  court: { id: 'c1', name: 'Centre Court', timezone: TZ, clubId: 'club1' },
  courtGroup: group,
  user: { id: 'p1', firstName: 'Pat', lastName: 'Lee' },
  ...over,
});

const req = { startsAt: at(10).toISOString(), endsAt: at(11).toISOString() };

describe('BookingsService.request', () => {
  it('creates a PENDING booking and tells the managers', async () => {
    const { prisma, notifications, service } = setup();
    prisma.courtBooking.create.mockResolvedValue(created());
    const { booking } = await service.request('p1', 'c1', req);
    expect(booking.status).toBe('PENDING');
    expect(prisma.courtBooking.create.mock.calls[0][0].data).toMatchObject({
      courtId: 'c1',
      courtGroupId: 'g1',
      userId: 'p1',
    });
    expect(notifications.create).toHaveBeenCalledTimes(2);
    expect(notifications.create.mock.calls[0][1]).toBe('CLUBS');
  });

  it('applies demo scoping when looking the court up', async () => {
    const { prisma, service } = setup();
    prisma.courtBooking.create.mockResolvedValue(created());
    await service.request('p1', 'c1', req);
    const where = prisma.court.findFirst.mock.calls[0][0].where;
    expect(where.AND[0]).toEqual({
      OR: [{ clubId: null }, { club: { is: { isDemo: false } } }],
    });
    expect(where.clubId).toEqual({ not: null });
    expect(where.bookingType).toBe('NATIVE_PARTNER');
  });

  it('404s when the court is not bookable', async () => {
    const { prisma, service } = setup();
    prisma.court.findFirst.mockResolvedValue(null);
    await expect(service.request('p1', 'c1', req)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each([
    ['outside hours', at(19), at(20)],
    ['off the slot grid', new Date(at(10).getTime() + 30 * 60_000), at(11)],
    ['longer than max slots', at(9), at(13)],
    ['in the past', new Date(Date.now() - 86_400_000), at(9)],
  ])('rejects a request %s', async (_label, s, e) => {
    const { service } = setup();
    await expect(
      service.request('p1', 'c1', {
        startsAt: s.toISOString(),
        endsAt: e.toISOString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('caps open requests per player', async () => {
    const { prisma, service } = setup();
    prisma.courtBooking.count.mockResolvedValue(MAX_OPEN_REQUESTS);
    await expect(service.request('p1', 'c1', req)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects when approved bookings already fill the slot', async () => {
    const { prisma, service } = setup();
    prisma.courtBooking.findMany.mockResolvedValue([
      { startsAt: at(10), endsAt: at(11) },
    ]);
    await expect(service.request('p1', 'c1', req)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('counts only APPROVED bookings against capacity', async () => {
    const { prisma, service } = setup();
    prisma.courtBooking.create.mockResolvedValue(created());
    await service.request('p1', 'c1', req);
    expect(prisma.courtBooking.findMany.mock.calls[0][0].where.status).toBe(
      'APPROVED',
    );
  });

  it('rejects an overlapping booking by the same player', async () => {
    const { prisma, service } = setup();
    prisma.courtBooking.findFirst.mockResolvedValue({ id: 'other' });
    await expect(service.request('p1', 'c1', req)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('needs a surface when the court has several', async () => {
    const { prisma, service } = setup();
    prisma.court.findFirst.mockResolvedValue({
      ...court,
      courtGroups: [group, { ...group, id: 'g2' }],
    });
    await expect(service.request('p1', 'c1', req)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('BookingsService.availability', () => {
  it('marks full and past slots unavailable', async () => {
    const { prisma, service } = setup();
    prisma.courtBooking.findMany.mockResolvedValue([
      { startsAt: at(10), endsAt: at(11) },
    ]);
    const res = await service.availability('p1', 'c1', tomorrow);
    expect(res.slots).toHaveLength(10);
    const ten = res.slots.find(
      (s) => s.startsAt.getTime() === at(10).getTime(),
    )!;
    expect(ten).toMatchObject({ remaining: 0, available: false });
    expect(res.slots[0]).toMatchObject({ remaining: 1, available: true });
  });

  it('returns no bookable slots outside the advance window', async () => {
    const { service } = setup();
    const far = addDaysYmd(tomorrow, 60);
    const res = await service.availability('p1', 'c1', far);
    expect(res.slots.every((s) => !s.available)).toBe(true);
  });

  it('rejects a malformed date', async () => {
    const { service } = setup();
    await expect(
      service.availability('p1', 'c1', '09-11-2026'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('BookingsService.decide', () => {
  const pending = created();

  function ready() {
    const ctx = setup();
    ctx.prisma.courtBooking.findFirst.mockResolvedValue(pending);
    ctx.prisma.courtBooking.findUniqueOrThrow.mockResolvedValue(pending);
    return ctx;
  }

  it('approves under a row lock and notifies the player', async () => {
    const { prisma, notifications, service } = ready();
    prisma.courtBooking.update.mockResolvedValue(
      created({ status: 'APPROVED' }),
    );
    const { booking } = await service.decide('club1', 'b1', 'owner1', {
      decision: 'APPROVE',
    });
    expect(booking.status).toBe('APPROVED');
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalledTimes(1);
    expect(notifications.create.mock.calls[0][0]).toBe('p1');
  });

  it('re-checks capacity at approval time', async () => {
    const { prisma, service } = ready();
    prisma.courtBooking.findMany.mockResolvedValue([
      { startsAt: at(10), endsAt: at(11) },
    ]);
    await expect(
      service.decide('club1', 'b1', 'owner1', { decision: 'APPROVE' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.courtBooking.update).not.toHaveBeenCalled();
  });

  it('can still decline a full slot', async () => {
    const { prisma, notifications, service } = ready();
    prisma.courtBooking.update.mockResolvedValue(
      created({ status: 'DECLINED', decisionNote: 'Closed for lessons' }),
    );
    await service.decide('club1', 'b1', 'owner1', {
      decision: 'DECLINE',
      note: ' Closed for lessons ',
    });
    expect(prisma.courtBooking.update.mock.calls[0][0].data).toMatchObject({
      status: 'DECLINED',
      decisionNote: 'Closed for lessons',
    });
    expect(notifications.create).toHaveBeenCalledTimes(1);
  });

  it('refuses to re-decide a handled request', async () => {
    const { prisma, service } = ready();
    prisma.courtBooking.findUniqueOrThrow.mockResolvedValue(
      created({ status: 'APPROVED' }),
    );
    await expect(
      service.decide('club1', 'b1', 'owner1', { decision: 'DECLINE' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('404s for a booking of another club', async () => {
    const { prisma, service } = setup();
    prisma.courtBooking.findFirst.mockResolvedValue(null);
    await expect(
      service.decide('other', 'b1', 'owner1', { decision: 'APPROVE' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.courtBooking.findFirst.mock.calls[0][0].where).toMatchObject({
      court: { clubId: 'other' },
    });
  });
});

describe('BookingsService.createForClub', () => {
  const body = {
    courtId: 'c1',
    courtGroupId: 'g1',
    ...req,
  };

  it('books a guest instantly as APPROVED', async () => {
    const { prisma, notifications, service } = setup();
    prisma.courtBooking.create.mockResolvedValue(
      created({ status: 'APPROVED', userId: null, guestName: 'Walk-in' }),
    );
    await service.createForClub('club1', 'owner1', {
      ...body,
      guestName: ' Walk-in ',
    });
    expect(prisma.courtBooking.create.mock.calls[0][0].data).toMatchObject({
      status: 'APPROVED',
      userId: null,
      guestName: 'Walk-in',
      decidedById: 'owner1',
    });
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('needs exactly one of member or guest', async () => {
    const { service } = setup();
    await expect(
      service.createForClub('club1', 'owner1', body),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createForClub('club1', 'owner1', {
        ...body,
        userId: 'p1',
        guestName: 'x',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires an active club member', async () => {
    const { prisma, service } = setup();
    prisma.clubMembership.findUnique.mockResolvedValue(null);
    await expect(
      service.createForClub('club1', 'owner1', { ...body, userId: 'p1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a full slot', async () => {
    const { prisma, service } = setup();
    prisma.courtBooking.findMany.mockResolvedValue([
      { startsAt: at(10), endsAt: at(11) },
    ]);
    await expect(
      service.createForClub('club1', 'owner1', { ...body, guestName: 'G' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('cancelling', () => {
  it('lets a player cancel only their own open booking', async () => {
    const { prisma, service } = setup();
    prisma.courtBooking.findFirst.mockResolvedValue(null);
    await expect(service.cancelMine('p2', 'b1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.courtBooking.findFirst.mock.calls[0][0].where).toEqual({
      id: 'b1',
      userId: 'p2',
    });
  });

  it('rejects cancelling a closed booking', async () => {
    const { prisma, service } = setup();
    prisma.courtBooking.findFirst.mockResolvedValue(
      created({ status: 'DECLINED' }),
    );
    await expect(service.cancelMine('p1', 'b1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('records who cancelled and notifies the player on a club cancel', async () => {
    const { prisma, notifications, service } = setup();
    prisma.courtBooking.findFirst.mockResolvedValue(
      created({ status: 'APPROVED' }),
    );
    prisma.courtBooking.update.mockResolvedValue(
      created({ status: 'CANCELLED', cancelledBy: 'CLUB' }),
    );
    await service.cancelForClub('club1', 'b1', 'owner1', 'Rain');
    expect(prisma.courtBooking.update.mock.calls[0][0].data).toMatchObject({
      status: 'CANCELLED',
      cancelledBy: 'CLUB',
      decisionNote: 'Rain',
    });
    expect(notifications.create).toHaveBeenCalledTimes(1);
  });
});

describe('booking settings', () => {
  const dto = {
    enabled: true,
    timezone: TZ,
    slotMinutes: 60,
    maxSlots: 3,
    advanceDays: 30,
    hours: [{ dayOfWeek: 1, opensMinute: 480, closesMinute: 720 }],
  };

  it('rejects overlapping intervals and bad time zones', async () => {
    const { prisma, service } = setup();
    prisma.court.findFirst.mockResolvedValue(court);
    await expect(
      service.putSettings('club1', 'c1', 'owner1', {
        ...dto,
        hours: [
          { dayOfWeek: 1, opensMinute: 480, closesMinute: 720 },
          { dayOfWeek: 1, opensMinute: 600, closesMinute: 900 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.putSettings('club1', 'c1', 'owner1', {
        ...dto,
        timezone: 'Nowhere/Land',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('needs hours and a slot length to switch on', async () => {
    const { prisma, service } = setup();
    prisma.court.findFirst.mockResolvedValue(court);
    await expect(
      service.putSettings('club1', 'c1', 'owner1', { ...dto, hours: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.putSettings('club1', 'c1', 'owner1', {
        ...dto,
        slotMinutes: undefined,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('turning off reverts to UNKNOWN when there is no external link', async () => {
    const { prisma, service } = setup();
    prisma.court.findFirst.mockResolvedValue(court);
    await service.putSettings('club1', 'c1', 'owner1', {
      ...dto,
      enabled: false,
    });
    expect(prisma.court.update.mock.calls[0][0].data.bookingType).toBe(
      'UNKNOWN',
    );
  });
});

describe('stats', () => {
  it('computes hours booked and utilisation from approved bookings only', async () => {
    const { prisma, service } = setup();
    const from = new Date(Date.now() - 7 * 86_400_000);
    prisma.court.findMany = jest.fn().mockResolvedValue([
      {
        id: 'c1',
        timezone: TZ,
        courtGroups: [{ count: 2 }],
        openingHours: hours,
        bookings: [
          { status: 'APPROVED', startsAt: at(10), endsAt: at(12) },
          { status: 'PENDING', startsAt: at(12), endsAt: at(13) },
          { status: 'CANCELLED', startsAt: at(13), endsAt: at(14) },
        ],
      },
    ]);
    const stats = await service.courtStats('club1', { from });
    const c1 = stats.get('c1')!;
    expect(c1.requested).toBe(2); // pending + approved, not cancelled
    expect(c1.approved).toBe(1);
    expect(c1.hoursBooked).toBe(2);
    expect(c1.utilisationPct).not.toBeNull();
    expect(c1.utilisationPct!).toBeGreaterThan(0);
    expect(c1.utilisationPct!).toBeLessThanOrEqual(100);
  });

  it('reports null utilisation when no hours are configured', async () => {
    const { prisma, service } = setup();
    prisma.court.findMany = jest.fn().mockResolvedValue([
      {
        id: 'c1',
        timezone: TZ,
        courtGroups: [{ count: 1 }],
        openingHours: [],
        bookings: [],
      },
    ]);
    const stats = await service.courtStats('club1', {});
    expect(stats.get('c1')!.utilisationPct).toBeNull();
  });
});

describe('BookingsService.expireStalePending', () => {
  it('declines unanswered ended requests and tells the player', async () => {
    const { prisma, notifications, service } = setup();
    prisma.courtBooking.findMany.mockResolvedValue([created()]);
    prisma.courtBooking.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const n = await service.expireStalePending(new Date());
    expect(n).toBe(1);
    expect(prisma.courtBooking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b1', status: 'PENDING' },
        data: expect.objectContaining({ status: 'DECLINED' }),
      }),
    );
    expect(notifications.create).toHaveBeenCalledTimes(1);
  });

  it('skips a request that was decided in the meantime', async () => {
    const { prisma, notifications, service } = setup();
    prisma.courtBooking.findMany.mockResolvedValue([created()]);
    prisma.courtBooking.updateMany = jest.fn().mockResolvedValue({ count: 0 });
    expect(await service.expireStalePending(new Date())).toBe(0);
    expect(notifications.create).not.toHaveBeenCalled();
  });
});
