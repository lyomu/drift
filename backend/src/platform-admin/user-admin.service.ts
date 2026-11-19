import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountStatus,
  ClubMembershipStatus,
  ClubRole,
  PlatformPermission,
  Prisma,
  PrivacyRequestStatus,
  PrivacyRequestType,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import {
  LAST_ACTIVE_BUCKETS,
  lastActiveWhere,
  type LastActiveBucket,
} from '../common/last-active';
import { AuditService } from './audit.service';
import { REASON_MIN_LENGTH } from './dto/user-admin.dto';

// ------------------------------------------------------------------ shapes

/**
 * Overlapping tags, not a partition: a club owner who plays and coaches is all
 * three. `User` has no role column — categories are derived from which profile
 * relations exist and from ACTIVE club memberships, and platform-admin
 * permissions are a separate identity (`PlatformAdmin`) that never mixes with
 * either.
 */
export type UserCategory = 'PLAYER' | 'COACH' | 'CLUB_STAFF';

export type ListUsersQuery = {
  query?: string;
  status?: string;
  category?: string;
  verification?: string;
  clubRole?: string;
  activity?: string;
  createdFrom?: string;
  createdTo?: string;
  sort?: string;
  dir?: string;
  take?: number;
  skip?: number;
};

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  accountStatus: true,
  verificationStatus: true,
  onboardingStep: true,
  createdAt: true,
  lastActiveAt: true,
  // Category is derived, not stored — these stay id-only so listing is cheap;
  // the detail endpoint loads the rest.
  tennisProfile: { select: { id: true } },
  padelProfile: { select: { id: true } },
  coachProfile: { select: { id: true, listingSuspendedAt: true } },
  clubMemberships: {
    where: { status: ClubMembershipStatus.ACTIVE },
    select: { role: true, club: { select: { id: true, name: true } } },
  },
} satisfies Prisma.UserSelect;

export const USER_CATEGORY_WHERE: Record<UserCategory, Prisma.UserWhereInput> =
  {
    PLAYER: {
      OR: [
        { tennisProfile: { isNot: null } },
        { padelProfile: { isNot: null } },
      ],
    },
    COACH: { coachProfile: { isNot: null } },
    CLUB_STAFF: {
      clubMemberships: { some: { status: ClubMembershipStatus.ACTIVE } },
    },
  };

type CategorySource = {
  tennisProfile: { id: string } | null;
  padelProfile: { id: string } | null;
  coachProfile: { id: string } | null;
  clubMemberships: { role: ClubRole; club: { id: string; name: string } }[];
};

export function categoriesOf(user: CategorySource): UserCategory[] {
  const categories: UserCategory[] = [];
  if (user.tennisProfile || user.padelProfile) categories.push('PLAYER');
  if (user.coachProfile) categories.push('COACH');
  if (user.clubMemberships.length > 0) categories.push('CLUB_STAFF');
  return categories;
}

function parseEnum<T extends string>(
  values: Record<string, T> | readonly T[],
  value: string | undefined,
  label: string,
): T | undefined {
  if (!value) return undefined;
  const list = (Array.isArray(values) ? values : Object.values(values)) as T[];
  if (!list.includes(value as T)) {
    throw new BadRequestException(`Unknown ${label}.`);
  }
  return value as T;
}

