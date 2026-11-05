import { NotFoundException } from '@nestjs/common';
import { ClubsAdminService } from './clubs-admin.service';
import { MailerService } from '../mail/mailer.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Only the models `memberStats` reads; everything defaults to "no activity". */
function createMockPrisma() {
  return {
    clubMembership: { findUnique: jest.fn().mockResolvedValue({ id: 'm1' }) },
    fixture: { findMany: jest.fn().mockResolvedValue([]) },
    clubEventRegistration: { findMany: jest.fn().mockResolvedValue([]) },
    clubPost: { findMany: jest.fn().mockResolvedValue([]) },
    clubPostReaction: { findMany: jest.fn().mockResolvedValue([]) },
    leagueRegistration: { count: jest.fn().mockResolvedValue(0) },
    courtBooking: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

const settled = (
  side: 'A' | 'B',
  winningSide: 'A' | 'B' | null,
  at: string,
) => ({
  match: {
    participants: [{ side }],
    result: { winningSide, confirmedAt: new Date(at) },
  },
});

describe('ClubsAdminService.memberStats', () => {
  let service: ClubsAdminService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new ClubsAdminService(
      prisma as unknown as PrismaService,
      { create: jest.fn() } as unknown as NotificationsService,
      {} as unknown as MailerService,
    );
  });

  it('404s for someone who is not in this club', async () => {
    prisma.clubMembership.findUnique.mockResolvedValue(null);
    await expect(service.memberStats('club-1', 'u9')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.fixture.findMany).not.toHaveBeenCalled();
  });

  it('reports an all-zero, INACTIVE member honestly', async () => {
    const stats = await service.memberStats('club-1', 'u1');
    expect(stats).toMatchObject({
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      eventsRegistered: 0,
      eventsAttended: 0,
      posts: 0,
      reactions: 0,
      activeLeagues: 0,
      lastActiveAt: null,
      engagementScore: 0,
      engagementBand: 'INACTIVE',
    });
  });

  it('decides wins and losses from the member’s own side, not the fixture side', async () => {
    prisma.fixture.findMany.mockResolvedValue([
      settled('A', 'A', '2026-10-01'), // won as A
      settled('B', 'A', '2026-10-02'), // lost as B
      settled('B', 'B', '2026-10-03'), // won as B
    ]);
    const stats = await service.memberStats('club-1', 'u1');
    expect(stats.matchesPlayed).toBe(3);
    expect(stats.matchesWon).toBe(2);
    expect(stats.matchesLost).toBe(1);
  });

  it('does not count a neutral walkover as played, won or lost', async () => {
    prisma.fixture.findMany.mockResolvedValue([
      settled('A', null, '2026-10-01'),
      settled('A', 'A', '2026-10-02'),
    ]);
    const stats = await service.memberStats('club-1', 'u1');
    expect(stats.matchesPlayed).toBe(1);
    expect(stats.matchesWon).toBe(1);
  });

  it('counts attended events separately from registered ones', async () => {
    prisma.clubEventRegistration.findMany.mockResolvedValue([
      { status: 'ATTENDED', registeredAt: new Date('2026-09-01') },
      { status: 'REGISTERED', registeredAt: new Date('2026-09-02') },
      { status: 'NO_SHOW', registeredAt: new Date('2026-09-03') },
    ]);
    const stats = await service.memberStats('club-1', 'u1');
    expect(stats.eventsRegistered).toBe(3);
    expect(stats.eventsAttended).toBe(1);
  });

  it('combines every signal into the score and takes the latest activity date', async () => {
    prisma.fixture.findMany.mockResolvedValue([
      settled('A', 'A', '2026-10-05'),
      settled('A', 'B', '2026-10-06'),
    ]); // 2 played -> 16
    prisma.clubEventRegistration.findMany.mockResolvedValue([
      { status: 'ATTENDED', registeredAt: new Date('2026-10-08') },
    ]); // 1 attended -> 5
    prisma.clubPost.findMany.mockResolvedValue([
      { createdAt: new Date('2026-10-09') },
    ]);
    prisma.clubPostReaction.findMany.mockResolvedValue([
      { createdAt: new Date('2026-10-10') },
      { createdAt: new Date('2026-10-07') },
    ]); // 3 interactions -> 6
    prisma.leagueRegistration.count.mockResolvedValue(2); // -> 10

    const stats = await service.memberStats('club-1', 'u1');

    expect(stats.engagementScore).toBe(37);
    expect(stats.engagementBand).toBe('LOW');
    expect(stats.lastActiveAt).toEqual(new Date('2026-10-10'));
    expect(stats.windowDays).toBe(90);
  });

  it('reports finished approved bookings and hours on court without touching the score', async () => {
    prisma.courtBooking.findMany.mockResolvedValue([
      {
        startsAt: new Date('2026-10-01T08:00:00Z'),
        endsAt: new Date('2026-10-01T09:30:00Z'),
      },
      {
        startsAt: new Date('2026-10-02T08:00:00Z'),
        endsAt: new Date('2026-10-02T09:00:00Z'),
      },
    ]);
    const stats = await service.memberStats('club-1', 'u1');
    expect(stats.bookings).toBe(2);
    expect(stats.hoursOnCourt).toBe(2.5);
    expect(stats.engagementScore).toBe(0);
    const where = prisma.courtBooking.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      userId: 'u1',
      court: { clubId: 'club-1' },
      status: 'APPROVED',
    });
  });

  it('only looks at this club’s records, inside the window', async () => {
    await service.memberStats('club-1', 'u1');

    const fixtureWhere = prisma.fixture.findMany.mock.calls[0][0].where;
    expect(fixtureWhere.round).toEqual({ league: { clubId: 'club-1' } });
    expect(fixtureWhere.match.result.confirmedAt.gte).toBeInstanceOf(Date);

    expect(
      prisma.clubEventRegistration.findMany.mock.calls[0][0].where.event,
    ).toEqual({
      clubId: 'club-1',
    });
    expect(prisma.clubPost.findMany.mock.calls[0][0].where).toMatchObject({
      clubId: 'club-1',
      authorId: 'u1',
      deletedAt: null,
    });
    expect(
      prisma.leagueRegistration.count.mock.calls[0][0].where.league,
    ).toEqual({
      clubId: 'club-1',
      completedAt: null,
      cancelledAt: null,
    });
  });
});
