import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AbuseCaseStatus,
  AccountStatus,
  ClubPostModerationStatus,
  Prisma,
  ReportStatus,
  TrustSafetyPriority,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import {
  CreateAbuseCaseDto,
  OpenAbuseCaseDto,
  ReviewReportedContentDto,
  UpdateAbuseCaseDto,
} from './dto/trust-safety-admin.dto';

type ReportType = 'PLAYER' | 'MESSAGE' | 'COURT' | 'CLUB_POST';
type QueueState = 'PENDING' | 'ACTIONED' | 'DISMISSED';
type PersonRecord = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  accountStatus?: AccountStatus;
};
type AdminRecord = { id: string; email: string; name: string | null };
type AbuseCaseSummaryRecord = {
  id: string;
  status: AbuseCaseStatus;
  priority: TrustSafetyPriority;
  summary: string;
  subjectUserId: string;
  subjectUser: PersonRecord | null;
  openedBy: AdminRecord | null;
  closedBy: AdminRecord | null;
  closedAt: Date | null;
  closeReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  notes: unknown[];
};

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  accountStatus: true,
} satisfies Prisma.UserSelect;

const PRIORITY_WEIGHT: Record<TrustSafetyPriority, number> = {
  URGENT: 3,
  HIGH: 2,
  NORMAL: 1,
};

