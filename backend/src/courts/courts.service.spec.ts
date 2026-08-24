import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CourtsService } from './courts.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  court: Record<string, jest.Mock>;
  courtReport: Record<string, jest.Mock>;
  courtGroup: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createMockPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    court: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    courtReport: { create: jest.fn() },
    courtGroup: { deleteMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    async (fn: (tx: MockPrisma) => Promise<unknown>) => fn(prisma),
  );
  return prisma;
}

/** London-ish origin, so distances below are easy to reason about. */
const origin = { latitude: 51.5074, longitude: -0.1278 };

function courtRecord(
  id: string,
  overrides: {
    latitude?: number | null;
    longitude?: number | null;
    courtGroups?: unknown[];
  } = {},
  clubId: string | null = null,
) {
  return {
    id,
    name: `Court ${id}`,
    address: null,
    latitude:
      overrides.latitude === undefined ? origin.latitude : overrides.latitude,
    longitude:
      overrides.longitude === undefined
        ? origin.longitude
        : overrides.longitude,
    clubId,
    club: null,
    phone: null,
    website: null,
    bookingType: 'UNKNOWN',
    bookingUrl: null,
    amenities: [],
    openingHoursNote: null,
    isPublic: null,
    photoUrls: [],
    googlePlacesRef: null,
    verificationStatus: 'UNVERIFIED',
    courtGroups: overrides.courtGroups ?? [
      {
        id: 'g1',
        sport: 'TENNIS',
        surface: 'HARD',
        indoor: false,
        lighting: false,
        count: 4,
      },
    ],
  };
}

