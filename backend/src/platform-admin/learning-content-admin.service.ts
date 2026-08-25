import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AssessmentBranch,
  AssessmentPillar,
  LearningContentStatus,
  LearningContentType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import {
  UpsertLearningContentDto,
  UpsertLearningPathDto,
} from './dto/learning-content-admin.dto';

const CONTENT_INCLUDE = {
  steps: {
    orderBy: { order: 'asc' as const },
    include: {
      content: {
        select: {
          id: true,
          type: true,
          sport: true,
          targetSkill: true,
          branch: true,
          title: true,
          summary: true,
          durationMinutes: true,
          status: true,
        },
      },
    },
  },
  stepOf: {
    include: {
      plan: {
        select: { id: true, title: true, status: true },
      },
    },
    orderBy: { order: 'asc' as const },
  },
  _count: {
    select: {
      completions: true,
      practiceSessions: true,
      steps: true,
      stepOf: true,
    },
  },
} satisfies Prisma.LearningContentInclude;

@Injectable()
export class LearningContentAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: {
    search?: string;
    type?: string;
    status?: string;
    targetSkill?: string;
    branch?: string;
    take?: number;
    skip?: number;
  }) {
    const where = this.where(query);
    const [content, total] = await this.prisma.$transaction([
      this.prisma.learningContent.findMany({
        where,
        include: CONTENT_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        take: Math.min(query.take ?? 100, 250),
        skip: query.skip ?? 0,
      }),
      this.prisma.learningContent.count({ where }),
    ]);
    return { total, content: content.map((item) => this.toDto(item)) };
  }

  async stepOptions() {
    const content = await this.prisma.learningContent.findMany({
      where: {
        type: { in: [LearningContentType.LESSON, LearningContentType.DRILL] },
      },
      orderBy: [{ targetSkill: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        type: true,
        sport: true,
        targetSkill: true,
        branch: true,
        title: true,
        summary: true,
        durationMinutes: true,
        status: true,
      },
      take: 500,
    });
    return { content };
  }

  async detail(id: string) {
    const content = await this.prisma.learningContent.findUnique({
      where: { id },
      include: CONTENT_INCLUDE,
    });
    if (!content) throw new NotFoundException('Learning content not found.');
    return { content: this.toDto(content) };
  }

  async createContent(
    actorId: string,
    type: LearningContentType.LESSON | LearningContentType.DRILL,
    dto: UpsertLearningContentDto,
  ) {
    const content = await this.prisma.learningContent.create({
      data: {
        ...this.contentData(dto),
        type,
        pathGoal: null,
      },
      include: CONTENT_INCLUDE,
    });
    await this.audit.record(actorId, `learning_content.${type.toLowerCase()}.create`, 'LearningContent', content.id, {
      title: content.title,
      status: content.status,
    });
    return { content: this.toDto(content) };
  }

  async updateContent(actorId: string, id: string, dto: UpsertLearningContentDto) {
    const existing = await this.prisma.learningContent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Learning content not found.');
    if (existing.type === LearningContentType.TRAINING_PLAN) {
      throw new BadRequestException('Use the path builder to edit learning paths.');
    }

    const content = await this.prisma.learningContent.update({
      where: { id },
      data: {
        ...this.contentData(dto),
        pathGoal: null,
      },
      include: CONTENT_INCLUDE,
    });
    await this.audit.record(actorId, 'learning_content.update', 'LearningContent', id, {
      previousStatus: existing.status,
      nextStatus: content.status,
      title: content.title,
    });
    return { content: this.toDto(content) };
  }

  async createPath(actorId: string, dto: UpsertLearningPathDto) {
    await this.validatePathSteps(dto.stepIds, dto.status);
    const content = await this.prisma.$transaction(async (tx) => {
      const plan = await tx.learningContent.create({
        data: {
          ...this.contentData(dto),
          type: LearningContentType.TRAINING_PLAN,
          pathGoal: dto.pathGoal?.trim() || null,
        },
      });
      await this.replaceSteps(tx, plan.id, dto.stepIds);
      return tx.learningContent.findUniqueOrThrow({
        where: { id: plan.id },
        include: CONTENT_INCLUDE,
      });
    });
    await this.audit.record(actorId, 'learning_path.create', 'LearningContent', content.id, {
      title: content.title,
      status: content.status,
      stepCount: dto.stepIds.length,
    });
    return { content: this.toDto(content) };
  }

  async updatePath(actorId: string, id: string, dto: UpsertLearningPathDto) {
    const existing = await this.prisma.learningContent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Learning path not found.');
    if (existing.type !== LearningContentType.TRAINING_PLAN) {
      throw new BadRequestException('Only learning paths can be edited here.');
    }
    await this.validatePathSteps(dto.stepIds, dto.status);

    const content = await this.prisma.$transaction(async (tx) => {
      await tx.learningContent.update({
        where: { id },
        data: {
          ...this.contentData(dto),
          pathGoal: dto.pathGoal?.trim() || null,
        },
      });
      await this.replaceSteps(tx, id, dto.stepIds);
      return tx.learningContent.findUniqueOrThrow({
        where: { id },
        include: CONTENT_INCLUDE,
      });
    });
    await this.audit.record(actorId, 'learning_path.update', 'LearningContent', id, {
      previousStatus: existing.status,
      nextStatus: content.status,
      title: content.title,
      stepCount: dto.stepIds.length,
    });
    return { content: this.toDto(content) };
  }

  private async validatePathSteps(stepIds: string[], status: LearningContentStatus) {
    if (stepIds.length === 0) {
      throw new BadRequestException('Add at least one lesson or drill to the path.');
    }
    const steps = await this.prisma.learningContent.findMany({
      where: { id: { in: stepIds } },
      select: { id: true, type: true, status: true },
    });
    if (steps.length !== stepIds.length) {
      throw new BadRequestException('Every path step must reference existing content.');
    }
    if (steps.some((step) => step.type === LearningContentType.TRAINING_PLAN)) {
      throw new BadRequestException('Learning paths cannot contain other paths.');
    }
    if (
      status === LearningContentStatus.PUBLISHED &&
      steps.some((step) => step.status !== LearningContentStatus.PUBLISHED)
    ) {
      throw new BadRequestException('Publish all lesson and drill steps before publishing this path.');
    }
  }

  private async replaceSteps(
    tx: Prisma.TransactionClient,
    planId: string,
    stepIds: string[],
  ) {
    await tx.trainingPlanStep.deleteMany({ where: { planId } });
    for (const [index, contentId] of stepIds.entries()) {
      await tx.trainingPlanStep.create({
        data: { planId, contentId, order: index + 1 },
      });
    }
  }

  private contentData(dto: UpsertLearningContentDto) {
    return {
      sport: dto.sport,
      targetSkill: dto.targetSkill,
      branch: dto.branch ?? null,
      title: dto.title.trim(),
      summary: dto.summary?.trim() || null,
      bodyText: dto.bodyText?.trim() || null,
      videoUrl: dto.videoUrl?.trim() || null,
      durationMinutes: dto.durationMinutes ?? null,
      status: dto.status,
    };
  }

  private where(query: {
    search?: string;
    type?: string;
    status?: string;
    targetSkill?: string;
    branch?: string;
  }): Prisma.LearningContentWhereInput {
    const type = this.enumValue(LearningContentType, query.type);
    const status = this.enumValue(LearningContentStatus, query.status);
    const targetSkill = this.enumValue(AssessmentPillar, query.targetSkill);
    const branch = this.enumValue(AssessmentBranch, query.branch);
    return {
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(targetSkill ? { targetSkill } : {}),
      ...(branch ? { branch } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { title: { contains: query.search.trim(), mode: 'insensitive' } },
              { summary: { contains: query.search.trim(), mode: 'insensitive' } },
              { bodyText: { contains: query.search.trim(), mode: 'insensitive' } },
              { pathGoal: { contains: query.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private enumValue<T extends Record<string, string>>(values: T, value?: string) {
    if (!value) return undefined;
    const normalized = value.toUpperCase();
    return Object.values(values).includes(normalized)
      ? (normalized as T[keyof T])
      : undefined;
  }

  private toDto(content: Prisma.LearningContentGetPayload<{ include: typeof CONTENT_INCLUDE }>) {
    return {
      id: content.id,
      type: content.type,
      sport: content.sport,
      targetSkill: content.targetSkill,
      branch: content.branch,
      title: content.title,
      summary: content.summary,
      bodyText: content.bodyText,
      videoUrl: content.videoUrl,
      durationMinutes: content.durationMinutes,
      pathGoal: content.pathGoal,
      status: content.status,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      steps: content.steps.map((step) => ({
        id: step.id,
        order: step.order,
        content: step.content,
      })),
      usedInPaths: content.stepOf.map((step) => ({
        id: step.plan.id,
        title: step.plan.title,
        status: step.plan.status,
        order: step.order,
      })),
      counts: {
        completions: content._count.completions,
        practiceSessions: content._count.practiceSessions,
        steps: content._count.steps,
        usedInPaths: content._count.stepOf,
      },
    };
  }
}