@Injectable()
export class TrustSafetyAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listReportedContent(query: {
    type?: string;
    state?: string;
    priority?: string;
    search?: string;
  }) {
    const type = this.reportType(query.type);
    const state = this.queueState(query.state);
    const priority = this.enumValue(TrustSafetyPriority, query.priority);
    const search = query.search?.trim().toLowerCase();

    const types = type
      ? [type]
      : (['PLAYER', 'MESSAGE', 'COURT', 'CLUB_POST'] as ReportType[]);
    const buckets = await Promise.all(
      types.map((item) => this.fetchReportItems(item, state, priority)),
    );
    let items = buckets.flat();
    if (search) {
      items = items.filter((item) =>
        [
          item.reason,
          item.notes,
          item.subject?.email,
          item.subject?.name,
          item.reporter?.email,
          item.reporter?.name,
          item.preview,
          item.locationLabel,
        ].some((value) => value?.toLowerCase().includes(search)),
      );
    }
    items.sort((a, b) => {
      const priorityDelta =
        PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      if (priorityDelta) return priorityDelta;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const counts = {
      pending: items.filter((item) => item.state === 'PENDING').length,
      actioned: items.filter((item) => item.state === 'ACTIONED').length,
      dismissed: items.filter((item) => item.state === 'DISMISSED').length,
      urgent: items.filter(
        (item) => item.priority === TrustSafetyPriority.URGENT,
      ).length,
      high: items.filter((item) => item.priority === TrustSafetyPriority.HIGH)
        .length,
    };
    return { items: items.slice(0, 250), counts };
  }

  async reviewReportedContent(
    actorId: string,
    rawType: string,
    id: string,
    dto: ReviewReportedContentDto,
  ) {
    const type = this.requireReportType(rawType);
    if (dto.action === 'ESCALATE_PRIORITY') {
      if (!dto.priority) throw new BadRequestException('Choose a priority.');
      const item = await this.updateReportPriority(type, id, dto.priority);
      await this.audit.record(
        actorId,
        'trust_safety.report.priority',
        this.entityType(type),
        id,
        {
          priority: dto.priority,
          previousPriority: item.previousPriority,
        },
      );
      return { id, priority: dto.priority };
    }

    if (
      (dto.action === 'ACTION' || dto.action === 'DISMISS') &&
      !dto.reason?.trim()
    ) {
      throw new BadRequestException(
        'A Trust & Safety decision reason is required.',
      );
    }

    const result = await this.transitionReport(type, id, dto);
    await this.audit.record(
      actorId,
      `trust_safety.report.${dto.action.toLowerCase()}`,
      this.entityType(type),
      id,
      {
        previousStatus: result.previousStatus,
        nextStatus: result.nextStatus,
        reason: dto.reason?.trim(),
      },
    );
    return { id, status: result.nextStatus, state: result.state };
  }

  async openCaseFromReport(
    actorId: string,
    rawType: string,
    reportId: string,
    dto: OpenAbuseCaseDto,
  ) {
    const type = this.requireReportType(rawType);
    const subjectUserId = await this.subjectForReport(type, reportId);
    if (!subjectUserId) {
      throw new BadRequestException(
        'This report is not tied to a player account.',
      );
    }
    const result = await this.openOrAttachCase(actorId, subjectUserId, {
      summary: dto.summary,
      priority: dto.priority,
      metadata: { reportType: type, reportId },
      action: 'report.attach',
    });
    await this.audit.record(
      actorId,
      'trust_safety.case.from_report',
      'AbuseCase',
      result.case.id,
      {
        subjectUserId,
        reportType: type,
        reportId,
        attachedToExisting: result.attachedToExisting,
      },
    );
    return result;
  }

  async listAbuseCases(query: {
    status?: string;
    priority?: string;
    search?: string;
  }) {
    const status =
      this.enumValue(AbuseCaseStatus, query.status) ?? AbuseCaseStatus.OPEN;
    const priority = this.enumValue(TrustSafetyPriority, query.priority);
    const search = query.search?.trim();
    const cases = await this.prisma.abuseCase.findMany({
      where: {
        status,
        ...(priority ? { priority } : {}),
        ...(search
          ? {
              OR: [
                { summary: { contains: search, mode: 'insensitive' } },
                {
                  subjectUser: {
                    email: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  subjectUser: {
                    firstName: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  subjectUser: {
                    lastName: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        subjectUser: { select: USER_SELECT },
        openedBy: { select: { id: true, email: true, name: true } },
        closedBy: { select: { id: true, email: true, name: true } },
        notes: {
          include: { actor: { select: { id: true, email: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 150,
    });
    const rows = await Promise.all(cases.map((item) => this.caseSummary(item)));
    return {
      cases: rows,
      counts: {
        open: rows.filter((item) => item.status === AbuseCaseStatus.OPEN)
          .length,
        closed: rows.filter((item) => item.status === AbuseCaseStatus.CLOSED)
          .length,
        urgent: rows.filter(
          (item) => item.priority === TrustSafetyPriority.URGENT,
        ).length,
      },
    };
  }

  async createAbuseCase(actorId: string, dto: CreateAbuseCaseDto) {
    const subject = await this.prisma.user.findUnique({
      where: { id: dto.subjectUserId },
    });
    if (!subject) throw new NotFoundException('User not found.');
    const existing = await this.prisma.abuseCase.findFirst({
      where: { subjectUserId: dto.subjectUserId, status: AbuseCaseStatus.OPEN },
    });
    if (existing) {
      throw new BadRequestException(
        'This user already has an open abuse case.',
      );
    }
    const result = await this.openOrAttachCase(actorId, dto.subjectUserId, {
      summary: dto.summary,
      priority: dto.priority,
      action: 'case.open',
    });
    await this.audit.record(
      actorId,
      'trust_safety.case.open',
      'AbuseCase',
      result.case.id,
      {
        subjectUserId: dto.subjectUserId,
        priority: result.case.priority,
      },
    );
    return result;
  }

  async abuseCaseDetail(caseId: string) {
    const abuseCase = await this.prisma.abuseCase.findUnique({
      where: { id: caseId },
      include: {
        subjectUser: { select: USER_SELECT },
        openedBy: { select: { id: true, email: true, name: true } },
        closedBy: { select: { id: true, email: true, name: true } },
        notes: {
          include: { actor: { select: { id: true, email: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!abuseCase) throw new NotFoundException('Abuse case not found.');
    return {
      case: await this.caseSummary(abuseCase),
      evidence: await this.evidenceForUser(abuseCase.subjectUserId),
    };
  }

  async updateAbuseCase(
    actorId: string,
    caseId: string,
    dto: UpdateAbuseCaseDto,
  ) {
    const abuseCase = await this.prisma.abuseCase.findUnique({
      where: { id: caseId },
      include: { subjectUser: true },
    });
    if (!abuseCase) throw new NotFoundException('Abuse case not found.');
    if (
      dto.action !== 'ADD_NOTE' &&
      abuseCase.status === AbuseCaseStatus.CLOSED
    ) {
      throw new BadRequestException('Closed cases can only receive notes.');
    }
    if (
      (dto.action === 'ADD_NOTE' ||
        dto.action === 'SUSPEND' ||
        dto.action === 'CLOSE') &&
      !dto.reason?.trim()
    ) {
      throw new BadRequestException('A case reason is required.');
    }
    if (dto.action === 'ESCALATE_PRIORITY' && !dto.priority) {
      throw new BadRequestException('Choose a priority.');
    }

    if (dto.action === 'ADD_NOTE') {
      await this.addCaseNote(actorId, caseId, 'case.note', dto.reason!.trim());
    } else if (dto.action === 'ESCALATE_PRIORITY') {
      await this.prisma.$transaction([
        this.prisma.abuseCase.update({
          where: { id: caseId },
          data: { priority: dto.priority! },
        }),
        this.prisma.abuseCaseNote.create({
          data: {
            caseId,
            actorId,
            action: 'case.priority',
            body: dto.reason?.trim() ?? null,
            metadata: {
              previousPriority: abuseCase.priority,
              nextPriority: dto.priority!,
            },
          },
        }),
      ]);
    } else if (dto.action === 'SUSPEND') {
      if (abuseCase.subjectUser.accountStatus === AccountStatus.DELETED) {
        throw new BadRequestException('Deleted accounts cannot be suspended.');
      }
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: abuseCase.subjectUserId },
          data: { accountStatus: AccountStatus.SUSPENDED },
        }),
        this.prisma.refreshToken.updateMany({
          where: { userId: abuseCase.subjectUserId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        this.prisma.abuseCaseNote.create({
          data: {
            caseId,
            actorId,
            action: 'case.suspend',
            body: dto.reason!.trim(),
          },
        }),
      ]);
      await this.audit.record(
        actorId,
        'user.suspend',
        'User',
        abuseCase.subjectUserId,
        {
          previousStatus: abuseCase.subjectUser.accountStatus,
          source: 'abuse_case',
          caseId,
        },
      );
    } else if (dto.action === 'CLOSE') {
      await this.prisma.$transaction([
        this.prisma.abuseCase.update({
          where: { id: caseId },
          data: {
            status: AbuseCaseStatus.CLOSED,
            closedById: actorId,
            closedAt: new Date(),
            closeReason: dto.reason!.trim(),
          },
        }),
        this.prisma.abuseCaseNote.create({
          data: {
            caseId,
            actorId,
            action: 'case.close',
            body: dto.reason!.trim(),
          },
        }),
      ]);
    }

    await this.audit.record(
      actorId,
      `trust_safety.case.${dto.action.toLowerCase()}`,
      'AbuseCase',
      caseId,
      {
        subjectUserId: abuseCase.subjectUserId,
        priority: dto.priority,
        reason: dto.reason?.trim(),
      },
    );
    return this.abuseCaseDetail(caseId);
  }

  private async fetchReportItems(
    type: ReportType,
    state?: QueueState,
    priority?: TrustSafetyPriority,
  ) {
    if (type === 'PLAYER') {
      const reports = await this.prisma.playerReport.findMany({
        where: {
          ...this.reportStatusWhere(state),
          ...(priority ? { priority } : {}),
        },
        include: {
          reporter: { select: USER_SELECT },
          reported: { select: USER_SELECT },
        },
        orderBy: { createdAt: 'desc' },
        take: 250,
      });
      return reports.map((report) => ({
        id: report.id,
        type,
        reason: report.reason,
        notes: report.notes,
        sourceStatus: report.status,
        state: this.reportState(report.status),
        priority: report.priority,
        createdAt: report.createdAt,
        reporter: this.person(report.reporter),
        subject: this.person(report.reported),
        preview: 'Player profile report',
        locationLabel: null,
        canOpenCase: true,
      }));
    }
    if (type === 'MESSAGE') {
      const reports = await this.prisma.messageReport.findMany({
        where: {
          ...this.reportStatusWhere(state),
          ...(priority ? { priority } : {}),
        },
        include: {
          reporter: { select: USER_SELECT },
          message: {
            select: {
              id: true,
              body: true,
              sender: { select: USER_SELECT },
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 250,
      });
      return reports.map((report) => ({
        id: report.id,
        type,
        reason: report.reason,
        notes: report.notes,
        sourceStatus: report.status,
        state: this.reportState(report.status),
        priority: report.priority,
        createdAt: report.createdAt,
        reporter: this.person(report.reporter),
        subject: this.person(report.message.sender),
        preview: report.message.body,
        locationLabel: null,
        canOpenCase: Boolean(report.message.sender),
      }));
    }
    if (type === 'COURT') {
      const reports = await this.prisma.courtReport.findMany({
        where: {
          ...this.reportStatusWhere(state),
          ...(priority ? { priority } : {}),
        },
        include: {
          reporter: { select: USER_SELECT },
          court: { select: { id: true, name: true, address: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 250,
      });
      return reports.map((report) => ({
        id: report.id,
        type,
        reason: report.reason,
        notes: report.notes,
        sourceStatus: report.status,
        state: this.reportState(report.status),
        priority: report.priority,
        createdAt: report.createdAt,
        reporter: this.person(report.reporter),
        subject: null,
        preview: report.court.name,
        locationLabel: report.court.address,
        canOpenCase: false,
      }));
    }
    const reports = await this.prisma.clubPostModerationReport.findMany({
      where: {
        ...this.clubPostStatusWhere(state),
        ...(priority ? { priority } : {}),
      },
      include: {
        reporter: { select: USER_SELECT },
        club: { select: { id: true, name: true } },
        post: {
          select: {
            id: true,
            body: true,
            deletedAt: true,
            author: { select: USER_SELECT },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });
    return reports.map((report) => ({
      id: report.id,
      type,
      reason: report.reason,
      notes: null,
      sourceStatus: report.status,
      state: this.clubPostState(report.status),
      priority: report.priority,
      createdAt: report.createdAt,
      reporter: this.person(report.reporter),
      subject: this.person(report.post.author),
      preview: report.post.body,
      locationLabel: report.club.name,
      canOpenCase: Boolean(report.post.author),
    }));
  }

  private async transitionReport(
    type: ReportType,
    id: string,
    dto: ReviewReportedContentDto,
  ): Promise<{
    previousStatus: string;
    nextStatus: string;
    state: QueueState;
  }> {
    if (type === 'CLUB_POST') {
      const report = await this.prisma.clubPostModerationReport.findUnique({
        where: { id },
        include: { post: true },
      });
      if (!report) throw new NotFoundException('Report not found.');
      if (dto.action === 'START_REVIEW') {
        return {
          previousStatus: report.status,
          nextStatus: report.status,
          state: this.clubPostState(report.status),
        };
      }
      const nextStatus =
        dto.action === 'ACTION'
          ? ClubPostModerationStatus.REMOVED
          : ClubPostModerationStatus.APPROVED;
      await this.prisma.$transaction(async (tx) => {
        if (dto.action === 'ACTION' && !report.post.deletedAt) {
          await tx.clubPost.update({
            where: { id: report.postId },
            data: { deletedAt: new Date() },
          });
        }
        await tx.clubPostModerationReport.update({
          where: { id },
          data: { status: nextStatus, resolvedAt: new Date() },
        });
      });
      return {
        previousStatus: report.status,
        nextStatus,
        state: this.clubPostState(nextStatus),
      };
    }

    const nextStatus =
      dto.action === 'START_REVIEW'
        ? ReportStatus.REVIEWING
        : dto.action === 'ACTION'
          ? ReportStatus.RESOLVED
          : ReportStatus.DISMISSED;

    if (type === 'PLAYER') {
      const report = await this.prisma.playerReport.findUnique({
        where: { id },
      });
      if (!report) throw new NotFoundException('Report not found.');
      await this.prisma.playerReport.update({
        where: { id },
        data: { status: nextStatus },
      });
      return {
        previousStatus: report.status,
        nextStatus,
        state: this.reportState(nextStatus),
      };
    }

    if (type === 'MESSAGE') {
      const report = await this.prisma.messageReport.findUnique({
        where: { id },
      });
      if (!report) throw new NotFoundException('Report not found.');
      await this.prisma.messageReport.update({
        where: { id },
        data: { status: nextStatus },
      });
      return {
        previousStatus: report.status,
        nextStatus,
        state: this.reportState(nextStatus),
      };
    }

    const report = await this.prisma.courtReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found.');
    await this.prisma.courtReport.update({
      where: { id },
      data: { status: nextStatus },
    });
    return {
      previousStatus: report.status,
      nextStatus,
      state: this.reportState(nextStatus),
    };
  }

  private async updateReportPriority(
    type: ReportType,
    id: string,
    priority: TrustSafetyPriority,
  ): Promise<{ previousPriority: TrustSafetyPriority }> {
    if (type === 'CLUB_POST') {
      const report = await this.prisma.clubPostModerationReport.findUnique({
        where: { id },
      });
      if (!report) throw new NotFoundException('Report not found.');
      await this.prisma.clubPostModerationReport.update({
        where: { id },
        data: { priority },
      });
      return { previousPriority: report.priority };
    }
    if (type === 'PLAYER') {
      const report = await this.prisma.playerReport.findUnique({
        where: { id },
      });
      if (!report) throw new NotFoundException('Report not found.');
      await this.prisma.playerReport.update({
        where: { id },
        data: { priority },
      });
      return { previousPriority: report.priority };
    }

    if (type === 'MESSAGE') {
      const report = await this.prisma.messageReport.findUnique({
        where: { id },
      });
      if (!report) throw new NotFoundException('Report not found.');
      await this.prisma.messageReport.update({
        where: { id },
        data: { priority },
      });
      return { previousPriority: report.priority };
    }

    const report = await this.prisma.courtReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found.');
    await this.prisma.courtReport.update({
      where: { id },
      data: { priority },
    });
    return { previousPriority: report.priority };
  }

  private async subjectForReport(type: ReportType, id: string) {
    if (type === 'PLAYER') {
      const report = await this.prisma.playerReport.findUnique({
        where: { id },
        select: { reportedUserId: true },
      });
      if (!report) throw new NotFoundException('Report not found.');
      return report.reportedUserId;
    }
    if (type === 'MESSAGE') {
      const report = await this.prisma.messageReport.findUnique({
        where: { id },
        select: { message: { select: { senderId: true } } },
      });
      if (!report) throw new NotFoundException('Report not found.');
      return report.message.senderId;
    }
    if (type === 'CLUB_POST') {
      const report = await this.prisma.clubPostModerationReport.findUnique({
        where: { id },
        select: { post: { select: { authorId: true } } },
      });
      if (!report) throw new NotFoundException('Report not found.');
      return report.post.authorId;
    }
    const report = await this.prisma.courtReport.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!report) throw new NotFoundException('Report not found.');
    return null;
  }

  private async openOrAttachCase(
    actorId: string,
    subjectUserId: string,
    input: {
      summary: string;
      priority?: TrustSafetyPriority;
      action: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const openCase = await this.prisma.abuseCase.findFirst({
      where: { subjectUserId, status: AbuseCaseStatus.OPEN },
    });
    if (openCase) {
      await this.prisma.abuseCaseNote.create({
        data: {
          caseId: openCase.id,
          actorId,
          action: input.action,
          body: input.summary.trim(),
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      });
      return { attachedToExisting: true, case: openCase };
    }
    const abuseCase = await this.prisma.abuseCase.create({
      data: {
        subjectUserId,
        summary: input.summary.trim(),
        priority: input.priority ?? TrustSafetyPriority.HIGH,
        openedById: actorId,
        notes: {
          create: {
            actorId,
            action: input.action,
            body: input.summary.trim(),
            metadata: input.metadata as Prisma.InputJsonValue | undefined,
          },
        },
      },
    });
    return { attachedToExisting: false, case: abuseCase };
  }

  private async addCaseNote(
    actorId: string,
    caseId: string,
    action: string,
    body: string,
  ) {
    await this.prisma.abuseCaseNote.create({
      data: { caseId, actorId, action, body },
    });
  }

  private async caseSummary(item: AbuseCaseSummaryRecord) {
    return {
      id: item.id,
      status: item.status,
      priority: item.priority,
      summary: item.summary,
      subjectUser: this.person(item.subjectUser),
      openedBy: item.openedBy,
      closedBy: item.closedBy,
      closedAt: item.closedAt,
      closeReason: item.closeReason,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      notes: item.notes,
      evidenceCounts: await this.evidenceCounts(item.subjectUserId),
    };
  }

  private async evidenceCounts(userId: string) {
    const [
      playerReports,
      messageReports,
      clubPostReports,
      blocksReceived,
      suspensions,
    ] = await this.prisma.$transaction([
      this.prisma.playerReport.count({ where: { reportedUserId: userId } }),
      this.prisma.messageReport.count({
        where: { message: { senderId: userId } },
      }),
      this.prisma.clubPostModerationReport.count({
        where: { post: { authorId: userId } },
      }),
      this.prisma.block.count({ where: { blockedId: userId } }),
      this.prisma.adminAuditLog.count({
        where: {
          entityType: 'User',
          entityId: userId,
          action: { in: ['user.suspend', 'user.restore'] },
        },
      }),
    ]);
    return {
      playerReports,
      messageReports,
      clubPostReports,
      blocksReceived,
      suspensions,
    };
  }

  private async evidenceForUser(userId: string) {
    const [
      playerReports,
      messageReports,
      clubPostReports,
      blocks,
      statusActions,
    ] = await this.prisma.$transaction([
      this.prisma.playerReport.findMany({
        where: { reportedUserId: userId },
        include: { reporter: { select: USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      this.prisma.messageReport.findMany({
        where: { message: { senderId: userId } },
        include: {
          reporter: { select: USER_SELECT },
          message: { select: { id: true, body: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      this.prisma.clubPostModerationReport.findMany({
        where: { post: { authorId: userId } },
        include: {
          reporter: { select: USER_SELECT },
          club: { select: { id: true, name: true } },
          post: { select: { id: true, body: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      this.prisma.block.findMany({
        where: { blockedId: userId },
        include: { blocker: { select: USER_SELECT } },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      this.prisma.adminAuditLog.findMany({
        where: {
          entityType: 'User',
          entityId: userId,
          action: { in: ['user.suspend', 'user.restore'] },
        },
        include: { actor: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
    ]);
    return {
      playerReports: playerReports.map((item) => ({
        id: item.id,
        reason: item.reason,
        status: item.status,
        priority: item.priority,
        notes: item.notes,
        reporter: this.person(item.reporter),
        createdAt: item.createdAt,
      })),
      messageReports: messageReports.map((item) => ({
        id: item.id,
        reason: item.reason,
        status: item.status,
        priority: item.priority,
        notes: item.notes,
        preview: item.message.body,
        reporter: this.person(item.reporter),
        createdAt: item.createdAt,
      })),
      clubPostReports: clubPostReports.map((item) => ({
        id: item.id,
        reason: item.reason,
        status: item.status,
        priority: item.priority,
        preview: item.post.body,
        club: item.club,
        reporter: this.person(item.reporter),
        createdAt: item.createdAt,
      })),
      blocks: blocks.map((item) => ({
        id: item.id,
        blocker: this.person(item.blocker),
        createdAt: item.createdAt,
      })),
      statusActions,
    };
  }

  private reportStatusWhere(state?: QueueState): {
    status?: ReportStatus | { in: ReportStatus[] };
  } {
    if (state === 'PENDING')
      return { status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] } };
    if (state === 'ACTIONED') return { status: ReportStatus.RESOLVED };
    if (state === 'DISMISSED') return { status: ReportStatus.DISMISSED };
    return {};
  }

  private clubPostStatusWhere(
    state?: QueueState,
  ): Prisma.ClubPostModerationReportWhereInput {
    if (state === 'PENDING')
      return { status: ClubPostModerationStatus.ESCALATED };
    if (state === 'ACTIONED')
      return { status: ClubPostModerationStatus.REMOVED };
    if (state === 'DISMISSED')
      return { status: ClubPostModerationStatus.APPROVED };
    return {
      status: {
        in: [
          ClubPostModerationStatus.ESCALATED,
          ClubPostModerationStatus.APPROVED,
          ClubPostModerationStatus.REMOVED,
        ],
      },
    };
  }

  private reportState(status: ReportStatus): QueueState {
    if (status === ReportStatus.RESOLVED) return 'ACTIONED';
    if (status === ReportStatus.DISMISSED) return 'DISMISSED';
    return 'PENDING';
  }

  private clubPostState(status: ClubPostModerationStatus): QueueState {
    if (status === ClubPostModerationStatus.REMOVED) return 'ACTIONED';
    if (status === ClubPostModerationStatus.APPROVED) return 'DISMISSED';
    return 'PENDING';
  }

  private person(user: PersonRecord | null) {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email ?? 'No email',
      firstName: user.firstName,
      lastName: user.lastName,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        user.email ||
        'Deleted account',
      accountStatus: user.accountStatus,
    };
  }

  private reportType(value?: string) {
    if (!value) return undefined;
    return this.requireReportType(value);
  }

  private requireReportType(value: string): ReportType {
    const normalized = value.replace('-', '_').toUpperCase();
    if (['PLAYER', 'MESSAGE', 'COURT', 'CLUB_POST'].includes(normalized)) {
      return normalized as ReportType;
    }
    throw new BadRequestException('Unknown report type.');
  }

  private queueState(value?: string) {
    if (!value) return undefined;
    const normalized = value.toUpperCase();
    if (['PENDING', 'ACTIONED', 'DISMISSED'].includes(normalized))
      return normalized as QueueState;
    return undefined;
  }

  private entityType(type: ReportType) {
    return type === 'CLUB_POST'
      ? 'ClubPostModerationReport'
      : `${type[0]}${type.slice(1).toLowerCase()}Report`;
  }

  private enumValue<T extends Record<string, string>>(
    values: T,
    value?: string,
  ) {
    if (!value) return undefined;
    const normalized = value.toUpperCase();
    return Object.values(values).includes(normalized)
      ? (normalized as T[keyof T])
      : undefined;
  }
}
