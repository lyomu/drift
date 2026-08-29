import { Injectable } from '@nestjs/common';
import { AchievementsService } from '../../achievements/achievements.service';
import { HOME_CARD_PRIORITY, type HomeCard } from '../home-card';
import type { HomeCardContributor, HomeContext } from './home-contributor';

/**
 * Achievement progress — deliberately **not** "you recently earned X".
 *
 * Achievements are derived on every read from a static rule catalogue
 * (`achievements.service.ts`); nothing is stored, so there is no `earnedAt`
 * and no way to know which badge was earned most recently. Presenting one as
 * "new" would be inventing a timestamp the data doesn't have — the same
 * never-fabricate rule M9 applied to venue data and M11 applied to news
 * attribution. The honest card is the standing tally plus the next target.
 *
 * Shown only once the user has earned at least one badge. Greeting a brand
 * new player with "0 of 7" is a scoreboard of things they haven't done, which
 * is the opposite of the encouragement this card is for.
 */
@Injectable()
export class AchievementProgressContributor implements HomeCardContributor {
  readonly key = 'achievement-progress';

  constructor(private readonly achievements: AchievementsService) {}

  async contribute(ctx: HomeContext): Promise<HomeCard[]> {
    const { achievements, earnedCount, totalCount } =
      await this.achievements.list(ctx.userId);

    if (earnedCount === 0 || earnedCount === totalCount) return [];

    const next = achievements.find((a) => a.state === 'LOCKED') ?? null;

    return [
      {
        id: 'achievement-progress',
        type: 'ACHIEVEMENT_PROGRESS',
        priority: HOME_CARD_PRIORITY.ACHIEVEMENT_PROGRESS,
        title: `${earnedCount} of ${totalCount} achievements`,
        body: next
          ? `Next up: ${next.title} — ${next.criteria}`
          : 'Keep playing to unlock the rest.',
        accent: 'success',
        action: { label: 'View all', route: '/profile/achievements' },
        dismissible: true,
        data: {
          kind: 'achievement',
          earnedCount,
          totalCount,
          nextTitle: next?.title ?? null,
          nextIcon: next?.icon ?? null,
        },
      },
    ];
  }
}
