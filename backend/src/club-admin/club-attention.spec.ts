import { ClubOperationsService } from './club-operations.service';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';

function createMockPrisma() {
  return {
    clubMembership: { count: jest.fn().mockResolvedValue(2) },
    fixture: { count: jest.fn().mockResolvedValue(3) },
    clubPostModerationReport: { count: jest.fn().mockResolvedValue(4) },
    courtReport: { count: jest.fn().mockResolvedValue(5) },
  };
}

function createMockBookings() {
  return { pendingCount: jest.fn().mockResolvedValue(6) };
}

describe('ClubOperationsService.attention', () => {
  let service: ClubOperationsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let bookings: ReturnType<typeof createMockBookings>;

  beforeEach(() => {
    prisma = createMockPrisma();
    bookings = createMockBookings();
    service = new ClubOperationsService(
      prisma as unknown as PrismaService,
      bookings as unknown as BookingsService,
    );
  });

  it.each(['OWNER', 'ADMIN'] as const)(
    '%s sees every kind of work',
    async (role) => {
      await expect(service.attention('club-1', role)).resolves.toEqual({
        pendingJoinRequests: 2,
        openDisputes: 3,
        pendingModeration: 4,
        openCourtReports: 5,
        pendingBookings: 6,
        total: 20,
      });
    },
  );

  it('a content manager only sees moderation, and the others are never queried', async () => {
    await expect(
      service.attention('club-1', 'CONTENT_MANAGER'),
    ).resolves.toEqual({
      pendingJoinRequests: 0,
      openDisputes: 0,
      pendingModeration: 4,
      openCourtReports: 0,
      pendingBookings: 0,
      total: 4,
    });
    expect(prisma.clubMembership.count).not.toHaveBeenCalled();
    expect(prisma.fixture.count).not.toHaveBeenCalled();
    expect(prisma.courtReport.count).not.toHaveBeenCalled();
  });

  it.each(['COMPETITION_MANAGER', 'COACH', 'READ_ONLY'] as const)(
    '%s sees nothing, so the response leaks no counts',
    async (role) => {
      await expect(service.attention('club-1', role)).resolves.toEqual({
        pendingJoinRequests: 0,
        openDisputes: 0,
        pendingModeration: 0,
        openCourtReports: 0,
        pendingBookings: 0,
        total: 0,
      });
      expect(prisma.clubPostModerationReport.count).not.toHaveBeenCalled();
    },
  );

  it('scopes every count to this club and to open work only', async () => {
    await service.attention('club-1', 'OWNER');

    expect(prisma.clubMembership.count).toHaveBeenCalledWith({
      where: { clubId: 'club-1', status: 'PENDING' },
    });
    expect(prisma.fixture.count).toHaveBeenCalledWith({
      where: {
        round: { league: { clubId: 'club-1' } },
        match: { state: 'DISPUTED' },
      },
    });
    expect(prisma.clubPostModerationReport.count).toHaveBeenCalledWith({
      where: { clubId: 'club-1', status: 'PENDING' },
    });
    expect(prisma.courtReport.count).toHaveBeenCalledWith({
      where: { court: { clubId: 'club-1' }, status: 'OPEN' },
    });
  });
});
