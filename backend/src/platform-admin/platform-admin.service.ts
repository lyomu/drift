import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { NewsModerationStatus, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ResultsService } from '../matches/results.service';
import { AuditService } from './audit.service';
import { MailerService } from '../mail/mailer.service';
import { PasswordPolicyService } from '../auth/password-policy';
import {
  assertFeedUrlAllowed,
  FeedUrlError,
  fetchFeedDocument,
} from '../news/feed-fetch';
import { safePublisherUrl, visibleNewsWhere } from '../news/news-rights';
import Parser from 'rss-parser';
import type {
  UpdateNewsSourceRightsDto,
  UpdateNewsStoryDto,
  CreateNewsCategoryDto,
  UpdateNewsCategoryDto,
  UpdateNewsSettingsDto,
} from './dto/platform-admin.dto';
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
      console.info(
        `[platform-admin] Password reset code for ${email}: ${code}`,
      );
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

  async newsOverview() {
    const [
      total,
      published,
      pending,
      rejected,
      sources,
      activeSources,
      failedSources,
      recentRuns,
    ] = await Promise.all([
      this.prisma.newsStory.count(),
      this.prisma.newsStory.count({ where: visibleNewsWhere() }),
      this.prisma.newsStory.count({ where: { moderationStatus: 'PENDING' } }),
      this.prisma.newsStory.count({ where: { moderationStatus: 'REJECTED' } }),
      this.prisma.newsSource.count(),
      this.prisma.newsSource.count({ where: { status: 'ACTIVE' } }),
      this.prisma.newsSource.count({ where: { status: 'BLOCKED' } }),
      this.prisma.newsIngestionRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 5,
        include: { source: { select: { name: true } } },
      }),
    ]);
    return {
      total,
      published,
      pending,
      rejected,
      sources,
      activeSources,
      failedSources,
      recentRuns,
    };
  }

  async listNewsSources() {
    return {
      sources: await this.prisma.newsSource.findMany({
        orderBy: { createdAt: 'asc' },
        include: { rights: true, _count: { select: { stories: true } } },
      }),
    };
  }

  async createNewsSource(
    actorId: string,
    data: {
      name: string;
      feedUrl?: string | null;
      status: 'ACTIVE' | 'PAUSED' | 'BLOCKED';
      pollIntervalMinutes?: number;
      publicationMode?: 'MANUAL' | 'AUTO';
    },
  ) {
    validateNewsSourceFeedUrl(data.feedUrl);
    // A new source goes live as soon as it is added — the console confirms the
    // action first. What keeps third-party content out of the app is story
    // moderation (the review queue), not a per-source approval step.
    // publicationMode stays MANUAL regardless: AUTO requires reviewed rights,
    // and a source being created has no rights record to check yet.
    const source = await this.prisma.newsSource.create({
      data: {
        ...data,
        status: data.status ?? 'ACTIVE',
        publicationMode: 'MANUAL',
      },
    });
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
      pollIntervalMinutes?: number;
      publicationMode?: 'MANUAL' | 'AUTO';
    },
  ) {
    validateNewsSourceFeedUrl(data.feedUrl);
    const existing = await this.prisma.newsSource.findUnique({
      where: { id: sourceId },
      include: { rights: true },
    });
    if (!existing) throw new NotFoundException('News source not found.');
    const nextFeedUrl =
      data.feedUrl === undefined ? existing.feedUrl : data.feedUrl || null;
    const identityChanged =
      existing.feedUrl !== nextFeedUrl || existing.name !== data.name;
    const source = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.newsSource.update({
        where: { id: sourceId },
        data: {
          ...data,
          status: data.status,
          publicationMode: identityChanged
            ? 'MANUAL'
            : (data.publicationMode ?? existing.publicationMode),
          ...(identityChanged
            ? { feedEtag: null, feedLastModified: null, nextPollAt: null }
            : {}),
        },
      });
      if (identityChanged) {
        // The reviewed thing changed, so the review no longer describes it:
        // drop back to UNREVIEWED, which only costs AUTO mode now that
        // activation is ungated. Stories already approved under the old feed
        // stay approved — they were published legitimately and un-publishing
        // them would be a surprise.
        await tx.newsSourceRights.updateMany({
          where: { sourceId },
          data: { status: 'UNREVIEWED', reviewedBy: null, reviewedAt: null },
        });
      }
      return updated;
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

  async getNewsSourceRights(sourceId: string) {
    const source = await this.prisma.newsSource.findUnique({
      where: { id: sourceId },
      include: { rights: true },
    });
    if (!source) throw new NotFoundException('News source not found.');
    return { rights: source.rights };
  }

  async testNewsSource(sourceId: string) {
    const source = await this.prisma.newsSource.findUnique({
      where: { id: sourceId },
    });
    if (!source) throw new NotFoundException('News source not found.');
    if (!source.feedUrl)
      throw new BadRequestException('Source has no feed URL.');
    const started = Date.now();
    try {
      const document = await fetchFeedDocument(source.feedUrl);
      const xml = document.xml!;
      if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
        throw new Error('INVALID_XML_DTD');
      }
      const feed = await new Parser().parseString(xml);
      return {
        status: 'OK',
        latencyMs: document.latencyMs,
        httpStatus: document.httpStatus,
        finalUrl: document.finalUrl,
        redirectCount: document.redirectCount,
        feedTitle: feed.title ?? null,
        itemCount: feed.items.length,
        sampleItems: feed.items.slice(0, 3).map((item) => ({
          title: item.title ?? null,
          hasLink: safePublisherUrl(item.link ?? ''),
          hasDate: Boolean(item.isoDate || item.pubDate),
          hasExcerpt: Boolean(item.contentSnippet),
        })),
      };
    } catch (error) {
      return {
        status: 'FAILED',
        latencyMs: Date.now() - started,
        httpStatus:
          error instanceof FeedUrlError ? (error.httpStatus ?? null) : null,
        errorCode: 'INVALID_OR_UNAVAILABLE_FEED',
      };
    }
  }

  async assertNewsSourceCanSync(actorId: string, sourceId: string) {
    const settings = await this.prisma.newsSettings.findUnique({
      where: { id: 'default' },
    });
    if (settings?.ingestionPaused) {
      throw new BadRequestException('News ingestion is paused.');
    }
    const source = await this.prisma.newsSource.findUnique({
      where: { id: sourceId },
    });
    if (!source) throw new NotFoundException('News source not found.');
    if (source.status !== 'ACTIVE' || !source.feedUrl) {
      throw new BadRequestException(
        'Source is not eligible for synchronization.',
      );
    }
    if (source.nextPollAt && source.nextPollAt > new Date()) {
      throw new BadRequestException('Source sync cooldown is still active.');
    }
    await this.audit.record(
      actorId,
      'news_source.sync_requested',
      'NewsSource',
      sourceId,
    );
  }

  async listNewsIngestionRuns(sourceId?: string, skip = 0) {
    const where = sourceId ? { sourceId } : undefined;
    const [runs, total] = await Promise.all([
      this.prisma.newsIngestionRun.findMany({
        where,
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        skip: Math.max(0, skip),
        take: 50,
        include: { source: { select: { name: true } } },
      }),
      this.prisma.newsIngestionRun.count({ where }),
    ]);
    return { runs, total };
  }

  async updateNewsSourceRights(
    actorId: string,
    sourceId: string,
    dto: UpdateNewsSourceRightsDto,
  ) {
    const source = await this.prisma.newsSource.findUnique({
      where: { id: sourceId },
    });
    if (!source) throw new NotFoundException('News source not found.');

    const expiry = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.expiresAt && Number.isNaN(expiry!.getTime())) {
      throw new BadRequestException('Invalid rights expiry date.');
    }
    if (dto.termsUrl && !safePublisherUrl(dto.termsUrl)) {
      throw new BadRequestException('Terms URL must be a safe HTTPS URL.');
    }
    const approved = dto.status === 'APPROVED';
    const data = {
      status: dto.status,
      termsUrl: dto.termsUrl?.trim() || null,
      permissionReference: dto.permissionReference?.trim() || null,
      commercialUseAllowed: dto.commercialUseAllowed,
      headlineAllowed: dto.headlineAllowed,
      excerptAllowed: dto.excerptAllowed,
      imageAllowed: dto.imageAllowed,
      aiProcessingAllowed: dto.aiProcessingAllowed,
      automaticPublishingAllowed: dto.automaticPublishingAllowed,
      cacheAllowed: dto.cacheAllowed,
      attributionText: dto.attributionText?.trim() || null,
      notes: dto.notes?.trim() || null,
      expiresAt: expiry,
      reviewedBy: approved ? actorId : null,
      reviewedAt: approved ? new Date() : null,
    };

    return this.prisma.$transaction(async (tx) => {
      const rights = await tx.newsSourceRights.upsert({
        where: { sourceId },
        create: { sourceId, ...data },
        update: data,
      });
      if (!approved) {
        await tx.newsSource.update({
          where: { id: sourceId },
          data: { status: 'PAUSED', publicationMode: 'MANUAL' },
        });
        await tx.newsStory.updateMany({
          where: { sourceId, moderationStatus: 'APPROVED' },
          data: { moderationStatus: 'PENDING', publishedAt: null },
        });
      }
      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: `news_rights.${dto.status.toLowerCase()}`,
          entityType: 'NewsSource',
          entityId: sourceId,
          metadata: {
            status: dto.status,
            commercialUseAllowed: dto.commercialUseAllowed,
            headlineAllowed: dto.headlineAllowed,
            excerptAllowed: dto.excerptAllowed,
            imageAllowed: dto.imageAllowed,
            aiProcessingAllowed: dto.aiProcessingAllowed,
            automaticPublishingAllowed: dto.automaticPublishingAllowed,
          },
        },
      });
      return { rights };
    });
  }

  async listStories(
    moderation?: string,
    sourceId?: string,
    search?: string,
    skip = 0,
    category?: string,
  ) {
    const where: Prisma.NewsStoryWhereInput = {
      ...(moderation
        ? { moderationStatus: moderation as NewsModerationStatus }
        : {}),
      ...(sourceId ? { sourceId } : {}),
      ...(category ? { categories: { has: category } } : {}),
      ...(search
        ? { headline: { contains: search, mode: 'insensitive' } }
        : {}),
    };
    const [stories, total] = await Promise.all([
      this.prisma.newsStory.findMany({
        where,
        include: {
          source: {
            select: {
              id: true,
              name: true,
              status: true,
              rights: { select: { status: true, expiresAt: true } },
            },
          },
        },
        orderBy: [{ publicationDate: 'desc' }, { id: 'desc' }],
        take: 50,
        skip: Math.max(0, skip),
      }),
      this.prisma.newsStory.count({ where }),
    ]);
    return {
      stories,
      total,
    };
  }

  async updateNewsStory(
    actorId: string,
    storyId: string,
    dto: UpdateNewsStoryDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const story = await tx.newsStory.findUnique({
        where: { id: storyId },
      });
      if (!story) throw new NotFoundException('News story not found.');
      if (story.moderationStatus !== 'PENDING') {
        throw new BadRequestException(
          'Unpublish this story before editing it.',
        );
      }
      if (story.editorialVersion !== dto.editorialVersion) {
        throw new ConflictException('Story changed. Reload before editing.');
      }
      const categoryCount = await tx.newsCategoryConfig.count({
        where: { slug: { in: dto.categories }, enabled: true },
      });
      if (
        categoryCount !== new Set(dto.categories).size ||
        categoryCount !== dto.categories.length
      ) {
        throw new BadRequestException(
          'Choose active, distinct news categories.',
        );
      }
      const changed = await tx.newsStory.updateMany({
        where: {
          id: storyId,
          editorialVersion: dto.editorialVersion,
          moderationStatus: 'PENDING',
        },
        data: {
          headline: dto.headline.trim(),
          highlight: dto.highlight.trim(),
          categories: dto.categories,
          editorialVersion: { increment: 1 },
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException('Story changed. Reload before editing.');
      }
      const updated = await tx.newsStory.findUniqueOrThrow({
        where: { id: storyId },
      });
      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: 'story.edit',
          entityType: 'NewsStory',
          entityId: storyId,
          metadata: {
            reason: dto.reason.trim(),
            previousVersion: story.editorialVersion,
            newVersion: updated.editorialVersion,
            previousHeadline: story.headline,
            newHeadline: updated.headline,
            previousHighlight: story.highlight,
            newHighlight: updated.highlight,
            previousCategories: story.categories,
            newCategories: updated.categories,
          },
        },
      });
      return updated;
    });
  }

  listNewsCategories() {
    return this.prisma.newsCategoryConfig.findMany({
      orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
    });
  }

  async createNewsCategory(actorId: string, dto: CreateNewsCategoryDto) {
    const category = await this.prisma.newsCategoryConfig.create({ data: dto });
    await this.audit.record(
      actorId,
      'news_category.create',
      'NewsCategoryConfig',
      category.slug,
      { ...dto },
    );
    return category;
  }

  async updateNewsCategory(
    actorId: string,
    slug: string,
    dto: UpdateNewsCategoryDto,
  ) {
    if (slug === 'LATEST' && !dto.enabled) {
      throw new BadRequestException('The Latest category must remain enabled.');
    }
    const category = await this.prisma.newsCategoryConfig.update({
      where: { slug },
      data: dto,
    });
    await this.audit.record(
      actorId,
      'news_category.update',
      'NewsCategoryConfig',
      slug,
      { ...dto },
    );
    return category;
  }

  async getNewsSettings() {
    const settings = await this.prisma.newsSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
    const day = new Date(
      new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z',
    );
    const usage = await this.prisma.newsAiQuotaDay.findUnique({
      where: { day },
    });
    return {
      ...settings,
      aiProvider:
        process.env.NEWS_AI_PROVIDER === 'openai' ? 'openai' : 'disabled',
      aiProviderConfigured:
        process.env.NEWS_AI_PROVIDER === 'openai' &&
        Boolean(process.env.OPENAI_API_KEY?.trim()),
      aiRequestsToday: usage?.attempts ?? 0,
    };
  }

  async updateNewsSettings(actorId: string, dto: UpdateNewsSettingsDto) {
    if (
      dto.aiEnabled &&
      (process.env.NEWS_AI_PROVIDER !== 'openai' ||
        !process.env.OPENAI_API_KEY?.trim())
    ) {
      throw new BadRequestException(
        'AI assistance requires an explicitly configured provider and server key.',
      );
    }
    if (dto.automaticPublishingEnabled && !dto.aiEnabled) {
      throw new BadRequestException(
        'Automatic publishing requires enabled AI and a configured provider key.',
      );
    }
    const settings = await this.prisma.newsSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...dto },
      update: dto,
    });
    await this.audit.record(
      actorId,
      'news_settings.update',
      'NewsSettings',
      'default',
      { ...dto },
    );
    return settings;
  }

  async listNewsAudit(skip = 0) {
    const where: Prisma.AdminAuditLogWhereInput = {
      OR: [
        { action: { startsWith: 'news_' } },
        { action: { startsWith: 'story.' } },
      ],
    };
    const [events, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: Math.max(0, skip),
        take: 50,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);
    return { events, total };
  }

  async listNewsAutomationEvents(skip = 0) {
    const [events, total] = await Promise.all([
      this.prisma.newsAutomationEvent.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: Math.max(0, skip),
        take: 50,
      }),
      this.prisma.newsAutomationEvent.count(),
    ]);
    return { events, total };
  }

  async moderateStory(
    actorId: string,
    storyId: string,
    moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED',
    reason = 'Manual editorial action',
  ) {
    return this.prisma.$transaction(async (tx) => {
      const story = await tx.newsStory.findUnique({
        where: { id: storyId },
        include: { source: true },
      });
      if (!story) throw new NotFoundException('Story not found.');
      if (
        moderationStatus === 'APPROVED' &&
        (story.source.status !== 'ACTIVE' ||
          !safePublisherUrl(story.originalUrl) ||
          !story.headline.trim() ||
          !story.highlight.trim())
      ) {
        throw new BadRequestException(
          'Story cannot be published without valid metadata.',
        );
      }
      const updated = await tx.newsStory.update({
        where: { id: storyId },
        data: {
          moderationStatus,
          publishedAt: moderationStatus === 'APPROVED' ? new Date() : null,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: `story.${moderationStatus.toLowerCase()}`,
          entityType: 'NewsStory',
          entityId: storyId,
          metadata: { headline: story.headline, reason: reason.trim() },
        },
      });
      return updated;
    });
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
