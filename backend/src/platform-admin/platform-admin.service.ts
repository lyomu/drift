import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AccountStatus,
  ClubMembershipStatus,
  ClubRole,
  NewsModerationStatus,
  Prisma,
  VerificationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ResultsService } from '../matches/results.service';
import { AuditService } from './audit.service';
import { MailerService } from '../mail/mailer.service';
import { PasswordPolicyService } from '../auth/password-policy';
import { assertFeedUrlAllowed, FeedUrlError } from '../news/feed-fetch';
import { randomInt } from 'crypto';

/**
 * Reject a feed URL an admin cannot save: malformed, non-HTTPS, pointed at a
 * blocked IP literal, or off `NEWS_FEED_ALLOWED_HOSTS`. This is a write-time
 * shape check only — the ingestion worker still re-validates DNS on every fetch
 * (`feed-fetch.ts`), which is the control that survives a later DNS change.
 */
function validateNewsSourceFeedUrl(feedUrl?: string | null): void {
  if (feedUrl == null || feedUrl.trim() === '') return;
  try {
    assertFeedUrlAllowed(feedUrl);
  } catch (error) {
    if (error instanceof FeedUrlError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  accountStatus: true,
  verificationStatus: true,
  onboardingStep: true,
  createdAt: true,
  // Category is derived, not stored: `User` has no role column, so a row's
  // categories come from which profile relations exist. These selects stay
  // id-only so listing stays cheap — the detail endpoint loads the rest.
  tennisProfile: { select: { id: true } },
  padelProfile: { select: { id: true } },
  coachProfile: { select: { id: true } },
  clubMemberships: {
    where: { status: ClubMembershipStatus.ACTIVE },
    select: { role: true, club: { select: { id: true, name: true } } },
  },
};

/**
 * The category buckets Platform Admin filters on. Deliberately overlapping: a
 * club owner who also plays and coaches is all three at once, so these are
 * tags on a user rather than a partition of them, and the per-category counts
 * sum to more than the user total.
 */
export type UserCategory = 'PLAYER' | 'COACH' | 'CLUB_STAFF';

const USER_CATEGORY_WHERE: Record<UserCategory, Prisma.UserWhereInput> = {
  PLAYER: {
    OR: [{ tennisProfile: { isNot: null } }, { padelProfile: { isNot: null } }],
  },
  COACH: { coachProfile: { isNot: null } },
  CLUB_STAFF: {
    clubMemberships: { some: { status: ClubMembershipStatus.ACTIVE } },
  },
};

type UserRowWithRelations = {
  tennisProfile: { id: string } | null;
  padelProfile: { id: string } | null;
  coachProfile: { id: string } | null;
  clubMemberships: { role: ClubRole; club: { id: string; name: string } }[];
};

/**
 * Collapse the relation flags into the tag list the console renders, so the
 * derivation rules live in one place instead of being restated in the UI.
 */
function categoriesOf(user: UserRowWithRelations): UserCategory[] {
  const categories: UserCategory[] = [];
  if (user.tennisProfile || user.padelProfile) categories.push('PLAYER');
  if (user.coachProfile) categories.push('COACH');
  if (user.clubMemberships.length > 0) categories.push('CLUB_STAFF');
  return categories;
}

const REPORT_INCLUDES = {
  player: {
    include: {
      reporter: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      reported: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  },
  message: {
    include: {
      reporter: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      message: {
        select: { id: true, body: true, senderId: true, conversationId: true },
      },
    },
  },
  court: {
    include: {
      reporter: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      court: { select: { id: true, name: true, address: true } },
    },
  },
};

const RESET_CODE_TTL_MS = 30 * 60 * 1000;
const RESET_CODE_COOLDOWN_MS = 60 * 1000;
const MAX_RESET_ATTEMPTS = 5;
const PLATFORM_ADMIN_2FA_TEMPORARILY_DISABLED = true;

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly results: ResultsService,
    private readonly jwt: JwtService,
    private readonly mailer: MailerService,
    private readonly passwordPolicy: PasswordPolicyService,
  ) {}

  // ------------------------------------------------------------------ auth

  async login(email: string, password: string) {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { email },
    });
    if (
      !admin ||
      admin.deactivatedAt ||
      !(await bcrypt.compare(password, admin.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (PLATFORM_ADMIN_2FA_TEMPORARILY_DISABLED) {
      await this.prisma.platformAdmin.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      });
      return {
        requiresTwoFactor: false,
        accessToken: await this.issueAccessToken(admin.id),
        adminId: admin.id,
        name: admin.name,
      };
    }

    return this.createTwoFactorChallenge(admin.id, admin.email);
  }

  async verifyTwoFactor(challengeToken: string, code: string) {
    const payload = await this.verifyChallengeToken(challengeToken);
    const challenge =
      await this.prisma.platformAdminTwoFactorChallenge.findUnique({
        where: { id: payload.challengeId },
        include: { admin: true },
      });
    if (
      !challenge ||
      challenge.adminId !== payload.sub ||
      challenge.admin.deactivatedAt ||
      challenge.consumedAt ||
      challenge.expiresAt <= new Date() ||
      challenge.attempts >= 5
    ) {
      throw new UnauthorizedException('Invalid or expired code.');
    }
    const valid = await bcrypt.compare(code, challenge.codeHash);
    if (!valid) {
      await this.prisma.platformAdminTwoFactorChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid or expired code.');
    }

    await this.prisma.$transaction([
      this.prisma.platformAdminTwoFactorChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.platformAdmin.update({
        where: { id: challenge.adminId },
        data: { lastLoginAt: new Date() },
      }),
    ]);
    return {
      accessToken: await this.issueAccessToken(challenge.adminId),
      adminId: challenge.adminId,
      name: challenge.admin.name,
    };
  }

  async resendTwoFactor(challengeToken: string) {
    const payload = await this.verifyChallengeToken(challengeToken);
    const challenge =
      await this.prisma.platformAdminTwoFactorChallenge.findUnique({
        where: { id: payload.challengeId },
        include: { admin: true },
      });
    if (
      !challenge ||
      challenge.adminId !== payload.sub ||
      challenge.admin.deactivatedAt
    ) {
      throw new UnauthorizedException(
        'The sign-in challenge has expired. Start again.',
      );
    }
    if (!challenge.consumedAt) {
      await this.prisma.platformAdminTwoFactorChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
    }
    return this.createTwoFactorChallenge(
      challenge.admin.id,
      challenge.admin.email,
    );
  }

  async forgotPassword(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { email },
    });
    if (!admin || admin.deactivatedAt) return {};

    const recent = await this.prisma.platformAdminPasswordReset.findFirst({
      where: {
        adminId: admin.id,
        consumedAt: null,
        lastSentAt: { gt: new Date(Date.now() - RESET_CODE_COOLDOWN_MS) },
      },
      orderBy: { lastSentAt: 'desc' },
    });
    if (recent) return {};

    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);
    await this.prisma.$transaction(async (tx) => {
      await tx.platformAdminPasswordReset.updateMany({
        where: { adminId: admin.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await tx.platformAdminPasswordReset.create({
        data: {
          adminId: admin.id,
          codeHash: await bcrypt.hash(code, 8),
          expiresAt,
          lastSentAt: new Date(),
        },
      });
    });

    if (process.env.NODE_ENV !== 'production') {
      console.info(`[platform-admin] Password reset code for ${email}: ${code}`);
    }
    const sent = await this.mailer.sendVerificationCode(
      email,
      code,
      'platform-password-reset',
    );
    return {
      delivery: sent
        ? 'EMAIL'
        : process.env.NODE_ENV === 'production'
          ? 'PENDING_PROVIDER'
          : 'DEV_CONSOLE',
      ...(process.env.NODE_ENV !== 'production'
        ? { devVerificationCode: code }
        : {}),
    };
  }

  async resetPassword(emailInput: string, code: string, newPassword: string) {
    const email = emailInput.trim().toLowerCase();
    const reset = await this.prisma.platformAdminPasswordReset.findFirst({
      where: {
        consumedAt: null,
        admin: { email, deactivatedAt: null },
      },
      include: { admin: true },
      orderBy: { createdAt: 'desc' },
    });

    if (
      !reset ||
      reset.expiresAt <= new Date() ||
      reset.attempts >= MAX_RESET_ATTEMPTS
    ) {
      throw new BadRequestException('Invalid or expired reset code.');
    }

    const valid = await bcrypt.compare(code, reset.codeHash);
    if (!valid) {
      await this.prisma.platformAdminPasswordReset.update({
        where: { id: reset.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid or expired reset code.');
    }

    await this.passwordPolicy.assertAcceptable(newPassword);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.platformAdmin.update({
        where: { id: reset.adminId },
        data: { passwordHash },
      }),
      this.prisma.platformAdminPasswordReset.update({
        where: { id: reset.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.platformAdminTwoFactorChallenge.updateMany({
        where: { adminId: reset.adminId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
    ]);
  }

  private async createTwoFactorChallenge(adminId: string, email: string) {
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const challenge = await this.prisma.platformAdminTwoFactorChallenge.create({
      data: {
        adminId,
        codeHash: await bcrypt.hash(code, 8),
        expiresAt,
      },
    });
    const challengeToken = await this.jwt.signAsync(
      { sub: adminId, scope: 'platform-2fa', challengeId: challenge.id },
      { expiresIn: '10m' as never },
    );
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[platform-admin] 2FA code for ${email}: ${code}`);
    }
    const sent = await this.mailer.sendVerificationCode(
      email,
      code,
      'platform-2fa',
    );
    return {
      requiresTwoFactor: true,
      challengeToken,
      expiresAt,
      maskedDestination: this.maskEmail(email),
      delivery: sent
        ? 'EMAIL'
        : process.env.NODE_ENV === 'production'
          ? 'PENDING_PROVIDER'
          : 'DEV_CONSOLE',
      ...(process.env.NODE_ENV !== 'production'
        ? { devVerificationCode: code }
        : {}),
    };
  }

  private async verifyChallengeToken(token: string) {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        scope: string;
        challengeId: string;
      }>(token);
      if (payload.scope !== 'platform-2fa' || !payload.challengeId)
        throw new Error();
      return payload;
    } catch {
      throw new UnauthorizedException(
        'The sign-in challenge has expired. Start again.',
      );
    }
  }

  private issueAccessToken(adminId: string) {
    return this.jwt.signAsync({ sub: adminId, scope: 'platform' });
  }

  private maskEmail(email: string) {
    const [local, domain] = email.split('@');
    return `${local.slice(0, 2)}•••@${domain}`;
  }

  // ----------------------------------------------------------------- users

  async listUsers(query: {
    query?: string;
    status?: string;
    category?: string;
    take?: number;
    skip?: number;
  }) {
    const category = query.category as UserCategory | undefined;
    if (category && !(category in USER_CATEGORY_WHERE)) {
      throw new BadRequestException('Unknown user category.');
    }

    const where: Prisma.UserWhereInput = {
      AND: [
        query.query
          ? {
              OR: [
                {
                  email: {
                    contains: query.query,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  firstName: {
                    contains: query.query,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  lastName: {
                    contains: query.query,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {},
        query.status ? { accountStatus: query.status as AccountStatus } : {},
        category ? USER_CATEGORY_WHERE[category] : {},
      ],
    };

    // The status/category tallies deliberately ignore `where` and count the
    // whole platform: they are the "what is out there" band above the table,
    // not a summary of the current filter. Counting the page instead (what
    // the console used to do client-side) silently under-reports past the
    // first page.
    const [users, total, active, suspended, deleted, players, coaches, clubStaff] =
      await this.prisma.$transaction([
        this.prisma.user.findMany({
          where,
          select: USER_SELECT,
          orderBy: { createdAt: 'desc' },
          take: Math.min(query.take ?? 50, 200),
          skip: query.skip ?? 0,
        }),
        this.prisma.user.count({ where }),
        this.prisma.user.count({
          where: { accountStatus: AccountStatus.ACTIVE },
        }),
        this.prisma.user.count({
          where: { accountStatus: AccountStatus.SUSPENDED },
        }),
        this.prisma.user.count({
          where: { accountStatus: AccountStatus.DELETED },
        }),
        this.prisma.user.count({ where: USER_CATEGORY_WHERE.PLAYER }),
        this.prisma.user.count({ where: USER_CATEGORY_WHERE.COACH }),
        this.prisma.user.count({ where: USER_CATEGORY_WHERE.CLUB_STAFF }),
      ]);

    return {
      total,
      counts: { active, suspended, deleted, players, coaches, clubStaff },
      users: users.map(({ tennisProfile, padelProfile, coachProfile, clubMemberships, ...user }) => ({
        ...user,
        categories: categoriesOf({
          tennisProfile,
          padelProfile,
          coachProfile,
          clubMemberships,
        }),
        clubRoles: clubMemberships.map((membership) => ({
          role: membership.role,
          clubId: membership.club.id,
          clubName: membership.club.name,
        })),
      })),
    };
  }

  async setUserStatus(
    actorId: string,
    userId: string,
    status: 'ACTIVE' | 'SUSPENDED',
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    if (user.accountStatus === 'DELETED') {
      throw new BadRequestException('Deleted accounts cannot be re-statused.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { accountStatus: status },
      }),
      // Suspension must cut live sessions, not just the next login.
      ...(status === 'SUSPENDED'
        ? [
            this.prisma.refreshToken.updateMany({
              where: { userId, revokedAt: null },
              data: { revokedAt: new Date() },
            }),
          ]
        : []),
    ]);

    await this.audit.record(
      actorId,
      status === 'SUSPENDED' ? 'user.suspend' : 'user.restore',
      'User',
      userId,
      { previousStatus: user.accountStatus },
    );

    return { id: userId, status };
  }

  /**
   * Everything an admin needs to judge one account before acting on it. Kept
   * separate from `listUsers` because it fans out across every profile
   * relation — fine for one row, far too heavy for a page of them.
   */
  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
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
        tennisProfile: {
          select: {
            singlesRating: true,
            doublesRating: true,
            dominantHand: true,
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
            affiliations: {
              select: { club: { select: { id: true, name: true } } },
            },
          },
        },
        clubMemberships: {
          where: { status: ClubMembershipStatus.ACTIVE },
          select: {
            role: true,
            createdAt: true,
            club: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: {
            matchParticipations: true,
            reportsReceived: true,
            connectionsRequested: true,
            connectionsReceived: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found.');

    // An un-revoked, unexpired refresh token is the closest thing to a
    // "currently signed in" signal — there is no lastLoginAt column.
    const activeSessions = await this.prisma.refreshToken.count({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });

    const { _count, clubMemberships, coachProfile, ...rest } = user;

    return {
      user: {
        ...rest,
        coachProfile: coachProfile
          ? {
              ...coachProfile,
              affiliations: coachProfile.affiliations.map((a) => a.club),
            }
          : null,
        categories: categoriesOf({
          tennisProfile: user.tennisProfile ? { id: '' } : null,
          padelProfile: user.padelProfile ? { id: '' } : null,
          coachProfile: coachProfile ? { id: coachProfile.id } : null,
          clubMemberships: clubMemberships.map((m) => ({
            role: m.role,
            club: m.club,
          })),
        }),
        clubMemberships: clubMemberships.map((m) => ({
          role: m.role,
          joinedAt: m.createdAt,
          clubId: m.club.id,
          clubName: m.club.name,
        })),
        stats: {
          matches: _count.matchParticipations,
          reportsReceived: _count.reportsReceived,
          connections:
            _count.connectionsRequested + _count.connectionsReceived,
          activeSessions,
        },
      },
    };
  }

  /**
   * Cut every live session without touching account status — the softer
   * sibling of suspension, for "sign them out everywhere" support requests.
   */
  async revokeUserSessions(actorId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found.');

    const { count } = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.audit.record(
      actorId,
      'user.revoke_sessions',
      'User',
      userId,
      { revokedTokens: count },
    );

    return { id: userId, revokedTokens: count };
  }

  /**
   * Manual identity verification. This is `User.verificationStatus` — the
   * account-level check — and deliberately does not touch
   * `CoachProfile.verificationStatus`, which is listing verification owned by
   * the coach review flow.
   */
  async setUserVerification(
    actorId: string,
    userId: string,
    status: VerificationStatus,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { verificationStatus: true, accountStatus: true },
    });
    if (!user) throw new NotFoundException('User not found.');
    if (user.accountStatus === AccountStatus.DELETED) {
      throw new BadRequestException('Deleted accounts cannot be verified.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: status },
    });

    await this.audit.record(
      actorId,
      'user.verification_change',
      'User',
      userId,
      { previousStatus: user.verificationStatus, status },
    );

    return { id: userId, verificationStatus: status };
  }

  // --------------------------------------------------------------- reports

  async listReports(type: 'player' | 'message' | 'court', status?: string) {
    const reportStatus = status as
      'OPEN' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED' | undefined;
    const where = reportStatus ? { status: reportStatus } : undefined;

    if (type === 'player') {
      return {
        reports: await this.prisma.playerReport.findMany({
          ...REPORT_INCLUDES.player,
          where,
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
      };
    }
    if (type === 'message') {
      return {
        reports: await this.prisma.messageReport.findMany({
          ...REPORT_INCLUDES.message,
          where,
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
      };
    }
    return {
      reports: await this.prisma.courtReport.findMany({
        ...REPORT_INCLUDES.court,
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    };
  }

  async updateReport(
    actorId: string,
    type: 'player' | 'message' | 'court',
    reportId: string,
    status: 'REVIEWING' | 'RESOLVED' | 'DISMISSED',
  ) {
    let previousStatus: string;
    if (type === 'player') {
      const existing = await this.prisma.playerReport.findUnique({
        where: { id: reportId },
      });
      if (!existing) throw new NotFoundException('Report not found.');
      previousStatus = existing.status;
      await this.prisma.playerReport.update({
        where: { id: reportId },
        data: { status },
      });
    } else if (type === 'message') {
      const existing = await this.prisma.messageReport.findUnique({
        where: { id: reportId },
      });
      if (!existing) throw new NotFoundException('Report not found.');
      previousStatus = existing.status;
      await this.prisma.messageReport.update({
        where: { id: reportId },
        data: { status },
      });
    } else {
      const existing = await this.prisma.courtReport.findUnique({
        where: { id: reportId },
      });
      if (!existing) throw new NotFoundException('Report not found.');
      previousStatus = existing.status;
      await this.prisma.courtReport.update({
        where: { id: reportId },
        data: { status },
      });
    }

    await this.audit.record(
      actorId,
      `report.${status.toLowerCase()}`,
      `${type[0].toUpperCase()}${type.slice(1)}Report`,
      reportId,
      { previousStatus },
    );

    return { id: reportId, status };
  }

  // ------------------------------------------------------------------ news

  async listNewsSources() {
    return {
      sources: await this.prisma.newsSource.findMany({
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { stories: true } } },
      }),
    };
  }

  async createNewsSource(
    actorId: string,
    data: {
      name: string;
      feedUrl?: string | null;
      status: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
    },
  ) {
    validateNewsSourceFeedUrl(data.feedUrl);
    const source = await this.prisma.newsSource.create({ data });
    await this.audit.record(
      actorId,
      'news_source.create',
      'NewsSource',
      source.id,
      {
        name: source.name,
      },
    );
    return source;
  }

  async updateNewsSource(
    actorId: string,
    sourceId: string,
    data: {
      name: string;
      feedUrl?: string | null;
      status: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
    },
  ) {
    validateNewsSourceFeedUrl(data.feedUrl);
    const existing = await this.prisma.newsSource.findUnique({
      where: { id: sourceId },
    });
    if (!existing) throw new NotFoundException('News source not found.');

    const source = await this.prisma.newsSource.update({
      where: { id: sourceId },
      data,
    });
    await this.audit.record(
      actorId,
      'news_source.update',
      'NewsSource',
      sourceId,
      data,
    );
    return source;
  }

  async listStories(moderation?: string, sourceId?: string) {
    return {
      stories: await this.prisma.newsStory.findMany({
        where: {
          ...(moderation
            ? {
                moderationStatus: moderation as NewsModerationStatus,
              }
            : {}),
          ...(sourceId ? { sourceId } : {}),
        },
        include: { source: { select: { id: true, name: true } } },
        orderBy: { publicationDate: 'desc' },
        take: 200,
      }),
    };
  }

  async moderateStory(
    actorId: string,
    storyId: string,
    moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    const story = await this.prisma.newsStory.findUnique({
      where: { id: storyId },
    });
    if (!story) throw new NotFoundException('Story not found.');

    const updated = await this.prisma.newsStory.update({
      where: { id: storyId },
      data: { moderationStatus },
    });

    await this.audit.record(
      actorId,
      `story.${moderationStatus.toLowerCase()}`,
      'NewsStory',
      storyId,
      { headline: story.headline },
    );

    return updated;
  }

  // -------------------------------------------------------------- disputes

  async listDisputes() {
    return {
      disputes: await this.prisma.matchResult.findMany({
        where: { status: 'DISPUTED' },
        select: {
          id: true,
          matchId: true,
          submittedById: true,
          disputedById: true,
          sets: true,
          disputantSets: true,
          disputedAt: true,
          match: {
            select: {
              id: true,
              state: true,
              participants: {
                select: {
                  side: true,
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { disputedAt: 'desc' },
        take: 200,
      }),
    };
  }

  async ruleOnDispute(
    actorId: string,
    matchId: string,
    ruling: 'SUBMITTED' | 'DISPUTANT',
  ) {
    // The existing resolution machinery is reused unchanged — same ruling
    // semantics club-admin already exercises. Attribution goes to the staff
    // account (separate credentials), so settle() skips the User FK.
    const result = await this.results.adminResolveDispute(
      matchId,
      actorId,
      ruling,
      { platformAdminId: actorId },
    );
    await this.audit.record(actorId, 'dispute.resolve', 'Match', matchId, {
      ruling,
    });
    return result;
  }

  // ----------------------------------------------------------- audit trail

  listAuditLogs(query: {
    actorId?: string;
    action?: string;
    take?: number;
    skip?: number;
  }) {
    return this.prisma.adminAuditLog.findMany({
      where: {
        ...(query.actorId ? { actorId: query.actorId } : {}),
        ...(query.action ? { action: query.action } : {}),
      },
      include: { actor: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(query.take ?? 100, 500),
      skip: query.skip ?? 0,
    });
  }
}
