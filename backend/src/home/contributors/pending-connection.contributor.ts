import { Injectable } from '@nestjs/common';
import { ConnectionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { playerInclude, toPlayerSummary } from '../../players/player.mapper';
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
 * Incoming connection requests awaiting an answer.
 *
 * Only *incoming* requests qualify — an outgoing request is waiting on
 * somebody else, so it isn't an action this user can take.
 *
 * Requests from blocked users are excluded here rather than relied on being
 * absent: M5 severs connections on block, but a `PENDING` row that predates
 * the block would otherwise surface the blocked user's name on Home, which is
 * precisely what blocking is supposed to prevent.
 */
@Injectable()
export class PendingConnectionContributor implements HomeCardContributor {
  readonly key = 'pending-connection';

  constructor(private readonly prisma: PrismaService) {}

  async contribute(ctx: HomeContext): Promise<HomeCard[]> {
    const tr = (key: MessageKey, params?: Record<string, MessageParam>) =>
      t(ctx.locale ?? DEFAULT_LOCALE, key, params);
    const [requests, blocks] = await Promise.all([
      this.prisma.connection.findMany({
        where: { addresseeId: ctx.userId, status: ConnectionStatus.PENDING },
        include: { requester: { include: playerInclude } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.block.findMany({
        where: {
          OR: [{ blockerId: ctx.userId }, { blockedId: ctx.userId }],
        },
        select: { blockerId: true, blockedId: true },
      }),
    ]);

    const blocked = new Set(blocks.flatMap((b) => [b.blockerId, b.blockedId]));
    const visible = requests.filter((r) => !blocked.has(r.requesterId));
    if (visible.length === 0) return [];

    const first = visible[0];
    const firstName = displayName(first.requester);

    return [
      {
        id: 'pending-connection',
        type: 'PENDING_CONNECTION',
        priority: HOME_CARD_PRIORITY.PENDING_CONNECTION,
        title:
          visible.length === 1
            ? tr('home.connections.one', { name: firstName })
            : tr('home.connections.many', { count: visible.length }),
        body:
          visible.length === 1
            ? tr('home.connections.oneBody')
            : tr('home.connections.manyBody', { name: firstName }),
        accent: 'info',
        action: {
          label: tr('home.action.viewRequests'),
          route: '/connections/pending',
        },
        dismissible: true,
        data: {
          kind: 'players',
          players: visible.map((r) => toPlayerSummary(r.requester, null)),
        },
      },
    ];
  }
}
