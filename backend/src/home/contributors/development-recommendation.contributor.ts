import { Injectable } from '@nestjs/common';
import { LearningService } from '../../learning/learning.service';
import { HOME_CARD_PRIORITY, type HomeCard } from '../home-card';
import type { HomeCardContributor, HomeContext } from './home-contributor';

const SKILL_LABEL: Record<string, string> = {
  FOREHAND: 'forehand',
  BACKHAND: 'backhand',
  SERVE: 'serve',
  RETURN: 'return',
  NET_PLAY: 'net play',
  MOVEMENT: 'movement',
  MATCH_PLAY: 'match play',
};

/**
 * The weakest-skill recommendation from M10's skill-score blend. Carried over
 * from the M4-era feed, with the gap that made it frustrating closed: the
 * card named a real lesson but had no action, so the one genuinely useful
 * card on Home was the one you couldn't tap.
 *
 * `LearningService` is imported as a module (rather than read via Prisma like
 * the other contributors) because the recommendation is real engine logic —
 * `skill-score.ts`'s assessment/practice blend and branch ranking — not a
 * query. That's the same "second consumer" reason M10 first exported it here.
 */
@Injectable()
export class DevelopmentRecommendationContributor implements HomeCardContributor {
  readonly key = 'development-recommendation';

  constructor(private readonly learning: LearningService) {}

  async contribute(ctx: HomeContext): Promise<HomeCard[]> {
    const skillProfile = await this.learning.getSkillProfile(ctx.userId);
    if (
      !skillProfile.weakestSkill ||
      skillProfile.recommendations.length === 0
    ) {
      return [];
    }

    const top = skillProfile.recommendations[0];
    const skill =
      SKILL_LABEL[skillProfile.weakestSkill] ??
      skillProfile.weakestSkill.toLowerCase();

    return [
      {
        id: `development-recommendation:${top.id}`,
        type: 'DEVELOPMENT_RECOMMENDATION',
        priority: HOME_CARD_PRIORITY.DEVELOPMENT_RECOMMENDATION,
        title: `Work on your ${skill}`,
        body: `"${top.title}" is a ${top.type === 'DRILL' ? 'drill' : 'lesson'} picked for your level.`,
        accent: 'neutral',
        action: { label: 'Open', route: `/learn/content/${top.id}` },
        dismissible: true,
        data: {
          kind: 'content',
          contentId: top.id,
          contentType: top.type,
          title: top.title,
        },
      },
    ];
  }
}
