import { NotFoundException } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  club: Record<string, jest.Mock>;
  clubMembership: Record<string, jest.Mock>;
};

function createMockPrisma(): MockPrisma {
  return {
    club: { findMany: jest.fn(), findUnique: jest.fn() },
    clubMembership: { findUnique: jest.fn().mockResolvedValue(null) },
  };
}

const origin = { latitude: 51.5074, longitude: -0.1278 };

function clubRecord(
  id: string,
  overrides: {
    latitude?: number | null;
    longitude?: number | null;
    courts?: unknown[];
  } = {},
) {
  return {
    id,
    name: `Club ${id}`,
    description: null,
    address: null,
    latitude:
      overrides.latitude === undefined ? origin.latitude : overrides.latitude,
    longitude:
      overrides.longitude === undefined
        ? origin.longitude
        : overrides.longitude,
    phone: null,
    website: null,
    amenities: [],
    openingHoursNote: null,
    photoUrls: [],
    verificationStatus: 'UNVERIFIED',
    courts: overrides.courts ?? [],
  };
}

describe('ClubsService', () => {
  let service: ClubsService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new ClubsService(prisma as unknown as PrismaService);
  });

  describe('search', () => {
    it('returns clubs with a courtCount derived from the embedded courts', async () => {
      prisma.club.findMany.mockResolvedValue([
        clubRecord('a', { courts: [{ id: 'c1' }, { id: 'c2' }] }),
      ]);
      const result = await service.search({});
      expect(result.clubs[0].courtCount).toBe(2);
    });

    it('sorts nearest-first when an origin is given', async () => {
      const near = clubRecord('near', {
        latitude: origin.latitude + 0.01,
        longitude: origin.longitude,
      });
      const far = clubRecord('far', {
        latitude: origin.latitude + 1,
        longitude: origin.longitude,
      });
      prisma.club.findMany.mockResolvedValue([far, near]);

      const result = await service.search({
        latitude: origin.latitude,
        longitude: origin.longitude,
      });

      expect(result.clubs.map((c) => c.id)).toEqual(['near', 'far']);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the club does not exist', async () => {
      prisma.club.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing', 'viewer')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns an empty courts list, not an error, for a club that owns none', async () => {
      prisma.club.findUnique.mockResolvedValue(clubRecord('a', { courts: [] }));
      const profile = await service.findOne('a', 'viewer');
      expect(profile.courts).toEqual([]);
    });

    it('reports the viewer as a non-member when no membership row exists', async () => {
      prisma.club.findUnique.mockResolvedValue(clubRecord('a', { courts: [] }));
      const profile = await service.findOne('a', 'viewer');
      expect(profile.membershipStatus).toBeNull();
    });

    it('surfaces a pending join request so Club Profile can show "Requested"', async () => {
      prisma.club.findUnique.mockResolvedValue(clubRecord('a', { courts: [] }));
      prisma.clubMembership.findUnique.mockResolvedValue({ status: 'PENDING' });
      const profile = await service.findOne('a', 'viewer');
      expect(profile.membershipStatus).toBe('PENDING');
    });
  });
});
