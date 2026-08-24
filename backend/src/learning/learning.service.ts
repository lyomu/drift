import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentSessionStatus,
  LearningContentType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  SKILL_DIMENSIONS,
  SkillScore,
  computeSkillScores,
  deriveGoalStatus,
  recommendContent,
  weakestSkill,
} from './skill-score';
import {
  contentInclude,
  toContentDetail,
  toContentSummary,
} from './learning.mapper';
import { SearchContentDto } from './dto/search-content.dto';
import { LogPracticeSessionDto } from './dto/log-practice-session.dto';
import { CreateGoalDto, UpdateGoalDto } from './dto/goal.dto';

const DEFAULT_TAKE = 20;
const RECOMMENDATION_LIMIT = 3;

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- helpers

  private async requireTennisProfile(userId: string) {
    const profile = await this.prisma.tennisProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Tennis profile not found.');
    }
    return profile;
  }

  private async latestCompletedAssessment(tennisProfileId: string) {
    return this.prisma.assessmentSession.findFirst({
      where: { tennisProfileId, status: AssessmentSessionStatus.COMPLETED },
      orderBy: { completedAt: 'desc' },
    });
  }

  private async currentScores(tennisProfileId: string): Promise<SkillScore[]> {
    const [latestSession, practiceSessions] = await Promise.all([
      this.latestCompletedAssessment(tennisProfileId),
      this.prisma.practiceSession.findMany({
        where: { tennisProfileId },
        select: { skillFocus: true, perceivedPerformance: true },
      }),
    ]);

    const breakdown = latestSession?.resultSkillBreakdown as Record<
      string,
      number
    > | null;

    return computeSkillScores(breakdown, practiceSessions);
  }

  private async recommendationsFor(
    tennisProfileId: string,
    skill: string | null,
  ) {
    if (!skill) return [];
    const [latestSession, published] = await Promise.all([
      this.latestCompletedAssessment(tennisProfileId),
      this.prisma.learningContent.findMany({
        where: { status: 'PUBLISHED', targetSkill: skill as never },
      }),
    ]);
    const recommended = recommendContent(
      published.map((c) => ({
        id: c.id,
        type: c.type,
        targetSkill: c.targetSkill,
        branch: c.branch,
      })),
      skill as never,
      latestSession?.branch ?? null,
      RECOMMENDATION_LIMIT,
    );
    const byId = new Map(published.map((c) => [c.id, c]));
    return recommended.map((r) => toContentSummary(byId.get(r.id)!));
  }

  // ---------------------------------------------------------------- reads

  async getSkillProfile(userId: string) {
    const profile = await this.requireTennisProfile(userId);
    const scores = await this.currentScores(profile.id);
    const weakest = weakestSkill(scores);

    return {
      skills: scores.map((s) => ({
        skill: s.skill,
        score: s.score,
        maturity: s.maturity,
      })),
      weakestSkill: weakest,
      recommendations: await this.recommendationsFor(profile.id, weakest),
    };
  }

  async getSkillDetail(userId: string, skill: string) {
    if (!SKILL_DIMENSIONS.includes(skill as never)) {
      throw new BadRequestException('Not a recognised skill dimension.');
    }
    const profile = await this.requireTennisProfile(userId);
    const [scores, latestSession, sessions] = await Promise.all([
      this.currentScores(profile.id),
      this.latestCompletedAssessment(profile.id),
      this.prisma.practiceSession.findMany({
        where: { tennisProfileId: profile.id, skillFocus: skill as never },
        orderBy: { occurredAt: 'desc' },
        take: 20,
        include: { drill: true },
      }),
    ]);
    const current = scores.find((s) => s.skill === skill)!;
    const breakdown = latestSession?.resultSkillBreakdown as Record<
      string,
      number
    > | null;

    return {
      skill,
      score: current.score,
      maturity: current.maturity,
      assessmentBaseline: breakdown?.[skill] ?? null,
      practiceSessions: sessions.map((s) => ({
        id: s.id,
        occurredAt: s.occurredAt,
        perceivedPerformance: s.perceivedPerformance,
        notes: s.notes,
        drill: s.drill ? toContentSummary(s.drill) : null,
      })),
      recommendations: await this.recommendationsFor(profile.id, skill),
    };
  }

  async getProgressReport(userId: string) {
    const profile = await this.requireTennisProfile(userId);
    const [scores, assessmentHistory] = await Promise.all([
      this.currentScores(profile.id),
      this.prisma.assessmentSession.findMany({
        where: { tennisProfileId: profile.id, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    return {
      skills: scores.map((s) => ({
        skill: s.skill,
        score: s.score,
        maturity: s.maturity,
      })),
      assessmentHistory: assessmentHistory.map((a) => ({
        id: a.id,
        completedAt: a.completedAt,
        resultSystemSuggestedLevel: a.resultSystemSuggestedLevel,
      })),
    };
  }

  // ---------------------------------------------------------------- content

  async browseContent(dto: SearchContentDto) {
    const where: Prisma.LearningContentWhereInput = { status: 'PUBLISHED' };
    if (dto.type) where.type = dto.type;
    if (dto.targetSkill) where.targetSkill = dto.targetSkill;
    if (dto.branch) where.branch = dto.branch;

    const [total, content] = await Promise.all([
      this.prisma.learningContent.count({ where }),
      this.prisma.learningContent.findMany({
        where,
        take: dto.take ?? DEFAULT_TAKE,
        skip: dto.skip ?? 0,
        orderBy: { title: 'asc' },
      }),
    ]);

    return { total, content: content.map(toContentSummary) };
  }

  async getContent(id: string) {
    const content = await this.prisma.learningContent.findFirst({
      where: { id, status: 'PUBLISHED' },
      include: contentInclude,
    });
    if (!content) {
      throw new NotFoundException('Content not found.');
    }
    return toContentDetail(content);
  }

  async markContentComplete(userId: string, contentId: string) {
    const profile = await this.requireTennisProfile(userId);
    const content = await this.prisma.learningContent.findFirst({
      where: { id: contentId, status: 'PUBLISHED' },
    });
    if (!content) {
      throw new NotFoundException('Content not found.');
    }

    await this.prisma.learningContentCompletion.upsert({
      where: {
        tennisProfileId_contentId: {
          tennisProfileId: profile.id,
          contentId,
        },
      },
      update: {},
      create: { tennisProfileId: profile.id, contentId },
    });

    return { completed: true };
  }

  // --------------------------------------------------------------- practice

  async logPracticeSession(userId: string, dto: LogPracticeSessionDto) {
    const profile = await this.requireTennisProfile(userId);

    if (dto.drillId) {
      const drill = await this.prisma.learningContent.findFirst({
        where: {
          id: dto.drillId,
          status: 'PUBLISHED',
          type: LearningContentType.DRILL,
        },
      });
      if (!drill) {
        throw new NotFoundException('Drill not found.');
      }
    }

    const session = await this.prisma.practiceSession.create({
      data: {
        tennisProfileId: profile.id,
        occurredAt: dto.occurredAt,
        durationMinutes: dto.durationMinutes,
        skillFocus: dto.skillFocus,
        drillId: dto.drillId,
        notes: dto.notes,
        perceivedPerformance: dto.perceivedPerformance,
      },
      include: { drill: true },
    });

    return this.toPracticeSessionDto(session);
  }

  async listPracticeSessions(userId: string) {
    const profile = await this.requireTennisProfile(userId);
    const sessions = await this.prisma.practiceSession.findMany({
      where: { tennisProfileId: profile.id },
      orderBy: { occurredAt: 'desc' },
      include: { drill: true },
    });
    return { sessions: sessions.map((s) => this.toPracticeSessionDto(s)) };
  }

  private toPracticeSessionDto(session: {
    id: string;
    occurredAt: Date;
    durationMinutes: number;
    skillFocus: string;
    notes: string | null;
    perceivedPerformance: number;
    drill: Parameters<typeof toContentSummary>[0] | null;
  }) {
    return {
      id: session.id,
      occurredAt: session.occurredAt,
      durationMinutes: session.durationMinutes,
      skillFocus: session.skillFocus,
      notes: session.notes,
      perceivedPerformance: session.perceivedPerformance,
      drill: session.drill ? toContentSummary(session.drill) : null,
    };
  }

  // ------------------------------------------------------------------ goals

  async createGoal(userId: string, dto: CreateGoalDto) {
    const profile = await this.requireTennisProfile(userId);
    const scores = await this.currentScores(profile.id);
    const baseline = scores.find((s) => s.skill === dto.skill)?.score ?? 0;

    const goal = await this.prisma.goal.create({
      data: {
        tennisProfileId: profile.id,
        skill: dto.skill,
        baseline,
        target: dto.target,
        deadline: dto.deadline,
        milestones: dto.milestones
          ? { create: dto.milestones.map((label) => ({ label })) }
          : undefined,
      },
      include: { milestones: true },
    });

    return this.toGoalDto(goal, baseline);
  }

  async listGoals(userId: string) {
    const profile = await this.requireTennisProfile(userId);
    const [goals, scores] = await Promise.all([
      this.prisma.goal.findMany({
        where: { tennisProfileId: profile.id },
        orderBy: { createdAt: 'desc' },
        include: { milestones: true },
      }),
      this.currentScores(profile.id),
    ]);
    const scoreBySkill = new Map(scores.map((s) => [s.skill, s.score]));
    return {
      goals: goals.map((g) =>
        this.toGoalDto(g, scoreBySkill.get(g.skill) ?? null),
      ),
    };
  }

  async getGoal(userId: string, goalId: string) {
    const profile = await this.requireTennisProfile(userId);
    const goal = await this.loadGoal(profile.id, goalId);
    const scores = await this.currentScores(profile.id);
    const current = scores.find((s) => s.skill === goal.skill)?.score ?? null;
    return this.toGoalDto(goal, current);
  }

  async updateGoal(userId: string, goalId: string, dto: UpdateGoalDto) {
    const profile = await this.requireTennisProfile(userId);
    await this.loadGoal(profile.id, goalId);

    const goal = await this.prisma.goal.update({
      where: { id: goalId },
      data: {
        target: dto.target,
        deadline: dto.deadline,
      },
      include: { milestones: true },
    });

    const scores = await this.currentScores(profile.id);
    const current = scores.find((s) => s.skill === goal.skill)?.score ?? null;
    return this.toGoalDto(goal, current);
  }

  async deleteGoal(userId: string, goalId: string) {
    const profile = await this.requireTennisProfile(userId);
    await this.loadGoal(profile.id, goalId);
    await this.prisma.goal.delete({ where: { id: goalId } });
    return { deleted: true };
  }

  async completeGoal(userId: string, goalId: string) {
    const profile = await this.requireTennisProfile(userId);
    await this.loadGoal(profile.id, goalId);
    const goal = await this.prisma.goal.update({
      where: { id: goalId },
      data: { achievedAt: new Date() },
      include: { milestones: true },
    });
    const scores = await this.currentScores(profile.id);
    const current = scores.find((s) => s.skill === goal.skill)?.score ?? null;
    return this.toGoalDto(goal, current);
  }

  async completeMilestone(userId: string, goalId: string, milestoneId: string) {
    const profile = await this.requireTennisProfile(userId);
    const goal = await this.loadGoal(profile.id, goalId);
    const milestone = goal.milestones.find((m) => m.id === milestoneId);
    if (!milestone) {
      throw new NotFoundException('Milestone not found.');
    }
    await this.prisma.goalMilestone.update({
      where: { id: milestoneId },
      data: { achievedAt: new Date() },
    });
    return this.getGoal(userId, goalId);
  }

  private async loadGoal(tennisProfileId: string, goalId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id: goalId, tennisProfileId },
      include: { milestones: true },
    });
    if (!goal) {
      throw new NotFoundException('Goal not found.');
    }
    return goal;
  }

  private toGoalDto(
    goal: {
      id: string;
      skill: string;
      baseline: number;
      target: number;
      deadline: Date | null;
      achievedAt: Date | null;
      createdAt: Date;
      milestones: { id: string; label: string; achievedAt: Date | null }[];
    },
    currentScore: number | null,
  ) {
    const status = deriveGoalStatus({
      baseline: goal.baseline,
      target: goal.target,
      createdAt: goal.createdAt,
      deadline: goal.deadline,
      achievedAt: goal.achievedAt,
      currentScore,
      now: new Date(),
    });

    return {
      id: goal.id,
      skill: goal.skill,
      baseline: goal.baseline,
      target: goal.target,
      deadline: goal.deadline,
      achievedAt: goal.achievedAt,
      currentScore,
      status,
      milestones: goal.milestones.map((m) => ({
        id: m.id,
        label: m.label,
        achievedAt: m.achievedAt,
      })),
    };
  }
}
