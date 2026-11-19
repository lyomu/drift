import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountStatus,
  ClubMembershipStatus,
  ClubRole,
  PlatformPermission,
} from '@prisma/client';
import { UserAdminService } from './user-admin.service';
import { AuditService } from './audit.service';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

const ACTOR = 'admin-1';
const REASON = 'Confirmed policy breach after review';

type Mock = Record<string, jest.Mock>;

function createPrisma() {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({}),
    } as Mock,
    platformAdmin: { findUnique: jest.fn() } as Mock,
    refreshToken: {
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      count: jest.fn().mockResolvedValue(0),
    } as Mock,
    privacyRequest: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'pr-1' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    } as Mock,
    club: { findUnique: jest.fn() } as Mock,
    clubMembership: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn().mockResolvedValue({}),
      count: jest.fn(),
    } as Mock,
    coachProfile: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    } as Mock,
    adminAuditLog: { create: jest.fn().mockResolvedValue({}) } as Mock,
    matchParticipant: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    } as Mock,
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (tx: typeof prisma) => Promise<unknown>)(prisma)
      : Promise.all(arg as Promise<unknown>[]),
  );
  return prisma;
}

describe('UserAdminService', () => {
  let prisma: ReturnType<typeof createPrisma>;
  let auth: { forgotPassword: jest.Mock };
  let service: UserAdminService;

  /** Admin without the access-management permission unless stated. */
  const adminWith = (...permissions: PlatformPermission[]) =>
    prisma.platformAdmin.findUnique.mockResolvedValue({
      email: 'staff@drift.test',
      role: { permissions: permissions.map((permission) => ({ permission })) },
    });

  const user = (overrides: Record<string, unknown> = {}) => ({
    id: 'u1',
    email: 'player@test.com',
    accountStatus: AccountStatus.ACTIVE,
    verificationStatus: 'UNVERIFIED',
    ...overrides,
  });

  const auditActions = () =>
    prisma.adminAuditLog.create.mock.calls.map(
      (c) => (c[0] as { data: { action: string } }).data.action,
    );

  beforeEach(() => {
    prisma = createPrisma();
    auth = { forgotPassword: jest.fn().mockResolvedValue({}) };
    adminWith(PlatformPermission.USERS_MANAGE);
    service = new UserAdminService(
      prisma as unknown as PrismaService,
      new AuditService(prisma as unknown as PrismaService),
      auth as unknown as AuthService,
    );
  });

  // ------------------------------------------------------------- pagination
  describe('listUsers', () => {
    it('caps page size, clamps negatives and orders with a unique tiebreaker', async () => {
      await service.listUsers({ take: 9999, skip: -5 });
      const args = prisma.user.findMany.mock.calls[0][0] as {
        take: number;
        skip: number;
        orderBy: unknown[];
      };
      expect(args.take).toBe(200);
      expect(args.skip).toBe(0);
      expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    });

    it('defaults to a page of 50', async () => {
      await service.listUsers({});
      expect(
        (prisma.user.findMany.mock.calls[0][0] as { take: number }).take,
      ).toBe(50);
    });

    it('sorts by last activity with never-active users last', async () => {
      await service.listUsers({ sort: 'lastActiveAt', dir: 'desc' });
      expect(
        (prisma.user.findMany.mock.calls[0][0] as { orderBy: unknown[] })
          .orderBy,
      ).toEqual([
        { lastActiveAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ]);
    });

    it('returns total and platform-wide counts alongside the page', async () => {
      prisma.user.count.mockResolvedValue(7);
      const result = await service.listUsers({});
      expect(result.total).toBe(7);
      expect(result.counts).toEqual(
        expect.objectContaining({ active: 7, neverActive: 7, unverified: 7 }),
      );
    });

    it('applies the activity filter through the shared bucket definition', async () => {
      await service.listUsers({ activity: 'never' });
      const where = prisma.user.findMany.mock.calls[0][0] as {
        where: { AND: unknown[] };
      };
      expect(where.where.AND).toContainEqual({ lastActiveAt: null });
    });

    it('applies status, verification, club role and registration range filters', async () => {
      await service.listUsers({
        status: 'SUSPENDED',
        verification: 'VERIFIED',
        clubRole: 'OWNER',
        createdFrom: '2026-01-01T00:00:00Z',
        createdTo: '2026-02-01T00:00:00Z',
      });
      const and = (
        prisma.user.findMany.mock.calls[0][0] as { where: { AND: unknown[] } }
      ).where.AND;
      expect(and).toContainEqual({ accountStatus: 'SUSPENDED' });
      expect(and).toContainEqual({ verificationStatus: 'VERIFIED' });
      expect(and).toContainEqual({
        clubMemberships: { some: { role: 'OWNER', status: 'ACTIVE' } },
      });
      expect(and).toContainEqual({
        createdAt: {
          gte: new Date('2026-01-01T00:00:00Z'),
          lte: new Date('2026-02-01T00:00:00Z'),
        },
      });
    });

    it.each([
      [{ status: 'BANNED' }],
      [{ verification: 'MAYBE' }],
      [{ clubRole: 'GOD' }],
      [{ activity: 'yesterday' }],
      [{ category: 'ALIEN' }],
      [{ sort: 'password' }],
      [{ createdFrom: 'not-a-date' }],
      [{ createdFrom: '2026-03-01', createdTo: '2026-01-01' }],
    ])('rejects invalid filter %j', async (query) => {
      await expect(service.listUsers(query)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('requires every search term to match so "ada love" finds one person', async () => {
      await service.listUsers({ query: 'ada love' });
      const and = (
        prisma.user.findMany.mock.calls[0][0] as { where: { AND: unknown[] } }
      ).where.AND;
      expect(and.filter((c) => c && 'OR' in (c as object))).toHaveLength(2);
    });

    it('never selects credential or token fields', async () => {
      await service.listUsers({});
      const select = (
        prisma.user.findMany.mock.calls[0][0] as {
          select: Record<string, unknown>;
        }
      ).select;
      expect(select).not.toHaveProperty('passwordHash');
      expect(select).not.toHaveProperty('refreshTokens');
    });
  });

  // ------------------------------------------------------ status transitions
  describe('setUserStatus', () => {
    it('suspends, revokes sessions and audits with the reason atomically', async () => {
      prisma.user.findUnique.mockResolvedValue(user());
      await service.setUserStatus(ACTOR, 'u1', 'SUSPENDED', REASON);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { accountStatus: 'SUSPENDED' },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: ACTOR,
          action: 'user.suspend',
          entityType: 'User',
          entityId: 'u1',
          reason: REASON,
        }),
      });
    });

    it('reactivates without touching sessions and audits it', async () => {
      prisma.user.findUnique.mockResolvedValue(
        user({ accountStatus: AccountStatus.SUSPENDED }),
      );
      await service.setUserStatus(ACTOR, 'u1', 'ACTIVE', REASON);
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(auditActions()).toEqual(['user.reactivate']);
    });

    it('does not delete or alter any related data when suspending', async () => {
      prisma.user.findUnique.mockResolvedValue(user());
      await service.setUserStatus(ACTOR, 'u1', 'SUSPENDED', REASON);
      // Only the status field is written — subscription, matches, goals and
      // profiles are preserved.
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      expect(
        Object.keys(
          (prisma.user.update.mock.calls[0][0] as { data: object }).data,
        ),
      ).toEqual(['accountStatus']);
    });

    it('rejects illegal transitions', async () => {
      prisma.user.findUnique.mockResolvedValue(user());
      await expect(
        service.setUserStatus(ACTOR, 'u1', 'ACTIVE', REASON),
      ).rejects.toThrow('already active');

      prisma.user.findUnique.mockResolvedValue(
        user({ accountStatus: AccountStatus.SUSPENDED }),
      );
      await expect(
        service.setUserStatus(ACTOR, 'u1', 'SUSPENDED', REASON),
      ).rejects.toThrow('already suspended');

      prisma.user.findUnique.mockResolvedValue(
        user({ accountStatus: AccountStatus.DELETED }),
      );
      await expect(
        service.setUserStatus(ACTOR, 'u1', 'ACTIVE', REASON),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.adminAuditLog.create).not.toHaveBeenCalled();
    });

    it.each(['', '   ', 'short', undefined as unknown as string])(
      'requires a real reason (%j) and records nothing without one',
      async (reason) => {
        prisma.user.findUnique.mockResolvedValue(user());
        await expect(
          service.setUserStatus(ACTOR, 'u1', 'SUSPENDED', reason),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.user.update).not.toHaveBeenCalled();
        expect(prisma.adminAuditLog.create).not.toHaveBeenCalled();
      },
    );

    it('404s for an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.setUserStatus(ACTOR, 'nope', 'SUSPENDED', REASON),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('blocks staff acting on their own player account', async () => {
      prisma.user.findUnique.mockResolvedValue(
        user({ email: 'STAFF@drift.test' }),
      );
      await expect(
        service.setUserStatus(ACTOR, 'u1', 'SUSPENDED', REASON),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------- deletion / restoration
  describe('deletion and restore', () => {
    it('delete deactivates and schedules erasure instead of erasing', async () => {
      prisma.user.findUnique.mockResolvedValue(user());
      const result = await service.requestDeletion(ACTOR, 'u1', REASON);

      expect(result.erasureScheduled).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { accountStatus: 'DELETED' },
      });
      expect(prisma.privacyRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'DELETION', status: 'PENDING' }),
        }),
      );
      expect(auditActions()).toEqual(['user.delete_request']);
    });

    it('does not file a second request when one is already pending', async () => {
      prisma.user.findUnique.mockResolvedValue(user());
      prisma.privacyRequest.findFirst.mockResolvedValue({ id: 'pr-0' });
      await service.requestDeletion(ACTOR, 'u1', REASON);
      expect(prisma.privacyRequest.create).not.toHaveBeenCalled();
    });

    it('restore withdraws the pending erasure so the job cannot anonymise a live user', async () => {
      prisma.user.findUnique.mockResolvedValue(
        user({ accountStatus: AccountStatus.DELETED }),
      );
      prisma.privacyRequest.findMany.mockResolvedValue([{ id: 'pr-1' }]);
      await service.restoreDeletedUser(ACTOR, 'u1', REASON);

      expect(prisma.privacyRequest.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['pr-1'] } },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { accountStatus: 'ACTIVE' },
      });
      expect(auditActions()).toEqual(['user.restore_deleted']);
    });

    it('refuses to restore an account that was already erased', async () => {
      prisma.user.findUnique.mockResolvedValue(
        user({ accountStatus: AccountStatus.DELETED }),
      );
      prisma.privacyRequest.findMany.mockResolvedValue([]);
      await expect(
        service.restoreDeletedUser(ACTOR, 'u1', REASON),
      ).rejects.toThrow('already been erased');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('requires a reason for both', async () => {
      prisma.user.findUnique.mockResolvedValue(user());
      await expect(
        service.requestDeletion(ACTOR, 'u1', 'x'),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.restoreDeletedUser(ACTOR, 'u1', ''),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ------------------------------------------------ sessions & password reset
  describe('sessions and password reset', () => {
    it('revokes sessions with a reason and audits the count', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      const result = await service.revokeUserSessions(ACTOR, 'u1', REASON);
      expect(result.revokedTokens).toBe(2);
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'user.revoke_sessions',
          reason: REASON,
          metadata: { revokedTokens: 2 },
        }),
      });
    });

    it('starts the user’s own reset flow and never returns a code or credential', async () => {
      prisma.user.findUnique.mockResolvedValue(user());
      auth.forgotPassword.mockResolvedValue({ devCode: '123456' });
      const result = await service.sendPasswordReset(ACTOR, 'u1', REASON);

      expect(auth.forgotPassword).toHaveBeenCalledWith({
        email: 'player@test.com',
      });
      expect(result).toEqual({ id: 'u1', requested: true });
      expect(JSON.stringify(result)).not.toContain('123456');
      expect(auditActions()).toEqual(['user.password_reset_sent']);
    });

    it('only resets active accounts that have an email', async () => {
      prisma.user.findUnique.mockResolvedValue(
        user({ accountStatus: AccountStatus.SUSPENDED }),
      );
      await expect(
        service.sendPasswordReset(ACTOR, 'u1', REASON),
      ).rejects.toBeInstanceOf(BadRequestException);
      prisma.user.findUnique.mockResolvedValue(user({ email: null }));
      await expect(
        service.sendPasswordReset(ACTOR, 'u1', REASON),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(auth.forgotPassword).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------ club memberships
  describe('club memberships (role management)', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(user());
      prisma.club.findUnique.mockResolvedValue({ id: 'c1', name: 'Nairobi TC' });
      prisma.clubMembership.upsert.mockImplementation(
        async (a: { create: { role: ClubRole; status: string } }) => ({
          role: a.create.role,
          status: a.create.status,
        }),
      );
    });

    it('adds a membership, audits before/after and keeps one user identity', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue(null);
      await service.setClubMembership(
        ACTOR,
        'u1',
        'c1',
        { role: ClubRole.COACH },
        REASON,
      );
      expect(prisma.clubMembership.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clubId_userId: { clubId: 'c1', userId: 'u1' } },
        }),
      );
      // No User row is created or re-keyed: role management is a membership
      // write only.
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'user.club_membership_add',
          reason: REASON,
          metadata: expect.objectContaining({
            clubId: 'c1',
            from: null,
            to: { role: 'COACH', status: 'ACTIVE' },
          }),
        }),
      });
    });

    it('changes an existing role and records the previous one', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: 'm1',
        role: ClubRole.READ_ONLY,
        status: ClubMembershipStatus.ACTIVE,
      });
      await service.setClubMembership(
        ACTOR,
        'u1',
        'c1',
        { role: ClubRole.ADMIN },
        REASON,
      );
      expect(auditActions()).toEqual(['user.club_membership_change']);
      expect(
        (
          prisma.adminAuditLog.create.mock.calls[0][0] as {
            data: { metadata: { from: unknown } };
          }
        ).data.metadata.from,
      ).toEqual({ role: 'READ_ONLY', status: 'ACTIVE' });
    });

    it('rejects a no-op change', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: 'm1',
        role: ClubRole.ADMIN,
        status: ClubMembershipStatus.ACTIVE,
      });
      await expect(
        service.setClubMembership(
          ACTOR,
          'u1',
          'c1',
          { role: ClubRole.ADMIN },
          REASON,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('blocks privilege escalation: granting OWNER needs ACCESS_MANAGE', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue(null);
      await expect(
        service.setClubMembership(
          ACTOR,
          'u1',
          'c1',
          { role: ClubRole.OWNER },
          REASON,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.clubMembership.upsert).not.toHaveBeenCalled();
      expect(prisma.adminAuditLog.create).not.toHaveBeenCalled();
    });

    it('allows granting OWNER with ACCESS_MANAGE', async () => {
      adminWith(
        PlatformPermission.USERS_MANAGE,
        PlatformPermission.ACCESS_MANAGE,
      );
      prisma.clubMembership.findUnique.mockResolvedValue(null);
      await service.setClubMembership(
        ACTOR,
        'u1',
        'c1',
        { role: ClubRole.OWNER },
        REASON,
      );
      expect(prisma.clubMembership.upsert).toHaveBeenCalled();
    });

    it('never leaves a club without an active owner', async () => {
      adminWith(PlatformPermission.ACCESS_MANAGE);
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: 'm1',
        role: ClubRole.OWNER,
        status: ClubMembershipStatus.ACTIVE,
      });
      prisma.clubMembership.count.mockResolvedValue(0);
      await expect(
        service.setClubMembership(
          ACTOR,
          'u1',
          'c1',
          { role: ClubRole.ADMIN },
          REASON,
        ),
      ).rejects.toThrow('at least one active owner');
      await expect(
        service.removeClubMembership(ACTOR, 'u1', 'c1', REASON),
      ).rejects.toThrow('at least one active owner');
      expect(prisma.clubMembership.delete).not.toHaveBeenCalled();
    });

    it('allows demoting an owner when another remains', async () => {
      adminWith(PlatformPermission.ACCESS_MANAGE);
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: 'm1',
        role: ClubRole.OWNER,
        status: ClubMembershipStatus.ACTIVE,
      });
      prisma.clubMembership.count.mockResolvedValue(1);
      await service.setClubMembership(
        ACTOR,
        'u1',
        'c1',
        { role: ClubRole.ADMIN },
        REASON,
      );
      expect(prisma.clubMembership.upsert).toHaveBeenCalled();
    });

    it('removes a membership with reason and audit, 404 when absent', async () => {
      prisma.clubMembership.findUnique.mockResolvedValue({
        id: 'm1',
        role: ClubRole.COACH,
        status: ClubMembershipStatus.ACTIVE,
        club: { name: 'Nairobi TC' },
      });
      await service.removeClubMembership(ACTOR, 'u1', 'c1', REASON);
      expect(prisma.clubMembership.delete).toHaveBeenCalledWith({
        where: { id: 'm1' },
      });
      expect(auditActions()).toEqual(['user.club_membership_remove']);

      prisma.clubMembership.findUnique.mockResolvedValue(null);
      await expect(
        service.removeClubMembership(ACTOR, 'u1', 'c1', REASON),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('requires a reason and an existing club, and refuses deleted users', async () => {
      await expect(
        service.setClubMembership(ACTOR, 'u1', 'c1', { role: 'COACH' }, 'no'),
      ).rejects.toBeInstanceOf(BadRequestException);
      prisma.club.findUnique.mockResolvedValue(null);
      await expect(
        service.setClubMembership(
          ACTOR,
          'u1',
          'c1',
          { role: ClubRole.COACH },
          REASON,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      prisma.user.findUnique.mockResolvedValue(
        user({ accountStatus: AccountStatus.DELETED }),
      );
      await expect(
        service.setClubMembership(
          ACTOR,
          'u1',
          'c1',
          { role: ClubRole.COACH },
          REASON,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ----------------------------------------------------------- coach listing
  describe('coach listing suspension', () => {
    beforeEach(() => prisma.user.findUnique.mockResolvedValue(user()));

    it('suspends the listing without touching the account', async () => {
      prisma.coachProfile.findUnique.mockResolvedValue({
        id: 'cp1',
        listingSuspendedAt: null,
      });
      await service.setCoachListing(ACTOR, 'u1', true, REASON);
      expect(prisma.coachProfile.update).toHaveBeenCalledWith({
        where: { id: 'cp1' },
        data: {
          listingSuspendedAt: expect.any(Date),
          listingSuspendedReason: REASON,
        },
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(auditActions()).toEqual(['user.coach_listing_suspend']);
    });

    it('reinstates a suspended listing', async () => {
      prisma.coachProfile.findUnique.mockResolvedValue({
        id: 'cp1',
        listingSuspendedAt: new Date(),
      });
      await service.setCoachListing(ACTOR, 'u1', false, REASON);
      expect(prisma.coachProfile.update).toHaveBeenCalledWith({
        where: { id: 'cp1' },
        data: { listingSuspendedAt: null, listingSuspendedReason: null },
      });
      expect(auditActions()).toEqual(['user.coach_listing_reinstate']);
    });

    it('rejects redundant transitions, missing profiles and missing reasons', async () => {
      prisma.coachProfile.findUnique.mockResolvedValue({
        id: 'cp1',
        listingSuspendedAt: null,
      });
      await expect(
        service.setCoachListing(ACTOR, 'u1', false, REASON),
      ).rejects.toBeInstanceOf(BadRequestException);
      prisma.coachProfile.findUnique.mockResolvedValue(null);
      await expect(
        service.setCoachListing(ACTOR, 'u1', true, REASON),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.setCoachListing(ACTOR, 'u1', true, ''),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.coachProfile.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------- history
  describe('audit history and matches', () => {
    it('lists only this user’s audit events, paginated, exposing chain status but never hashes', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      (prisma as unknown as { adminAuditLog: Mock }).adminAuditLog.findMany =
        jest.fn().mockResolvedValue([
          { id: 'a', action: 'user.suspend', hash: 'abc', reason: REASON },
          { id: 'b', action: 'user.restore', hash: null, reason: null },
        ]);
      prisma.adminAuditLog.count = jest.fn().mockResolvedValue(2);

      const result = await service.getUserAudit('u1', 500, -1);
      const args = prisma.adminAuditLog.findMany.mock.calls[0][0] as {
        where: object;
        take: number;
        skip: number;
      };
      expect(args.where).toEqual({ entityType: 'User', entityId: 'u1' });
      expect(args.take).toBe(200);
      expect(args.skip).toBe(0);
      expect(result.events.map((e) => e.chained)).toEqual([true, false]);
      expect(JSON.stringify(result)).not.toContain('abc');
    });

    it('paginates matches with bounded page size', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      await service.getUserMatches('u1', 1000, 0);
      expect(
        (prisma.matchParticipant.findMany.mock.calls[0][0] as { take: number })
          .take,
      ).toBe(100);
    });
  });
});
