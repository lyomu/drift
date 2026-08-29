import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HOME_CARD_PRIORITY, type HomeCard } from '../home-card';
import type { HomeCardContributor, HomeContext } from './home-contributor';

/**
 * Unread messages, counted the same way `MessagingService.listConversations`
 * counts them: messages from someone else, newer than this user's
 * `lastReadAt` for that conversation. Read receipts aren't stored per message
 * (Doc 6 §1), so the watermark *is* the source of truth — duplicating that
 * rule differently here would make Home and Inbox disagree.
 *
 * Deliberately one aggregate card rather than one per conversation: the Inbox
 * is one tap away and already renders the per-thread breakdown, so a card per
 * thread would push everything else out of the feed on a busy week.
 *
 * System messages count. Every match transition writes one (M6), so they are
 * often the *most* informative thing waiting — excluding them would hide
 * "your opponent proposed a time" behind a silent badge.
 */
@Injectable()
export class UnreadMessagesContributor implements HomeCardContributor {
  readonly key = 'unread-messages';

  constructor(private readonly prisma: PrismaService) {}

  async contribute(ctx: HomeContext): Promise<HomeCard[]> {
    const memberships = await this.prisma.conversationParticipant.findMany({
      where: { userId: ctx.userId },
      select: { conversationId: true, lastReadAt: true },
    });
    if (memberships.length === 0) return [];

    // One grouped query rather than a count per conversation. Each
    // membership contributes its own watermark to the OR, so the
    // per-conversation `lastReadAt` semantics are preserved without a query
    // per thread — Home is the app's most-hit endpoint and runs on every
    // launch, so a fan-out here is felt everywhere.
    const grouped = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        senderId: { not: ctx.userId },
        OR: memberships.map((m) => ({
          conversationId: m.conversationId,
          ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
        })),
      },
      _count: { _all: true },
    });

    const total = grouped.reduce((sum, g) => sum + g._count._all, 0);
    if (total === 0) return [];

    const threads = grouped.length;

    return [
      {
        id: 'unread-messages',
        type: 'UNREAD_MESSAGES',
        priority: HOME_CARD_PRIORITY.UNREAD_MESSAGES,
        title:
          total === 1 ? 'You have a new message' : `${total} unread messages`,
        body:
          threads === 1
            ? 'In one conversation.'
            : `Across ${threads} conversations.`,
        accent: 'info',
        action: { label: 'Open inbox', route: '/messages' },
        dismissible: true,
        data: { kind: 'counts', count: total },
      },
    ];
  }
}
