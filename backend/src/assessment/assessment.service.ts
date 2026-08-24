import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnswerOption,
  AssessmentBranch,
  AssessmentPillar,
  AssessmentSessionStatus,
  ExperienceSignal,
  OnboardingStep,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { labelForLevel } from '../common/level-label.util';
import {
  Question,
  QuestionFraming,
  findQuestion,
  findQuestionById,
} from './data/question-bank';

const PILLAR_ORDER: AssessmentPillar[] = [
  AssessmentPillar.FOREHAND,
  AssessmentPillar.BACKHAND,
  AssessmentPillar.SERVE,
  AssessmentPillar.RETURN,
  AssessmentPillar.NET_PLAY,
  AssessmentPillar.MOVEMENT,
  AssessmentPillar.COMPETITION_EXPERIENCE,
  AssessmentPillar.MATCH_PLAY,
];

const BEGINNER_PILLARS = new Set<AssessmentPillar>([
  AssessmentPillar.FOREHAND,
  AssessmentPillar.BACKHAND,
  AssessmentPillar.SERVE,
  AssessmentPillar.MATCH_PLAY,
]);
const FOUNDATIONAL_PILLARS = new Set<AssessmentPillar>([
  ...BEGINNER_PILLARS,
  AssessmentPillar.RETURN,
  AssessmentPillar.MOVEMENT,
]);
const INTERMEDIATE_PILLARS = new Set<AssessmentPillar>([
  ...FOUNDATIONAL_PILLARS,
  AssessmentPillar.NET_PLAY,
]);
const ADVANCED_PILLARS = new Set<AssessmentPillar>([
  ...INTERMEDIATE_PILLARS,
  AssessmentPillar.COMPETITION_EXPERIENCE,
]);

const BRANCH_SCOPE: Record<AssessmentBranch, Set<AssessmentPillar>> = {
  BEGINNER: BEGINNER_PILLARS,
  FOUNDATIONAL: FOUNDATIONAL_PILLARS,
  INTERMEDIATE: INTERMEDIATE_PILLARS,
  ADVANCED: ADVANCED_PILLARS,
};

const BRANCH_BUDGET: Record<AssessmentBranch, number> = {
  BEGINNER: 6,
  FOUNDATIONAL: 9,
  INTERMEDIATE: 12,
  ADVANCED: 15,
};

const BRANCH_TIER_ORDER: AssessmentBranch[] = [
  AssessmentBranch.BEGINNER,
  AssessmentBranch.FOUNDATIONAL,
  AssessmentBranch.INTERMEDIATE,
  AssessmentBranch.ADVANCED,
];

const EXPERIENCE_TO_BRANCH: Record<ExperienceSignal, AssessmentBranch> = {
  NEW: AssessmentBranch.BEGINNER,
  UNDER_6M: AssessmentBranch.FOUNDATIONAL,
  SIX_TO_12M: AssessmentBranch.FOUNDATIONAL,
  ONE_TO_2Y: AssessmentBranch.INTERMEDIATE,
  TWO_TO_5Y: AssessmentBranch.INTERMEDIATE,
  FIVE_PLUS: AssessmentBranch.ADVANCED,
  COMPETITIVE: AssessmentBranch.ADVANCED,
};

export interface NextQuestionPayload {
  questionId: string;
  pillar: AssessmentPillar;
  prompt: string;
  options: { key: string; text: string }[];
}

export interface SessionStartPayload {
  sessionId: string;
  branch: AssessmentBranch;
  questionBudget: number;
  answeredCount: number;
  nextQuestion: NextQuestionPayload | null;
}

export interface AssessmentResult {
  complete: true;
  level: number;
  label: string;
  skillBreakdown: Record<string, number>;
}

@Injectable()
export class AssessmentService {
  constructor(private readonly prisma: PrismaService) {}

  branchFor(experienceSignal: ExperienceSignal): AssessmentBranch {
    return EXPERIENCE_TO_BRANCH[experienceSignal];
  }

  scopeFor(branch: AssessmentBranch): AssessmentPillar[] {
    const scope = BRANCH_SCOPE[branch];
    return PILLAR_ORDER.filter((pillar) => scope.has(pillar));
  }

  levelForAverage(avgPoints: number): { level: number; label: string } {
    const raw = 1.0 + (avgPoints - 1) * 1.2;
    const level = Math.round(Math.min(7.0, Math.max(1.0, raw)) * 10) / 10;
    return { level, label: labelForLevel(level) };
  }

