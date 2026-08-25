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
      reporter: { select: { id: true, email: true, firstName: true, lastName: true } },
      reported: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  },
  message: {
    include: {
      reporter: { select: { id: true, email: true, firstName: true, lastName: true } },
      message: {
        select: { id: true, body: true, senderId: true, conversationId: true },
      },
    },
  },
  court: {
    include: {
      reporter: { select: { id: true, email: true, firstName: true, lastName: true } },
      court: { select: { id: true, name: true, address: true } },
    },
  },
};

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

    await this.prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = await this.jwt.signAsync({
      sub: admin.id,
      scope: 'platform',
    });

    return { accessToken, adminId: admin.id, name: admin.name };
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
                { email: { contains: query.query, mode: 'insensitive' as const } },
                { firstName: { contains: query.query, mode: 'insensitive' as const } },
                { lastName: { contains: query.query, mode: 'insensitive' as const } },
              ],
            }
          : {},
        query.status
          ? { accountStatus: query.status as AccountStatus }
          : {},
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

  async setUserStatus(actorId: string, userId: string, status: 'ACTIVE' | 'SUSPENDED') {
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
      | 'OPEN'
      | 'REVIEWING'
      | 'RESOLVED'
      | 'DISMISSED'
      | undefined;
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
    data: { name: string; feedUrl?: string | null; status: 'ACTIVE' | 'PAUSED' | 'BLOCKED' },
  ) {
    const source = await this.prisma.newsSource.create({ data });
    await this.audit.record(actorId, 'news_source.create', 'NewsSource', source.id, {
      name: source.name,
    });
    return source;
  }

  async updateNewsSource(
    actorId: string,
    sourceId: string,
    data: { name: string; feedUrl?: string | null; status: 'ACTIVE' | 'PAUSED' | 'BLOCKED' },
  ) {
    const existing = await this.prisma.newsSource.findUnique({
      where: { id: sourceId },
    });
    if (!existing) throw new NotFoundException('News source not found.');

    const source = await this.prisma.newsSource.update({
      where: { id: sourceId },
      data,
    });
    await this.audit.record(actorId, 'news_source.update', 'NewsSource', sourceId, data);
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
    const story = await this.prisma.newsStory.findUnique({ where: { id: storyId } });
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
                  user: { select: { id: true, firstName: true, lastName: true, email: true } },
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
    await this.audit.record(actorId, 'dispute.resolve', 'Match', matchId, { ruling });
    return result;
  }

  // ----------------------------------------------------------- audit trail

  listAuditLogs(query: { actorId?: string; action?: string; take?: number; skip?: number }) {
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
