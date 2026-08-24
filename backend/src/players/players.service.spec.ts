import { NotFoundException } from '@nestjs/common';
import { PlayersService } from './players.service';
import { PrismaService } from '../prisma/prisma.service';

type MockPrisma = {
  tennisProfile: Record<string, jest.Mock>;
  user: Record<string, jest.Mock>;
  block: Record<string, jest.Mock>;
  connection: Record<string, jest.Mock>;
  matchParticipant: Record<string, jest.Mock>;
};

function createMockPrisma(): MockPrisma {
  return {
    tennisProfile: { findUnique: jest.fn() },
    user: { findMany: jest.fn(), findFirst: jest.fn() },
    block: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
    connection: { findFirst: jest.fn().mockResolvedValue(null) },
    // findOne also computes stats (matches/stats.util.ts) alongside the
    // profile itself.
    matchParticipant: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

/** London-ish origin, so distances below are easy to reason about. */
const origin = { latitude: 51.5074, longitude: -0.1278 };

function viewerProfile(overrides: Record<string, unknown> = {}) {
  return {
    ...origin,
    userSelectedLevel: 4.0,
    systemSuggestedLevel: null,
    ...overrides,
  };
}

function playerRecord(
  id: string,
  overrides: {
    latitude?: number | null;
    longitude?: number | null;
    userSelectedLevel?: number | null;
    systemSuggestedLevel?: number | null;
    availabilitySlots?: unknown[];
    assessmentSessions?: unknown[];
    skillBreakdownVisibility?: string;
    availabilityVisibility?: string;
  } = {},
) {
  return {
    id,
    firstName: 'Test',
    lastName: id,
    photoUrl: null,
    tennisProfile: {
      // `??` would collapse an explicit null into the default, which is
      // exactly the "no coordinates stored" case these tests need.
      latitude:
        overrides.latitude === undefined ? origin.latitude : overrides.latitude,
      longitude:
        overrides.longitude === undefined
          ? origin.longitude
          : overrides.longitude,
      userSelectedLevel:
        overrides.userSelectedLevel === undefined
          ? 4.0
          : overrides.userSelectedLevel,
      systemSuggestedLevel: overrides.systemSuggestedLevel ?? null,
      generalLocation: 'London',
      preferredClubName: null,
      formatPreference: null,
      stylePreference: null,
      dominantHand: 'RIGHT',
      availabilitySlots: overrides.availabilitySlots ?? [],
      assessmentSessions: overrides.assessmentSessions ?? [],
      skillBreakdownVisibility:
        overrides.skillBreakdownVisibility ?? 'CONNECTIONS_ONLY',
      availabilityVisibility:
        overrides.availabilityVisibility ?? 'CONNECTIONS_ONLY',
    },
  };
}

describe('PlayersService', () => {
  let service: PlayersService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new PlayersService(prisma as unknown as PrismaService);
  });

  describe('search', () => {
    it('throws when the viewer has no tennis profile', async () => {
      prisma.tennisProfile.findUnique.mockResolvedValue(null);
      await expect(service.search('viewer', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('excludes the viewer and anyone blocked in either direction', async () => {
      prisma.tennisProfile.findUnique.mockResolvedValue(viewerProfile());
      prisma.block.findMany.mockResolvedValue([
        { blockerId: 'viewer', blockedId: 'blocked-by-me' },
        { blockerId: 'blocked-me', blockedId: 'viewer' },
      ]);
      prisma.user.findMany.mockResolvedValue([]);

      await service.search('viewer', {});

      const where = prisma.user.findMany.mock.calls[0][0].where;
      expect(where.id.notIn).toEqual(['viewer', 'blocked-by-me', 'blocked-me']);
      expect(where.onboardingStep).toBe('COMPLETE');
    });

    it('ranks a closer, level-matched player above a distant mismatched one', async () => {
      prisma.tennisProfile.findUnique.mockResolvedValue(viewerProfile());
      prisma.user.findMany.mockResolvedValue([
        // ~110km north, 3 levels apart.
        playerRecord('far', { latitude: 52.5, userSelectedLevel: 7.0 }),
        // Same spot, same level.
        playerRecord('near'),
      ]);

      const { players } = await service.search('viewer', {});
      expect(players.map((p) => p.id)).toEqual(['near', 'far']);
    });

    it('drops players outside maxDistanceKm even if the bounding box let them through', async () => {
      prisma.tennisProfile.findUnique.mockResolvedValue(viewerProfile());
      prisma.user.findMany.mockResolvedValue([
        playerRecord('near'),
        playerRecord('far', { latitude: 52.5 }),
      ]);

      const { players } = await service.search('viewer', { maxDistanceKm: 10 });
      expect(players.map((p) => p.id)).toEqual(['near']);
    });

    it('never exposes coordinates, only a coarse band', async () => {
      prisma.tennisProfile.findUnique.mockResolvedValue(viewerProfile());
      prisma.user.findMany.mockResolvedValue([
        playerRecord('p1', { latitude: 51.5374 }),
      ]);

      const { players } = await service.search('viewer', {});
      expect(players[0]).not.toHaveProperty('latitude');
      expect(players[0]).not.toHaveProperty('longitude');
      expect(players[0].distanceBand).toMatch(/km away/);
    });

    it('reports an unknown distance rather than fabricating one', async () => {
      prisma.tennisProfile.findUnique.mockResolvedValue(viewerProfile());
      prisma.user.findMany.mockResolvedValue([
        playerRecord('no-coords', { latitude: null, longitude: null }),
      ]);

      const { players } = await service.search('viewer', {});
      expect(players[0].distanceBand).toBeNull();
    });

    it('summarises availability without exposing the raw calendar', async () => {
      prisma.tennisProfile.findUnique.mockResolvedValue(viewerProfile());
      prisma.user.findMany.mockResolvedValue([
        playerRecord('p1', {
          availabilitySlots: [
            { dayOfWeek: 6, timeBlock: 'MORNING' },
            { dayOfWeek: 0, timeBlock: 'MORNING' },
          ],
        }),
      ]);

      const { players } = await service.search('viewer', {});
      expect(players[0].availabilitySummary).toBe(
        'Usually free weekend mornings',
      );
      expect(players[0]).not.toHaveProperty('availabilitySlots');
    });
  });

  describe('getOwnProfile', () => {
    it('exposes skill breakdown and availability without a real connection', async () => {
      prisma.user.findFirst.mockResolvedValue(
        playerRecord('me', {
          availabilitySlots: [{ dayOfWeek: 6, timeBlock: 'MORNING' }],
          assessmentSessions: [{ resultSkillBreakdown: { SERVE: 5 } }],
        }),
      );

      const profile = await service.getOwnProfile('me');
      expect(profile.skillBreakdown).toEqual({ SERVE: 5 });
      expect(profile.availabilitySlots).toHaveLength(1);
    });

    it('throws when the user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.getOwnProfile('ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    beforeEach(() => {
      prisma.tennisProfile.findUnique.mockResolvedValue(viewerProfile());
    });

    it('treats a blocked player as non-existent', async () => {
      prisma.block.findFirst.mockResolvedValue({ id: 'block-1' });
      await expect(service.findOne('viewer', 'other')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('hides the skill breakdown and availability from non-connections', async () => {
      prisma.block.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(
        playerRecord('other', {
          availabilitySlots: [{ dayOfWeek: 6, timeBlock: 'MORNING' }],
          assessmentSessions: [{ resultSkillBreakdown: { SERVE: 5 } }],
        }),
      );
      prisma.connection.findFirst.mockResolvedValue(null);

      const profile = await service.findOne('viewer', 'other');
      expect(profile.connectionState).toBe('NONE');
      expect(profile.skillBreakdown).toBeNull();
      expect(profile.availabilitySlots).toBeNull();
    });

    it('reveals gated fields once connected', async () => {
      prisma.block.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(
        playerRecord('other', {
          availabilitySlots: [{ dayOfWeek: 6, timeBlock: 'MORNING' }],
          assessmentSessions: [{ resultSkillBreakdown: { SERVE: 5 } }],
        }),
      );
      prisma.connection.findFirst.mockResolvedValue({
        requesterId: 'viewer',
        addresseeId: 'other',
        status: 'ACCEPTED',
      });

      const profile = await service.findOne('viewer', 'other');
      expect(profile.connectionState).toBe('CONNECTED');
      expect(profile.skillBreakdown).toEqual({ SERVE: 5 });
      expect(profile.availabilitySlots).toHaveLength(1);
    });

    it('reveals gated fields to a non-connection when visibility is EVERYONE', async () => {
      prisma.block.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(
        playerRecord('other', {
          availabilitySlots: [{ dayOfWeek: 6, timeBlock: 'MORNING' }],
          assessmentSessions: [{ resultSkillBreakdown: { SERVE: 5 } }],
          skillBreakdownVisibility: 'EVERYONE',
          availabilityVisibility: 'EVERYONE',
        }),
      );
      prisma.connection.findFirst.mockResolvedValue(null);

      const profile = await service.findOne('viewer', 'other');
      expect(profile.connectionState).toBe('NONE');
      expect(profile.skillBreakdown).toEqual({ SERVE: 5 });
      expect(profile.availabilitySlots).toHaveLength(1);
    });

    it('keeps a CONNECTIONS_ONLY field gated even when the other field is EVERYONE', async () => {
      prisma.block.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(
        playerRecord('other', {
          availabilitySlots: [{ dayOfWeek: 6, timeBlock: 'MORNING' }],
          assessmentSessions: [{ resultSkillBreakdown: { SERVE: 5 } }],
          skillBreakdownVisibility: 'EVERYONE',
          availabilityVisibility: 'CONNECTIONS_ONLY',
        }),
      );
      prisma.connection.findFirst.mockResolvedValue(null);

      const profile = await service.findOne('viewer', 'other');
      expect(profile.skillBreakdown).toEqual({ SERVE: 5 });
      expect(profile.availabilitySlots).toBeNull();
    });

    it.each([
      ['viewer', 'other', 'PENDING_OUTGOING'],
      ['other', 'viewer', 'PENDING_INCOMING'],
    ])(
      'reports pending direction correctly (%s -> %s)',
      async (requesterId, addresseeId, expected) => {
        prisma.block.findFirst.mockResolvedValue(null);
        prisma.user.findFirst.mockResolvedValue(playerRecord('other'));
        prisma.connection.findFirst.mockResolvedValue({
          requesterId,
          addresseeId,
          status: 'PENDING',
        });

        const profile = await service.findOne('viewer', 'other');
        expect(profile.connectionState).toBe(expected);
      },
    );
  });
});
