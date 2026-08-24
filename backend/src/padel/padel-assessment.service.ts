import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnswerOption,
  PadelAssessmentBranch,
  PadelAssessmentPillar,
  AssessmentSessionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { labelForLevel } from '../common/level-label.util';
import {
  Question,
  QuestionFraming,
  findQuestion,
  findQuestionById,
} from './data/padel-question-bank';

const PILLAR_ORDER: PadelAssessmentPillar[] = [
  PadelAssessmentPillar.RALLY_CONSISTENCY,
  PadelAssessmentPillar.FOREHAND,
  PadelAssessmentPillar.BACKHAND,
  PadelAssessmentPillar.SERVE,
  PadelAssessmentPillar.RETURN,
  PadelAssessmentPillar.VOLLEY,
  PadelAssessmentPillar.OVERHEAD,
  PadelAssessmentPillar.BANDEJA,
  PadelAssessmentPillar.VIBORA,
  PadelAssessmentPillar.SMASH,
  PadelAssessmentPillar.WALL_USAGE,
  PadelAssessmentPillar.POSITIONING,
  PadelAssessmentPillar.NET_CONTROL,
  PadelAssessmentPillar.TRANSITION,
  PadelAssessmentPillar.PARTNER_COMMUNICATION,
  PadelAssessmentPillar.TACTICAL_AWARENESS,
];

// Every dimension the beginner branch skips — "Advanced technique questions
// (bandeja, vibora, double-wall situations) are never asked" per
// foundation/03-user-journeys.md §9 — extended by the same judgment call
// M3 made for Tennis's NET_PLAY/COMPETITION_EXPERIENCE: dimensions that
// need some technique foundation to self-assess meaningfully.
const BEGINNER_PILLARS = new Set<PadelAssessmentPillar>([
  PadelAssessmentPillar.RALLY_CONSISTENCY,
  PadelAssessmentPillar.FOREHAND,
  PadelAssessmentPillar.BACKHAND,
  PadelAssessmentPillar.SERVE,
  PadelAssessmentPillar.RETURN,
  PadelAssessmentPillar.VOLLEY,
]);

const BRANCH_SCOPE: Record<
  PadelAssessmentBranch,
  Set<PadelAssessmentPillar>
> = {
  BEGINNER: BEGINNER_PILLARS,
  EXPERIENCED: new Set(PILLAR_ORDER),
};

const BRANCH_BUDGET: Record<PadelAssessmentBranch, number> = {
  BEGINNER: BEGINNER_PILLARS.size,
  EXPERIENCED: PILLAR_ORDER.length,
};

export interface NextPadelQuestionPayload {
  questionId: string;
  pillar: PadelAssessmentPillar;
  prompt: string;
  options: { key: string; text: string }[];
}

export interface PadelSessionStartPayload {
  sessionId: string;
  branch: PadelAssessmentBranch;
  questionBudget: number;
  answeredCount: number;
  nextQuestion: NextPadelQuestionPayload | null;
}

export interface PadelAssessmentResult {
  complete: true;
  level: number;
  label: string;
  skillBreakdown: Record<string, number>;
}

@Injectable()
export class PadelAssessmentService {
  constructor(private readonly prisma: PrismaService) {}

  scopeFor(branch: PadelAssessmentBranch): PadelAssessmentPillar[] {
    const scope = BRANCH_SCOPE[branch];
    return PILLAR_ORDER.filter((pillar) => scope.has(pillar));
  }

  levelForAverage(avgPoints: number): { level: number; label: string } {
    const raw = 1.0 + (avgPoints - 1) * 1.2;
    const level = Math.round(Math.min(7.0, Math.max(1.0, raw)) * 10) / 10;
    return { level, label: labelForLevel(level) };
  }

