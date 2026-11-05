import { Injectable } from '@nestjs/common';
import { MatchResultStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { matchInclude, toMatchDto } from '../../matches/match.mapper';
import { displayName } from '../../common/display-name.util';
import { HOME_CARD_PRIORITY, type HomeCard } from '../home-card';
import type { HomeCardContributor, HomeContext } from './home-contributor';
import {
  DEFAULT_LOCALE,
  type MessageKey,
  type MessageParam,
  t,
} from '../../common/i18n';

/**
 * "Unconfirmed result" is one of the Home states
 * `foundation/04-screen-inventory.md` §A.3 names explicitly, and it is the
 * highest-priority card in the feed for a reason: until this user acts, the
 * *other* player's rating is frozen too. It is deliberately not dismissible —
 * hiding it would strand the opponent with no way to settle the match.
 *
 * Two shapes share this contributor because both mean "a result needs you":
 * a score someone else submitted awaiting confirmation, and a dispute that
 * M7 can only resolve by mutual re-confirmation.
 */
@Injectable()
export class UnconfirmedResultContributor implements HomeCardContributor {
  readonly key = 'unconfirmed-result';

  constructor(private readonly prisma: PrismaService) {}

  async contribute(ctx: HomeContext): Promise<HomeCard[]> {
    const tr = (key: MessageKey, params?: Record<string, MessageParam>) =>
      t(ctx.locale ?? DEFAULT_LOCALE, key, params);
    const matches = await this.prisma.match.findMany({
      where: {
        participants: { some: { userId: ctx.userId } },
        result: {
          status: {
            in: [
              MatchResultStatus.PENDING_CONFIRMATION,
              MatchResultStatus.DISPUTED,
            ],
          },
        },
      },
      include: matchInclude,
      orderBy: { updatedAt: 'desc' },
      take: 3,
    });

    return matches.flatMap((match) => {
      const result = match.result;
      if (!result) return [];

      const dto = toMatchDto(match, ctx.userId);
      const opponent = match.participants.find((p) => p.userId !== ctx.userId);
      const opponentName = opponent
        ? displayName(opponent.user)
        : tr('home.result.yourOpponent');

      if (result.status === MatchResultStatus.DISPUTED) {
        return [
          {
            id: `unconfirmed-result:${match.id}`,
            type: 'UNCONFIRMED_RESULT' as const,
            priority: HOME_CARD_PRIORITY.UNCONFIRMED_RESULT,
            title: tr('home.result.disputedTitle'),
            body: tr('home.result.disputedBody', { name: opponentName }),
            accent: 'urgent' as const,
            action: {
              label: tr('home.action.reviewDispute'),
              route: `/matches/${match.id}/dispute`,
            },
            dismissible: false,
            data: { kind: 'match' as const, match: dto },
          },
        ];
      }

      // A result this user submitted is waiting on the *opponent*, not on
      // them — surfacing it here would be noise, not a prompt.
      if (result.submittedById === ctx.userId) return [];

      return [
        {
          id: `unconfirmed-result:${match.id}`,
          type: 'UNCONFIRMED_RESULT' as const,
          priority: HOME_CARD_PRIORITY.UNCONFIRMED_RESULT,
          title: tr('home.result.confirmTitle'),
          body: tr('home.result.confirmBody', { name: opponentName }),
          accent: 'urgent' as const,
          action: {
            label: tr('home.action.reviewScore'),
            route: `/matches/${match.id}`,
          },
          dismissible: false,
          data: { kind: 'match' as const, match: dto },
        },
      ];
    });
  }
}