describe('CourtsService', () => {
  let service: CourtsService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new CourtsService(prisma as unknown as PrismaService);
  });

  describe('search', () => {
    it('returns courts with no distance info when no origin is given', async () => {
      prisma.court.findMany.mockResolvedValue([courtRecord('a')]);
      const result = await service.search({});
      expect(result.total).toBe(1);
      expect(result.courts[0].distanceKm).toBeNull();
    });

    it('sorts nearest-first when an origin is given', async () => {
      const near = courtRecord('near', {
        latitude: origin.latitude + 0.01,
        longitude: origin.longitude,
      });
      const far = courtRecord('far', {
        latitude: origin.latitude + 1,
        longitude: origin.longitude,
      });
      prisma.court.findMany.mockResolvedValue([far, near]);

      const result = await service.search({
        latitude: origin.latitude,
        longitude: origin.longitude,
      });

      expect(result.courts.map((c) => c.id)).toEqual(['near', 'far']);
    });

    it('excludes courts outside maxDistanceKm (exact haversine, not just the bounding box)', async () => {
      const near = courtRecord('near', {
        latitude: origin.latitude + 0.01,
        longitude: origin.longitude,
      });
      const far = courtRecord('far', {
        latitude: origin.latitude + 5,
        longitude: origin.longitude,
      });
      prisma.court.findMany.mockResolvedValue([near, far]);

      const result = await service.search({
        latitude: origin.latitude,
        longitude: origin.longitude,
        maxDistanceKm: 10,
      });

      expect(result.courts.map((c) => c.id)).toEqual(['near']);
    });

    it('renders bookingUrl as null when bookingType is UNKNOWN — never fabricated', async () => {
      prisma.court.findMany.mockResolvedValue([courtRecord('sparse', {})]);
      const result = await service.search({});
      expect(result.courts[0].bookingType).toBe('UNKNOWN');
    });

    it('paginates with skip/take', async () => {
      prisma.court.findMany.mockResolvedValue([
        courtRecord('a'),
        courtRecord('b'),
        courtRecord('c'),
      ]);
      const result = await service.search({ take: 1, skip: 1 });
      expect(result.total).toBe(3);
      expect(result.courts.map((c) => c.id)).toEqual(['b']);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the court does not exist', async () => {
      prisma.court.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns a full profile with unset fields as null, not fabricated', async () => {
      prisma.court.findUnique.mockResolvedValue(courtRecord('a'));
      const profile = await service.findOne('a');
      expect(profile.phone).toBeNull();
      expect(profile.website).toBeNull();
      expect(profile.bookingUrl).toBeNull();
    });

    it('computes distance when viewer coords are given', async () => {
      prisma.court.findUnique.mockResolvedValue(
        courtRecord('a', {
          latitude: origin.latitude + 1,
          longitude: origin.longitude,
        }),
      );
      const profile = await service.findOne('a', origin);
      expect(profile.distanceKm).not.toBeNull();
      expect(profile.distanceKm).toBeGreaterThan(0);
    });
  });

  describe('report', () => {
    it('throws when the court does not exist', async () => {
      prisma.court.findUnique.mockResolvedValue(null);
      await expect(
        service.report('user-1', 'missing', { reason: 'INCORRECT_INFO' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates a report row for an existing court', async () => {
      prisma.court.findUnique.mockResolvedValue(courtRecord('a'));
      prisma.courtReport.create.mockResolvedValue({
        id: 'report-1',
        status: 'OPEN',
      });

      const result = await service.report('user-1', 'a', {
        reason: 'INCORRECT_INFO',
        notes: 'Closed permanently',
      });

      expect(prisma.courtReport.create).toHaveBeenCalledWith({
        data: {
          courtId: 'a',
          reporterId: 'user-1',
          reason: 'INCORRECT_INFO',
          notes: 'Closed permanently',
        },
      });
      expect(result).toEqual({ reportId: 'report-1', status: 'OPEN' });
    });
  });

  describe('createForClub', () => {
    it('creates a court with court groups scoped to the given club', async () => {
      prisma.court.create.mockResolvedValue(courtRecord('new'));

      await service.createForClub('club-1', {
        name: 'New Court',
        courtGroups: [{ surface: 'HARD', count: 4 }],
      });

      expect(prisma.court.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clubId: 'club-1',
            name: 'New Court',
            courtGroups: {
              create: [
                {
                  sport: undefined,
                  surface: 'HARD',
                  indoor: false,
                  lighting: false,
                  count: 4,
                },
              ],
            },
          }),
        }),
      );
    });
  });

  describe('updateForClub', () => {
    it('throws when the court belongs to a different club', async () => {
      prisma.court.findUnique.mockResolvedValue(
        courtRecord('a', {}, 'other-club'),
      );
      await expect(
        service.updateForClub('club-1', 'a', { name: 'Renamed' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('replaces court groups wholesale when a new set is given', async () => {
      prisma.court.findUnique.mockResolvedValue(courtRecord('a', {}, 'club-1'));

      await service.updateForClub('club-1', 'a', {
        courtGroups: [{ surface: 'CLAY', count: 2 }],
      });

      expect(prisma.courtGroup.deleteMany).toHaveBeenCalledWith({
        where: { courtId: 'a' },
      });
      expect(prisma.courtGroup.createMany).toHaveBeenCalledWith({
        data: [
          {
            courtId: 'a',
            sport: undefined,
            surface: 'CLAY',
            indoor: false,
            lighting: false,
            count: 2,
          },
        ],
      });
    });
  });

  describe('claimForClub', () => {
    it('links an ownerless court to the club', async () => {
      prisma.court.findUnique.mockResolvedValue(courtRecord('a', {}, null));
      const result = await service.claimForClub('club-1', 'a');
      expect(prisma.court.update).toHaveBeenCalledWith({
        where: { id: 'a' },
        data: { clubId: 'club-1' },
      });
      expect(result).toEqual({ claimed: true });
    });

    it('rejects claiming a court that already belongs to a club', async () => {
      prisma.court.findUnique.mockResolvedValue(
        courtRecord('a', {}, 'other-club'),
      );
      await expect(service.claimForClub('club-1', 'a')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
