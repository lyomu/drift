import { Injectable } from '@nestjs/common';
import { PlayersService } from '../../players/players.service';
import { HOME_CARD_PRIORITY, type HomeCard } from '../home-card';
import type { HomeCardContributor, HomeContext } from './home-contributor';
import {
  DEFAULT_LOCALE,
  type MessageKey,
  type MessageParam,
  t,
} from '../../common/i18n';

/** Kept tight — Home is a prompt, and the full search is one tap away. */
const SUGGESTION_COUNT = 3;

/**
 * The highest-value discovery card: it feeds the app's core loop (find
 * someone → challenge them → play) directly from the screen every user lands
 * on.
 *
 * Reuses `PlayersService.search` wholesale rather than reimplementing a
 * "suggestion" query, so the even 0.5/0.5 proximity-and-level-compatibility
 * ranking M5 documented stays the single definition of who's a good match.
 * A second, subtly-different ranking here is exactly the kind of drift the
 * shared-mapper discipline in this codebase exists to prevent.
 *
 * No filters are passed beyond the count: the viewer's own level and
 * coordinates already drive the ranking inside `search`, and layering a
 * distance cap here would silently hide players from anyone whose location
 * we don't have.
 */
@Injectable()
export class SuggestedOpponentsContributor implements HomeCardContributor {
  readonly key = 'suggested-opponents';

  constructor(private readonly players: PlayersService) {}

  async contribute(ctx: HomeContext): Promise<HomeCard[]> {
    const tr = (key: MessageKey, params?: Record<string, MessageParam>) =>
      t(ctx.locale ?? DEFAULT_LOCALE, key, params);
    const { players } = await this.players.search(ctx.userId, {
      take: SUGGESTION_COUNT,
    });
    if (players.length === 0) return [];

    return [
      {
        id: 'suggested-opponents',
        type: 'SUGGESTED_OPPONENTS',
        priority: HOME_CARD_PRIORITY.SUGGESTED_OPPONENTS,
        title: tr('home.opponents.title'),
        body:
          players.length === 1
            ? tr('home.opponents.one')
            : tr('home.opponents.many', { count: players.length }),
        accent: 'neutral',
        action: {
          label: tr('home.action.findPlayers'),
          route: '/home?tab=play&play=find',
        },
        dismissible: true,
        data: { kind: 'players', players },
      },
    ];
  }
}