function parseDate(value: string | undefined, label: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid ${label}.`);
  }
  return date;
}

/** Defence in depth: DTOs validate the reason on the way in, but this service
 * is also called from tests and future internal callers, so it re-checks. */
function requireReason(reason: string | undefined): string {
  const trimmed = reason?.trim() ?? '';
  if (trimmed.length < REASON_MIN_LENGTH) {
    throw new BadRequestException(
      `A reason of at least ${REASON_MIN_LENGTH} characters is required.`,
    );
  }
  return trimmed;
}

/**
 * Platform user administration: the one place that reads and changes accounts
 * on behalf of platform staff. Club admins never reach this — they manage only
 * their own club's members through `club-admin`, scoped by club membership.
 *
 * Every state change here follows the same shape: validate → reason required →
 * change and audit row in ONE transaction (no action without a trail, no trail
 * for an action that did not happen). Nothing is hard-deleted: restricting an
 * account flips status and leaves subscriptions, matches, goals and every other
 * relation untouched.
 */
@Injectable()
export class UserAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  // ------------------------------------------------------------------ list

  async listUsers(input: ListUsersQuery) {
    const category = parseEnum(
      Object.keys(USER_CATEGORY_WHERE) as UserCategory[],
      input.category,
      'user category',
    );
    const status = parseEnum(AccountStatus, input.status, 'account status');
    const verification = parseEnum(
      VerificationStatus,
      input.verification,
      'verification status',
    );
    const clubRole = parseEnum(ClubRole, input.clubRole, 'club role');
    const activity = parseEnum<LastActiveBucket>(
      LAST_ACTIVE_BUCKETS,
      input.activity,
      'activity filter',
    );
    const createdFrom = parseDate(input.createdFrom, 'registration start date');
    const createdTo = parseDate(input.createdTo, 'registration end date');
    if (createdFrom && createdTo && createdFrom > createdTo) {
      throw new BadRequestException(
        'The registration start date is after the end date.',
      );
    }

    // Each whitespace-separated term must match somewhere, so "ada love"
    // finds Ada Lovelace instead of matching neither field.
    const terms = (input.query ?? '').split(/\s+/).filter(Boolean).slice(0, 5);
    const searchClauses: Prisma.UserWhereInput[] = terms.map((term) => ({
      OR: [
        { email: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
      ],
    }));

    const where: Prisma.UserWhereInput = {
      AND: [
        ...searchClauses,
        status ? { accountStatus: status } : {},
        verification ? { verificationStatus: verification } : {},
        category ? USER_CATEGORY_WHERE[category] : {},
        clubRole
          ? {
              clubMemberships: {
                some: { role: clubRole, status: ClubMembershipStatus.ACTIVE },
              },
            }
          : {},
        activity ? lastActiveWhere(activity) : {},
        createdFrom || createdTo
          ? {
              createdAt: {
                ...(createdFrom ? { gte: createdFrom } : {}),
                ...(createdTo ? { lte: createdTo } : {}),
              },
            }
          : {},
      ],
    };

    const dir: Prisma.SortOrder = input.dir === 'asc' ? 'asc' : 'desc';
    const sort = parseEnum(
      ['createdAt', 'lastActiveAt', 'name'] as const,
      input.sort,
      'sort field',
    );
    // `id` is the tiebreaker: without a unique last key, rows with equal
    // timestamps can repeat or vanish between pages.
    const orderBy: Prisma.UserOrderByWithRelationInput[] =
      sort === 'lastActiveAt'
        ? [{ lastActiveAt: { sort: dir, nulls: 'last' } }, { id: 'desc' }]
        : sort === 'name'
          ? [{ lastName: dir }, { firstName: dir }, { id: 'desc' }]
          : [{ createdAt: dir }, { id: 'desc' }];

    const take = Math.min(
      Math.max(Math.trunc(input.take ?? DEFAULT_PAGE_SIZE), 1),
      MAX_PAGE_SIZE,
    );
    const skip = Math.max(Math.trunc(input.skip ?? 0), 0);

    const now = new Date();
    // The tallies deliberately ignore `where`: they are the "what is out
    // there" band above the table, not a summary of the current filter.
    const [
      users,
      total,
      active,
      suspended,
      deleted,
      players,
      coaches,
      clubStaff,
      activeToday,
      neverActive,
      unverified,
    ] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy,
        take,
        skip,
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { accountStatus: AccountStatus.ACTIVE } }),
      this.prisma.user.count({
        where: { accountStatus: AccountStatus.SUSPENDED },
      }),
      this.prisma.user.count({
        where: { accountStatus: AccountStatus.DELETED },
      }),
      this.prisma.user.count({ where: USER_CATEGORY_WHERE.PLAYER }),
      this.prisma.user.count({ where: USER_CATEGORY_WHERE.COACH }),
      this.prisma.user.count({ where: USER_CATEGORY_WHERE.CLUB_STAFF }),
      this.prisma.user.count({ where: lastActiveWhere('today', now) }),
      this.prisma.user.count({
        where: { ...lastActiveWhere('never'), accountStatus: AccountStatus.ACTIVE },
      }),
      this.prisma.user.count({
        where: {
          verificationStatus: VerificationStatus.UNVERIFIED,
          accountStatus: AccountStatus.ACTIVE,
        },
      }),
    ]);

    return {
      total,
      take,
      skip,
      counts: {
        active,
        suspended,
        deleted,
        players,
        coaches,
        clubStaff,
        activeToday,
        neverActive,
        unverified,
      },
      users: users.map(
        ({
          tennisProfile,
          padelProfile,
          coachProfile,
          clubMemberships,
          ...user
        }) => ({
          ...user,
          categories: categoriesOf({
            tennisProfile,
            padelProfile,
            coachProfile,
            clubMemberships,
          }),
          coachListingSuspended: Boolean(coachProfile?.listingSuspendedAt),
          clubRoles: clubMemberships.map((membership) => ({
            role: membership.role,
            clubId: membership.club.id,
            clubName: membership.club.name,
          })),
        }),
      ),
    };
  }

  // ---------------------------------------------------------------- detail

  /**
   * Everything an admin needs to judge one account before acting on it.
   * Separate from `listUsers` because it fans out across every relation.
   *
   * Data minimisation: no password hash, refresh tokens, push tokens, provider
   * customer/subscription ids, exact coordinates or payment-method details are
   * ever selected. `hasPassword` / session and device *counts* stand in for them.
   */
  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        phoneOnWhatsApp: true,
        firstName: true,
        lastName: true,
        bio: true,
        photoUrl: true,
        accountStatus: true,
        verificationStatus: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        onboardingStep: true,
        onboardingCompletedAt: true,
        createdAt: true,
        lastActiveAt: true,
        passwordHash: true,
        socialIdentities: { select: { provider: true } },
        tennisProfile: {
          select: {
            singlesRating: true,
            doublesRating: true,
            dominantHand: true,
            generalLocation: true,
            preferredClubName: true,
            goals: {
              orderBy: { createdAt: 'desc' },
              take: 20,
              select: {
                id: true,
                skill: true,
                focus: true,
                baseline: true,
                target: true,
                deadline: true,
                achievedAt: true,
              },
            },
          },
        },
        padelProfile: {
          select: { singlesRating: true, doublesRating: true },
        },
        coachProfile: {
          select: {
            id: true,
            yearsExperience: true,
            qualifications: true,
            specialisations: true,
            levels: true,
            verificationStatus: true,
            listingSuspendedAt: true,
            listingSuspendedReason: true,
            affiliations: {
              select: { club: { select: { id: true, name: true } } },
            },
          },
        },
        clubMemberships: {
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            status: true,
            createdAt: true,
            club: { select: { id: true, name: true } },
          },
        },
        billingAccount: {
          select: {
            subscription: {
              select: {
                status: true,
                currentPeriodStart: true,
                currentPeriodEnd: true,
                plan: {
                  select: {
                    code: true,
                    name: true,
                    interval: true,
                    priceMinor: true,
                    currency: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            matchParticipations: true,
            reportsReceived: true,
            connectionsRequested: true,
            connectionsReceived: true,
            deviceTokens: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found.');

    // An un-revoked, unexpired refresh token is the closest thing to a
    // "currently signed in" signal.
    const activeSessions = await this.prisma.refreshToken.count({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });

    const {
      _count,
      clubMemberships,
      coachProfile,
      passwordHash,
      socialIdentities,
      billingAccount,
      tennisProfile,
      ...rest
    } = user;

    const activeMemberships = clubMemberships.filter(
      (m) => m.status === ClubMembershipStatus.ACTIVE,
    );

    return {
      user: {
        ...rest,
        tennisProfile: tennisProfile
          ? {
              singlesRating: tennisProfile.singlesRating,
              doublesRating: tennisProfile.doublesRating,
              dominantHand: tennisProfile.dominantHand,
              generalLocation: tennisProfile.generalLocation,
              preferredClubName: tennisProfile.preferredClubName,
            }
          : null,
        goals: tennisProfile?.goals ?? [],
        coachProfile: coachProfile
          ? {
              ...coachProfile,
              affiliations: coachProfile.affiliations.map((a) => a.club),
            }
          : null,
        categories: categoriesOf({
          tennisProfile: tennisProfile ? { id: '' } : null,
          padelProfile: user.padelProfile ? { id: '' } : null,
          coachProfile: coachProfile ? { id: coachProfile.id } : null,
          clubMemberships: activeMemberships.map((m) => ({
            role: m.role,
            club: m.club,
          })),
        }),
        clubMemberships: clubMemberships.map((m) => ({
          role: m.role,
          status: m.status,
          joinedAt: m.createdAt,
          clubId: m.club.id,
          clubName: m.club.name,
        })),
        subscription: billingAccount?.subscription ?? null,
        security: {
          hasPassword: Boolean(passwordHash),
          socialProviders: socialIdentities.map((s) => s.provider),
          emailVerified: Boolean(user.emailVerifiedAt),
          phoneVerified: Boolean(user.phoneVerifiedAt),
          activeSessions,
          registeredDevices: _count.deviceTokens,
          lastActiveAt: user.lastActiveAt,
        },
        stats: {
          matches: _count.matchParticipations,
          reportsReceived: _count.reportsReceived,
          connections: _count.connectionsRequested + _count.connectionsReceived,
          activeSessions,
        },
      },
    };
  }

  /** Paginated match history for one user (opponents by name only). */
  async getUserMatches(userId: string, take = 20, skip = 0) {
    await this.assertUserExists(userId);
    const limit = Math.min(Math.max(Math.trunc(take), 1), 100);
    const offset = Math.max(Math.trunc(skip), 0);
    const where: Prisma.MatchParticipantWhereInput = { userId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.matchParticipant.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
        select: {
          side: true,
          status: true,
          match: {
            select: {
              id: true,
              sport: true,
              format: true,
              state: true,
              confirmedTime: true,
              createdAt: true,
              result: {
                select: { status: true, outcome: true, winningSide: true },
              },
              participants: {
                where: { userId: { not: userId } },
                select: {
                  side: true,
                  user: { select: { id: true, firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.matchParticipant.count({ where }),
    ]);
    return {
      total,
      matches: rows.map((row) => ({
        id: row.match.id,
        sport: row.match.sport,
        format: row.match.format,
        state: row.match.state,
        playedAt: row.match.confirmedTime ?? row.match.createdAt,
        side: row.side,
        participation: row.status,
        result: row.match.result,
        opponents: row.match.participants.map((p) => ({
          id: p.user.id,
          name:
            [p.user.firstName, p.user.lastName].filter(Boolean).join(' ') ||
            'Player',
          side: p.side,
        })),
      })),
    };
  }

  /** Admin-action history for this account, newest first. */
  async getUserAudit(userId: string, take = 50, skip = 0) {
    await this.assertUserExists(userId);
    const limit = Math.min(Math.max(Math.trunc(take), 1), 200);
    const offset = Math.max(Math.trunc(skip), 0);
    const where: Prisma.AdminAuditLogWhereInput = {
      entityType: 'User',
      entityId: userId,
    };
    const [events, total] = await this.prisma.$transaction([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
        select: {
          id: true,
          action: true,
          reason: true,
          metadata: true,
          createdAt: true,
          hash: true,
          actor: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);
    return {
      total,
      events: events.map(({ hash, ...event }) => ({
        ...event,
        // Whether the row sits in the tamper-evident chain (rows from before
        // chaining existed do not).
        chained: hash !== null,
      })),
    };
  }

  // ---------------------------------------------------------- account state

  /**
   * ACTIVE ⇄ SUSPENDED. Suspension also revokes every live session so it takes
   * effect now, not at the next login. DELETED is not reachable from here —
   * deletion goes through the privacy-erasure window — and a suspended
   * account's data, subscription and relationships are left exactly as they
   * were so reactivation restores the account in full.
   */
  async setUserStatus(
    actorId: string,
    userId: string,
    status: 'ACTIVE' | 'SUSPENDED',
    reason: string,
  ) {
    const why = requireReason(reason);
    const user = await this.loadForAction(actorId, userId);
    if (user.accountStatus === AccountStatus.DELETED) {
      throw new BadRequestException(
        'Deleted accounts cannot change status. Restore the account first.',
      );
    }
    if (user.accountStatus === status) {
      throw new BadRequestException(
        status === 'SUSPENDED'
          ? 'This account is already suspended.'
          : 'This account is already active.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { accountStatus: status },
      });
      let revoked = 0;
      if (status === 'SUSPENDED') {
        revoked = (
          await tx.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
          })
        ).count;
      }
      await this.audit.recordIn(
        tx,
        actorId,
        status === 'SUSPENDED' ? 'user.suspend' : 'user.reactivate',
        'User',
        userId,
        { previousStatus: user.accountStatus, revokedTokens: revoked },
        why,
      );
    });

    return { id: userId, status };
  }

  /**
   * Deleting an account is deactivation plus a PENDING deletion request: the
   * existing 30-day window (`ErasureScheduler`) performs the irreversible
   * anonymisation later. Nothing is erased here, so a mistaken click is fully
   * recoverable until the window closes.
   */
  async requestDeletion(actorId: string, userId: string, reason: string) {
    const why = requireReason(reason);
    const user = await this.loadForAction(actorId, userId);
    if (user.accountStatus === AccountStatus.DELETED) {
      throw new BadRequestException('This account is already deleted.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { accountStatus: AccountStatus.DELETED },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      const existing = await tx.privacyRequest.findFirst({
        where: {
          userId,
          type: PrivacyRequestType.DELETION,
          status: PrivacyRequestStatus.PENDING,
        },
        select: { id: true },
      });
      const request =
        existing ??
        (await tx.privacyRequest.create({
          data: {
            userId,
            type: PrivacyRequestType.DELETION,
            status: PrivacyRequestStatus.PENDING,
            requestNote: `Requested by platform staff: ${why}`,
          },
          select: { id: true },
        }));
      await this.audit.recordIn(
        tx,
        actorId,
        'user.delete_request',
        'User',
        userId,
        { previousStatus: user.accountStatus, privacyRequestId: request.id },
        why,
      );
    });

    return { id: userId, status: AccountStatus.DELETED, erasureScheduled: true };
  }

  /**
   * Undo a deletion while it is still inside the retention window. This must
   * also withdraw the pending deletion request: reactivating the account while
   * leaving the request would let the nightly job anonymise a live user.
   * Once erased (email gone / request fulfilled) there is nothing to restore.
   */
  async restoreDeletedUser(actorId: string, userId: string, reason: string) {
    const why = requireReason(reason);
    const user = await this.loadForAction(actorId, userId);
    if (user.accountStatus !== AccountStatus.DELETED) {
      throw new BadRequestException('This account is not deleted.');
    }

    await this.prisma.$transaction(async (tx) => {
      const pending = await tx.privacyRequest.findMany({
        where: {
          userId,
          type: PrivacyRequestType.DELETION,
          status: PrivacyRequestStatus.PENDING,
        },
        select: { id: true },
      });
      if (pending.length === 0) {
        throw new BadRequestException(
          'This account has already been erased and cannot be restored.',
        );
      }
      await tx.privacyRequest.deleteMany({
        where: { id: { in: pending.map((p) => p.id) } },
      });
      await tx.user.update({
        where: { id: userId },
        data: { accountStatus: AccountStatus.ACTIVE },
      });
      await this.audit.recordIn(
        tx,
        actorId,
        'user.restore_deleted',
        'User',
        userId,
        {
          previousStatus: user.accountStatus,
          withdrawnPrivacyRequestIds: pending.map((p) => p.id),
        },
        why,
      );
    });

    return { id: userId, status: AccountStatus.ACTIVE };
  }

  /** Sign the user out everywhere without changing account status. */
  async revokeUserSessions(actorId: string, userId: string, reason: string) {
    const why = requireReason(reason);
    await this.assertUserExists(userId);
    const revoked = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.recordIn(
        tx,
        actorId,
        'user.revoke_sessions',
        'User',
        userId,
        { revokedTokens: count },
        why,
      );
      return count;
    });
    return { id: userId, revokedTokens: revoked };
  }

  /**
   * Starts the normal forgot-password flow for the user: a one-time code goes
   * to *their* inbox, never to the admin, and the admin never sees or sets a
   * credential. Reuses `AuthService.forgotPassword` (hashing, TTL, attempt cap
   * and resend cooldown included). Within the cooldown it silently re-uses the
   * live code, so the response does not claim a fresh email went out.
   */
  async sendPasswordReset(actorId: string, userId: string, reason: string) {
    const why = requireReason(reason);
    const user = await this.loadForAction(actorId, userId);
    if (user.accountStatus !== AccountStatus.ACTIVE) {
      throw new BadRequestException(
        'Password reset is only available for active accounts.',
      );
    }
    if (!user.email) {
      throw new BadRequestException('This account has no email address.');
    }
    await this.auth.forgotPassword({ email: user.email });
    await this.audit.record(
      actorId,
      'user.password_reset_sent',
      'User',
      userId,
      { channel: 'EMAIL' },
      why,
    );
    return { id: userId, requested: true };
  }

  async setVerification(
    actorId: string,
    userId: string,
    status: VerificationStatus,
    reason: string,
  ) {
    const why = requireReason(reason);
    const user = await this.loadForAction(actorId, userId);
    if (user.accountStatus === AccountStatus.DELETED) {
      throw new BadRequestException('Deleted accounts cannot be verified.');
    }
    if (user.verificationStatus === status) {
      throw new BadRequestException('The account already has that status.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { verificationStatus: status },
      });
      await this.audit.recordIn(
        tx,
        actorId,
        'user.verification_change',
        'User',
        userId,
        { previousStatus: user.verificationStatus, status },
        why,
      );
    });
    return { id: userId, verificationStatus: status };
  }

  async updateUserProfile(
    actorId: string,
    userId: string,
    input: {
      firstName?: string;
      lastName?: string;
      bio?: string | null;
      phone?: string | null;
      phoneOnWhatsApp?: boolean;
      reason?: string;
    },
  ) {
    const { reason, ...changes } = input;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        accountStatus: true,
        firstName: true,
        lastName: true,
        bio: true,
        phone: true,
        phoneOnWhatsApp: true,
      },
    });
    if (!user) throw new NotFoundException('User not found.');
    if (user.accountStatus === AccountStatus.DELETED) {
      throw new BadRequestException('Deleted accounts cannot be edited.');
    }
    if (changes.phone === null || changes.phone === '') {
      changes.phoneOnWhatsApp = false;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.user.update({
        where: { id: userId },
        data: changes,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          bio: true,
          phone: true,
          phoneOnWhatsApp: true,
        },
      });
      await this.audit.recordIn(
        tx,
        actorId,
        'user.profile_update',
        'User',
        userId,
        {
          changes: Object.fromEntries(
            Object.entries(changes).map(([key, value]) => [
              key,
              { from: user[key as keyof typeof user], to: value },
            ]),
          ),
        },
        reason,
      );
      return row;
    });
    return { user: updated };
  }

  // ----------------------------------------------------- club memberships

  /**
   * Create or change a user's membership of one club. This is the platform
   * route for role management — `ClubMembership.role` is the only stored role,
   * and platform permissions (`PlatformAdmin`) are a separate identity that
   * this can never grant.
   *
   * Privilege-escalation guards:
   *  - Granting OWNER, or touching an existing OWNER, needs ACCESS_MANAGE on
   *    top of USERS_MANAGE.
   *  - A club can never be left without an ACTIVE owner.
   */
  async setClubMembership(
    actorId: string,
    userId: string,
    clubId: string,
    input: { role: ClubRole; status?: ClubMembershipStatus },
    reason: string,
  ) {
    const why = requireReason(reason);
    const user = await this.loadForAction(actorId, userId);
    if (user.accountStatus === AccountStatus.DELETED) {
      throw new BadRequestException(
        'Deleted accounts cannot hold club memberships.',
      );
    }
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, name: true },
    });
    if (!club) throw new NotFoundException('Club not found.');

    const nextStatus = input.status ?? ClubMembershipStatus.ACTIVE;

    const membership = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.clubMembership.findUnique({
        where: { clubId_userId: { clubId, userId } },
        select: { id: true, role: true, status: true },
      });
      if (
        existing &&
        existing.role === input.role &&
        existing.status === nextStatus
      ) {
        throw new BadRequestException('The membership already has that role.');
      }

      const touchesOwner =
        input.role === ClubRole.OWNER || existing?.role === ClubRole.OWNER;
      if (touchesOwner) await this.assertCanManageOwners(actorId);

      const losesActiveOwner =
        existing?.role === ClubRole.OWNER &&
        existing.status === ClubMembershipStatus.ACTIVE &&
        (input.role !== ClubRole.OWNER ||
          nextStatus !== ClubMembershipStatus.ACTIVE);
      if (losesActiveOwner) await this.assertOtherOwnerRemains(tx, clubId, userId);

      const saved = await tx.clubMembership.upsert({
        where: { clubId_userId: { clubId, userId } },
        create: { clubId, userId, role: input.role, status: nextStatus },
        update: { role: input.role, status: nextStatus },
        select: { role: true, status: true },
      });
      await this.audit.recordIn(
        tx,
        actorId,
        existing ? 'user.club_membership_change' : 'user.club_membership_add',
        'User',
        userId,
        {
          clubId,
          clubName: club.name,
          from: existing
            ? { role: existing.role, status: existing.status }
            : null,
          to: { role: saved.role, status: saved.status },
        },
        why,
      );
      return saved;
    });

    return { userId, clubId, ...membership };
  }

  async removeClubMembership(
    actorId: string,
    userId: string,
    clubId: string,
    reason: string,
  ) {
    const why = requireReason(reason);
    await this.loadForAction(actorId, userId);

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.clubMembership.findUnique({
        where: { clubId_userId: { clubId, userId } },
        select: {
          id: true,
          role: true,
          status: true,
          club: { select: { name: true } },
        },
      });
      if (!existing) throw new NotFoundException('Membership not found.');
      if (existing.role === ClubRole.OWNER) {
        await this.assertCanManageOwners(actorId);
        if (existing.status === ClubMembershipStatus.ACTIVE) {
          await this.assertOtherOwnerRemains(tx, clubId, userId);
        }
      }
      await tx.clubMembership.delete({ where: { id: existing.id } });
      await this.audit.recordIn(
        tx,
        actorId,
        'user.club_membership_remove',
        'User',
        userId,
        {
          clubId,
          clubName: existing.club.name,
          from: { role: existing.role, status: existing.status },
        },
        why,
      );
    });

    return { userId, clubId, removed: true };
  }

  // --------------------------------------------------------- coach listing

  /**
   * Hide or reinstate a coach's public listing without touching the account.
   * The coach can still sign in and edit their profile; Discover and the
   * public profile endpoint simply stop returning them (`CoachesService`).
   * Independent of `CoachProfile.verificationStatus`, which belongs to the
   * application-review flow.
   */
  async setCoachListing(
    actorId: string,
    userId: string,
    suspended: boolean,
    reason: string,
  ) {
    const why = requireReason(reason);
    await this.loadForAction(actorId, userId);
    const profile = await this.prisma.coachProfile.findUnique({
      where: { userId },
      select: { id: true, listingSuspendedAt: true },
    });
    if (!profile) {
      throw new BadRequestException('This user has no coach profile.');
    }
    const isSuspended = profile.listingSuspendedAt !== null;
    if (isSuspended === suspended) {
      throw new BadRequestException(
        suspended
          ? 'This coach listing is already suspended.'
          : 'This coach listing is not suspended.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.coachProfile.update({
        where: { id: profile.id },
        data: suspended
          ? { listingSuspendedAt: new Date(), listingSuspendedReason: why }
          : { listingSuspendedAt: null, listingSuspendedReason: null },
      });
      await this.audit.recordIn(
        tx,
        actorId,
        suspended ? 'user.coach_listing_suspend' : 'user.coach_listing_reinstate',
        'User',
        userId,
        { coachProfileId: profile.id },
        why,
      );
    });

    return { userId, coachListingSuspended: suspended };
  }

  // --------------------------------------------------------------- helpers

  private async assertUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found.');
  }

  /**
   * Loads the target and refuses to let staff act on their own player account:
   * the same person can hold a PlatformAdmin and a player identity, and
   * self-suspension, self-promotion or self-erasure through this console would
   * bypass the second pair of eyes the audit trail assumes.
   */
  private async loadForAction(actorId: string, userId: string) {
    const [user, admin] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          accountStatus: true,
          verificationStatus: true,
        },
      }),
      this.prisma.platformAdmin.findUnique({
        where: { id: actorId },
        select: { email: true },
      }),
    ]);
    if (!user) throw new NotFoundException('User not found.');
    if (
      admin?.email &&
      user.email &&
      admin.email.toLowerCase() === user.email.toLowerCase()
    ) {
      throw new ForbiddenException(
        'You cannot take administrative actions on your own account.',
      );
    }
    return user;
  }

  private async assertCanManageOwners(actorId: string) {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: actorId },
      select: {
        role: { select: { permissions: { select: { permission: true } } } },
      },
    });
    const allowed = admin?.role.permissions.some(
      (row) => row.permission === PlatformPermission.ACCESS_MANAGE,
    );
    if (!allowed) {
      throw new ForbiddenException(
        'Changing a club owner requires the access-management permission.',
      );
    }
  }

  private async assertOtherOwnerRemains(
    tx: Prisma.TransactionClient,
    clubId: string,
    leavingUserId: string,
  ) {
    const others = await tx.clubMembership.count({
      where: {
        clubId,
        role: ClubRole.OWNER,
        status: ClubMembershipStatus.ACTIVE,
        userId: { not: leavingUserId },
      },
    });
    if (others === 0) {
      throw new BadRequestException(
        'A club must keep at least one active owner. Promote another owner first.',
      );
    }
  }
}
