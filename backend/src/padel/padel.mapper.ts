import { Prisma } from '@prisma/client';
import { labelForLevel } from '../common/level-label.util';

export const padelProfileInclude = {
  assessmentSessions: {
    where: { status: 'COMPLETED' as const },
    orderBy: { completedAt: 'desc' as const },
    take: 1,
  },
} satisfies Prisma.PadelProfileInclude;

export type PadelProfileRecord = Prisma.PadelProfileGetPayload<{
  include: typeof padelProfileInclude;
}>;

/**
 * Skill breakdown is derived from the latest completed
 * `PadelAssessmentSession`, never stored redundantly on `PadelProfile` —
 * same discipline as `player.mapper.ts`'s Tennis equivalent.
 */
export function toPadelProfileDto(profile: PadelProfileRecord) {
  const latestSession = profile.assessmentSessions[0];

  return {
    id: profile.id,
    dominantHand: profile.dominantHand,
    singlesRating: profile.singlesRating,
    doublesRating: profile.doublesRating,
    systemSuggestedLevel: profile.systemSuggestedLevel,
    levelLabel:
      profile.systemSuggestedLevel === null
        ? null
        : labelForLevel(profile.systemSuggestedLevel),
    skillBreakdown:
      (latestSession?.resultSkillBreakdown as Record<string, number> | null) ??
      null,
    preferredSide: profile.preferredSide,
    partnerPreference: profile.partnerPreference,
    goals: profile.goals,
  };
}
