/**
 * foundation/03-user-journeys.md §8: "Updates Skill Development Profile
 * using a blended signal: initial assessment + practice logs + match
 * reflections + (future) coach feedback." No formula is specified — this is
 * a documented implementation decision, same class of choice as M5's
 * proximity/level ranking weights and M7's Elo formula.
 *
 * Match reflections are listed as a blend input in the doc, but
 * `MatchReflection` (built in M7) captures no skill dimension — only an
 * overall `confidence` + free-text `notes` — so there is no per-skill
 * signal to blend in without a schema change. That stays a documented gap
 * (see PROGRESS.md) rather than fabricating a per-skill signal from
 * data that isn't actually skill-scoped. The blend here is assessment
 * baseline + practice log signal only.
 */

import { AssessmentPillar } from '@prisma/client';

/**
 * The seven development dimensions from Doc 3 §8 / Doc 4 §A.7. Excludes
 * COMPETITION_EXPERIENCE — the assessment tracks it as an experience
 * signal, not a skill to develop.
 */
export const SKILL_DIMENSIONS: AssessmentPillar[] = [
  AssessmentPillar.FOREHAND,
  AssessmentPillar.BACKHAND,
  AssessmentPillar.SERVE,
  AssessmentPillar.RETURN,
  AssessmentPillar.NET_PLAY,
  AssessmentPillar.MOVEMENT,
  AssessmentPillar.MATCH_PLAY,
];

const ASSESSMENT_WEIGHT = 0.6;
const PRACTICE_WEIGHT = 0.4;
const SCORE_MIN = 0;
const SCORE_MAX = 6;

export interface PracticeSignal {
  skillFocus: AssessmentPillar;
  /** Self-rating, 1 (rough) – 5 (great). */
  perceivedPerformance: number;
}

export type SkillMaturity = 'DIRECTIONAL' | 'ESTABLISHED';

export interface SkillScore {
  skill: AssessmentPillar;
  /** Null means genuinely no data yet — never fabricated as 0. */
  score: number | null;
  /**
   * Per the design rule in Doc 3 §8: assessment-only data reads as
   * "Building" (DIRECTIONAL) in the UI, never a falsely precise
   * percentage, until at least one practice session backs it up.
   */
  maturity: SkillMaturity | null;
}

/**
 * One score per dimension in `SKILL_DIMENSIONS`, always in that order.
 * `assessmentBreakdown` is the latest completed `AssessmentSession`'s
 * `resultSkillBreakdown` (a sparse `{pillar: pointValue}` map — a branch
 * may not have asked every pillar).
 */
export function computeSkillScores(
  assessmentBreakdown: Record<string, number> | null,
  practiceSessions: PracticeSignal[],
): SkillScore[] {
  return SKILL_DIMENSIONS.map((skill) => {
    const baseline = assessmentBreakdown?.[skill] ?? null;
    const practiceForSkill = practiceSessions.filter(
      (p) => p.skillFocus === skill,
    );

    if (baseline === null && practiceForSkill.length === 0) {
      return { skill, score: null, maturity: null };
    }

    if (practiceForSkill.length === 0) {
      return { skill, score: baseline, maturity: 'DIRECTIONAL' };
    }

    const avgPerceived =
      practiceForSkill.reduce((sum, p) => sum + p.perceivedPerformance, 0) /
      practiceForSkill.length;
    // Normalise the 1-5 self-rating onto the assessment's 0-6 scale.
    const practiceSignal = ((avgPerceived - 1) / 4) * SCORE_MAX;

    const blended =
      baseline === null
        ? practiceSignal
        : ASSESSMENT_WEIGHT * baseline + PRACTICE_WEIGHT * practiceSignal;

    return {
      skill,
      score: Math.min(SCORE_MAX, Math.max(SCORE_MIN, blended)),
      maturity: 'ESTABLISHED',
    };
  });
}

/** The lowest-scoring dimension with any data — null if nothing scored yet. */
export function weakestSkill(scores: SkillScore[]): AssessmentPillar | null {
  const scored = scores.filter(
    (s): s is SkillScore & { score: number } => s.score !== null,
  );
  if (scored.length === 0) return null;
  return scored.reduce((min, s) => (s.score < min.score ? s : min)).skill;
}

export interface GoalStatusInput {
  baseline: number;
  target: number;
  createdAt: Date;
  deadline: Date | null;
  achievedAt: Date | null;
  currentScore: number | null;
  now: Date;
}

/**
 * Derived on read, same discipline as `match-state.ts`'s `effectiveState`
 * and `season-state.ts` — a goal's status is never a stored field the app
 * can forget to update. Pacing compares actual progress against a linear
 * expected-progress line from baseline to target over the goal's full
 * baseline→deadline window.
 */
export function deriveGoalStatus(
  input: GoalStatusInput,
): 'ON_TRACK' | 'BEHIND' | 'ACHIEVED' {
  if (input.achievedAt) return 'ACHIEVED';
  if (input.currentScore !== null && input.currentScore >= input.target) {
    return 'ACHIEVED';
  }
  if (!input.deadline || input.currentScore === null) return 'ON_TRACK';

  const totalMs = input.deadline.getTime() - input.createdAt.getTime();
  if (totalMs <= 0) {
    return input.currentScore > input.baseline ? 'ON_TRACK' : 'BEHIND';
  }

  const elapsedFraction = Math.min(
    1,
    Math.max(0, (input.now.getTime() - input.createdAt.getTime()) / totalMs),
  );
  const expectedProgress = (input.target - input.baseline) * elapsedFraction;
  const actualProgress = input.currentScore - input.baseline;

  return actualProgress >= expectedProgress ? 'ON_TRACK' : 'BEHIND';
}

export interface RecommendableContent {
  id: string;
  type: string;
  targetSkill: AssessmentPillar;
  branch: string | null;
}

/**
 * Doc 3 §8: "Weakness/Goal → Recommended Drill/Lesson → Practice → Progress
 * Update." Training plans are excluded from recommendations — they're a
 * multi-session commitment, not a quick "try this" suggestion. Content
 * matching the player's own branch sorts first, branch-agnostic content is
 * a safe fallback, and a specific-but-mismatched branch sorts last rather
 * than being excluded outright — showing *something* beats showing nothing
 * on a thin seed catalogue.
 */
export function recommendContent<T extends RecommendableContent>(
  content: T[],
  skill: AssessmentPillar,
  branch: string | null,
  limit = 3,
): T[] {
  const rank = (c: T) => (c.branch === branch ? 0 : c.branch === null ? 1 : 2);

  return content
    .filter((c) => c.targetSkill === skill && c.type !== 'TRAINING_PLAN')
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, limit);
}
