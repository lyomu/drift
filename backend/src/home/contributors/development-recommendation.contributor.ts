import { Injectable } from '@nestjs/common';
import { LearningService } from '../../learning/learning.service';
import { HOME_CARD_PRIORITY, type HomeCard } from '../home-card';
import type { HomeCardContributor, HomeContext } from './home-contributor';
import {
  DEFAULT_LOCALE,
  type MessageKey,
  type MessageParam,
  t,
} from '../../common/i18n';

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
    const tr = (key: MessageKey, params?: Record<string, MessageParam>) =>
      t(ctx.locale ?? DEFAULT_LOCALE, key, params);
    const skillProfile = await this.learning.getSkillProfile(ctx.userId);
    if (
      !skillProfile.weakestSkill ||
      skillProfile.recommendations.length === 0
    ) {
      return [];
    }

    const top = skillProfile.recommendations[0];
    const skillKey = `home.skill.${skillProfile.weakestSkill}` as MessageKey;
    const translatedSkill = tr(skillKey);
    const skill =
      translatedSkill === skillKey
        ? skillProfile.weakestSkill.toLowerCase()
        : translatedSkill;

    return [
      {
        id: `development-recommendation:${top.id}`,
        type: 'DEVELOPMENT_RECOMMENDATION',
        priority: HOME_CARD_PRIORITY.DEVELOPMENT_RECOMMENDATION,
        title: tr('home.recommendation.title', { skill }),
        body: tr(
          top.type === 'DRILL'
            ? 'home.recommendation.drill'
            : 'home.recommendation.lesson',
          { title: top.title },
        ),
        accent: 'neutral',
        action: {
          label: tr('home.action.open'),
          route: `/learn/content/${top.id}`,
        },
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