  private async findTennisProfile(userId: string) {
    const profile = await this.prisma.tennisProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Tennis profile not found.');
    }
    return profile;
  }

  private framingFor(tier: AssessmentBranch): QuestionFraming {
    return tier === AssessmentBranch.BEGINNER ||
      tier === AssessmentBranch.FOUNDATIONAL
      ? 'basic'
      : 'advanced';
  }

  /** Falls back to `advanced` for the two pillars with no `basic` variant. */
  private questionFor(
    pillar: AssessmentPillar,
    tier: AssessmentBranch,
  ): Question {
    const framing = this.framingFor(tier);
    try {
      return findQuestion(pillar, framing);
    } catch {
      return findQuestion(pillar, 'advanced');
    }
  }

  private toPayload(question: Question): NextQuestionPayload {
    return {
      questionId: question.id,
      pillar: question.pillar,
      prompt: question.prompt,
      options: question.options.map((o) => ({ key: o.key, text: o.text })),
    };
  }

  private nextQuestionForSession(
    branch: AssessmentBranch,
    currentTier: AssessmentBranch,
    answeredCount: number,
  ): NextQuestionPayload | null {
    const scope = this.scopeFor(branch);
    if (answeredCount >= scope.length) {
      return null;
    }
    const pillar = scope[answeredCount];
    return this.toPayload(this.questionFor(pillar, currentTier));
  }

  async startOrResumeSession(userId: string): Promise<SessionStartPayload> {
    const profile = await this.findTennisProfile(userId);
    if (!profile.experienceSignal) {
      throw new BadRequestException(
        'Complete Tennis Experience before starting the assessment.',
      );
    }

    const existing = await this.prisma.assessmentSession.findFirst({
      where: {
        tennisProfileId: profile.id,
        status: AssessmentSessionStatus.IN_PROGRESS,
      },
      include: { answers: true },
    });

    if (existing) {
      return {
        sessionId: existing.id,
        branch: existing.branch,
        questionBudget: existing.questionBudget,
        answeredCount: existing.answers.length,
        nextQuestion: this.nextQuestionForSession(
          existing.branch,
          existing.currentTier,
          existing.answers.length,
        ),
      };
    }

    const branch = this.branchFor(profile.experienceSignal);
    const session = await this.prisma.assessmentSession.create({
      data: {
        tennisProfileId: profile.id,
        branch,
        currentTier: branch,
        questionBudget: BRANCH_BUDGET[branch],
        status: AssessmentSessionStatus.IN_PROGRESS,
      },
    });

    return {
      sessionId: session.id,
      branch: session.branch,
      questionBudget: session.questionBudget,
      answeredCount: 0,
      nextQuestion: this.nextQuestionForSession(
        session.branch,
        session.currentTier,
        0,
      ),
    };
  }

  async getActiveSession(userId: string): Promise<SessionStartPayload> {
    const profile = await this.findTennisProfile(userId);
    const session = await this.prisma.assessmentSession.findFirst({
      where: {
        tennisProfileId: profile.id,
        status: AssessmentSessionStatus.IN_PROGRESS,
      },
      include: { answers: true },
    });

    if (!session) {
      throw new NotFoundException('No assessment in progress.');
    }

    return {
      sessionId: session.id,
      branch: session.branch,
      questionBudget: session.questionBudget,
      answeredCount: session.answers.length,
      nextQuestion: this.nextQuestionForSession(
        session.branch,
        session.currentTier,
        session.answers.length,
      ),
    };
  }

  async submitAnswer(
    userId: string,
    sessionId: string,
    questionId: string,
    selectedOption: AnswerOption,
  ): Promise<
    | { nextQuestion: NextQuestionPayload; answeredCount: number }
    | AssessmentResult
  > {
    const profile = await this.findTennisProfile(userId);
    const session = await this.prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: { answers: { orderBy: { sequenceIndex: 'asc' } } },
    });

    if (!session || session.tennisProfileId !== profile.id) {
      throw new NotFoundException('Assessment session not found.');
    }
    if (session.status !== AssessmentSessionStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'This assessment has already been completed.',
      );
    }

    const scope = this.scopeFor(session.branch);
    const expectedPillar = scope[session.answers.length];
    const question = findQuestionById(questionId);
    if (!question || question.pillar !== expectedPillar) {
      throw new BadRequestException('Unexpected question for this step.');
    }

    const option = question.options.find((o) => o.key === selectedOption);
    if (!option) {
      throw new BadRequestException('Invalid answer option.');
    }

    await this.prisma.assessmentAnswer.create({
      data: {
        sessionId: session.id,
        questionId: question.id,
        pillar: question.pillar,
        selectedOption: option.key,
        pointValue: option.points,
        sequenceIndex: session.answers.length,
      },
    });

    const allAnswers = [
      ...session.answers.map((a) => ({ pointValue: a.pointValue })),
      { pointValue: option.points },
    ];

    let currentTier = session.currentTier;
    const lastTwo = allAnswers.slice(-2);
    if (lastTwo.length === 2 && lastTwo.every((a) => a.pointValue <= 2)) {
      const tierIndex = BRANCH_TIER_ORDER.indexOf(currentTier);
      if (tierIndex > 0) {
        currentTier = BRANCH_TIER_ORDER[tierIndex - 1];
      }
    }
    if (currentTier !== session.currentTier) {
      await this.prisma.assessmentSession.update({
        where: { id: session.id },
        data: { currentTier },
      });
    }

    if (allAnswers.length < scope.length) {
      const nextQuestion = this.nextQuestionForSession(
        session.branch,
        currentTier,
        allAnswers.length,
      );
      return { nextQuestion: nextQuestion!, answeredCount: allAnswers.length };
    }

    const avgPoints =
      allAnswers.reduce((sum, a) => sum + a.pointValue, 0) / allAnswers.length;
    const { level, label } = this.levelForAverage(avgPoints);
    const skillBreakdown: Record<string, number> = {};
    for (const a of session.answers) {
      skillBreakdown[a.pillar] = a.pointValue;
    }
    skillBreakdown[question.pillar] = option.points;

    await this.prisma.$transaction([
      this.prisma.assessmentSession.update({
        where: { id: session.id },
        data: {
          status: AssessmentSessionStatus.COMPLETED,
          completedAt: new Date(),
          resultSystemSuggestedLevel: level,
          resultSkillBreakdown: skillBreakdown,
        },
      }),
      this.prisma.tennisProfile.update({
        where: { id: profile.id },
        data: {
          systemSuggestedLevel: level,
          systemSuggestedLevelSetAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { onboardingStep: OnboardingStep.LEVEL_REVIEW },
      }),
    ]);

    return { complete: true, level, label, skillBreakdown };
  }
}