  private async requirePadelProfile(userId: string) {
    const profile = await this.prisma.padelProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException(
        'Padel profile not added yet — confirm intent before starting the assessment.',
      );
    }
    return profile;
  }

  /**
   * The opening question (RALLY_CONSISTENCY, index 0 in every branch's
   * scope) is always asked at `basic` framing — the branch isn't known yet.
   * Every question after that follows the branch's framing; pillars with
   * no `basic` variant (everything past VOLLEY) fall back to `advanced`,
   * same precedent as Tennis's `questionFor`.
   */
  private questionFor(
    pillar: PadelAssessmentPillar,
    branch: PadelAssessmentBranch,
    sequenceIndex: number,
  ): Question {
    const framing: QuestionFraming =
      sequenceIndex === 0
        ? 'basic'
        : branch === PadelAssessmentBranch.BEGINNER
          ? 'basic'
          : 'advanced';
    try {
      return findQuestion(pillar, framing);
    } catch {
      return findQuestion(pillar, 'advanced');
    }
  }

  private toPayload(question: Question): NextPadelQuestionPayload {
    return {
      questionId: question.id,
      pillar: question.pillar,
      prompt: question.prompt,
      options: question.options.map((o) => ({ key: o.key, text: o.text })),
    };
  }

  private nextQuestionForSession(
    branch: PadelAssessmentBranch,
    answeredCount: number,
  ): NextPadelQuestionPayload | null {
    const scope = this.scopeFor(branch);
    if (answeredCount >= scope.length) {
      return null;
    }
    const pillar = scope[answeredCount];
    return this.toPayload(this.questionFor(pillar, branch, answeredCount));
  }

  async startOrResumeSession(
    userId: string,
  ): Promise<PadelSessionStartPayload> {
    const profile = await this.requirePadelProfile(userId);

    const existing = await this.prisma.padelAssessmentSession.findFirst({
      where: {
        padelProfileId: profile.id,
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
          existing.answers.length,
        ),
      };
    }

    // Starts as EXPERIENCED (the superset scope) — narrows to BEGINNER
    // after the first answer if it signals low experience, see
    // `submitAnswer`. There's no prior signal to branch from up front the
    // way Tennis's `experienceSignal` (captured during onboarding) does.
    const branch = PadelAssessmentBranch.EXPERIENCED;
    const session = await this.prisma.padelAssessmentSession.create({
      data: {
        padelProfileId: profile.id,
        branch,
        questionBudget: BRANCH_BUDGET[branch],
        status: AssessmentSessionStatus.IN_PROGRESS,
      },
    });

    return {
      sessionId: session.id,
      branch: session.branch,
      questionBudget: session.questionBudget,
      answeredCount: 0,
      nextQuestion: this.nextQuestionForSession(session.branch, 0),
    };
  }

  async getActiveSession(userId: string): Promise<PadelSessionStartPayload> {
    const profile = await this.requirePadelProfile(userId);
    const session = await this.prisma.padelAssessmentSession.findFirst({
      where: {
        padelProfileId: profile.id,
        status: AssessmentSessionStatus.IN_PROGRESS,
      },
      include: { answers: true },
    });

    if (!session) {
      throw new NotFoundException('No Padel assessment in progress.');
    }

    return {
      sessionId: session.id,
      branch: session.branch,
      questionBudget: session.questionBudget,
      answeredCount: session.answers.length,
      nextQuestion: this.nextQuestionForSession(
        session.branch,
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
    | { nextQuestion: NextPadelQuestionPayload; answeredCount: number }
    | PadelAssessmentResult
  > {
    const profile = await this.requirePadelProfile(userId);
    const session = await this.prisma.padelAssessmentSession.findUnique({
      where: { id: sessionId },
      include: { answers: { orderBy: { sequenceIndex: 'asc' } } },
    });

    if (!session || session.padelProfileId !== profile.id) {
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

    await this.prisma.padelAssessmentAnswer.create({
      data: {
        sessionId: session.id,
        questionId: question.id,
        pillar: question.pillar,
        selectedOption: option.key,
        pointValue: option.points,
        sequenceIndex: session.answers.length,
      },
    });

    // The one-time branch lock — only ever evaluated on the very first
    // answer (RALLY_CONSISTENCY), never revisited after. Not a downshift:
    // once locked, the branch doesn't move again for the rest of the
    // session, unlike Tennis's per-answer downshift.
    let branch = session.branch;
    if (session.answers.length === 0 && option.points <= 2) {
      branch = PadelAssessmentBranch.BEGINNER;
    }
    if (branch !== session.branch) {
      await this.prisma.padelAssessmentSession.update({
        where: { id: session.id },
        data: { branch, questionBudget: BRANCH_BUDGET[branch] },
      });
    }

    const allAnswers = [
      ...session.answers.map((a) => ({ pointValue: a.pointValue })),
      { pointValue: option.points },
    ];
    const scopeAfter = this.scopeFor(branch);

    if (allAnswers.length < scopeAfter.length) {
      const nextQuestion = this.nextQuestionForSession(
        branch,
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

    // Deliberately no `User.onboardingStep` write — Add Padel happens
    // post-onboarding, unlike the Tennis assessment.
    await this.prisma.$transaction([
      this.prisma.padelAssessmentSession.update({
        where: { id: session.id },
        data: {
          status: AssessmentSessionStatus.COMPLETED,
          completedAt: new Date(),
          resultSystemSuggestedLevel: level,
          resultSkillBreakdown: skillBreakdown,
        },
      }),
      this.prisma.padelProfile.update({
        where: { id: profile.id },
        data: {
          systemSuggestedLevel: level,
          systemSuggestedLevelSetAt: new Date(),
        },
      }),
    ]);

    return { complete: true, level, label, skillBreakdown };
  }
}
