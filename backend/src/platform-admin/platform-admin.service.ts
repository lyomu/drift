import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountStatus, NewsModerationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ResultsService } from '../matches/results.service';
import { AuditService } from './audit.service';
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
  onboardingStep: true,
  createdAt: true,
};

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

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly results: ResultsService,
    private readonly jwt: JwtService,
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
    return {
      delivery:
        process.env.NODE_ENV === 'production'
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
    return {
      requiresTwoFactor: true,
      challengeToken,
      expiresAt,
      maskedDestination: this.maskEmail(email),
      delivery:
        process.env.NODE_ENV === 'production'
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
    take?: number;
    skip?: number;
  }) {
    const where = {
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
      ],
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        take: Math.min(query.take ?? 50, 200),
        skip: query.skip ?? 0,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { total, users };
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
