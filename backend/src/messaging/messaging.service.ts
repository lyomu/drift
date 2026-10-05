import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConnectionStatus,
  ConversationType,
  MatchState,
  MessageKind,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { playerInclude, toPlayerSummary } from '../players/player.mapper';
import { displayName } from '../common/display-name.util';
import { blockBetween, connectionBetween } from '../common/relationship.util';
import { MatchSystemEvent } from './messaging.events';
import { RealtimePublisher } from './realtime.publisher';
import { NotificationsService } from '../notifications/notifications.service';

const DEFAULT_PAGE_SIZE = 30;

/** Match states that count as a challenge still in play between two players. */
const OPEN_CHALLENGE_STATES: MatchState[] = [
  MatchState.PROPOSED,
  MatchState.SCHEDULING,
  MatchState.SCHEDULED,
  MatchState.RESCHEDULED,
];
const NOTIFICATION_PREVIEW_LENGTH = 100;

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimePublisher,
    private readonly notifications: NotificationsService,
  ) {}

  /** Throws unless the user is a participant — thread membership is the ACL. */
  private async requireParticipant(conversationId: string, userId: string) {
    const membership = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('Conversation not found.');
    }
    return membership;
  }

  /** The conversation attached to a match, creating it if absent. */
  async ensureMatchConversation(
    matchId: string,
    userIds: string[],
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const existing = await tx.conversation.findUnique({ where: { matchId } });
    if (existing) return existing;

    return tx.conversation.create({
      data: {
        type: ConversationType.MATCH,
        matchId,
        participants: {
          create: userIds.map((userId) => ({ userId })),
        },
      },
    });
  }

  /**
   * The thread between the viewer and another player, for the profile's
   * message action. Allowed when a challenge is still open between them (the
   * match thread) or when they are connected (a direct thread). Anyone else is
   * refused, so the action only exists where the product allows talking.
   */
  async openWith(userId: string, otherId: string) {
    const blocked = await this.prisma.block.findFirst({
      where: blockBetween(userId, otherId),
    });
    if (blocked) {
      throw new NotFoundException('Player not found.');
    }

    const openMatch = await this.prisma.match.findFirst({
      where: {
        state: { in: OPEN_CHALLENGE_STATES },
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherId } } },
        ],
      },
      select: { id: true },
    });
    if (openMatch) {
      return this.ensureMatchConversation(openMatch.id, [userId, otherId]);
    }

    const connection = await this.prisma.connection.findFirst({
      where: connectionBetween(userId, otherId),
    });
    if (connection?.status !== ConnectionStatus.ACCEPTED) {
      throw new ForbiddenException('Connect or challenge before messaging.');
    }

    const direct = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.DIRECT,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherId } } },
        ],
      },
    });
    if (direct) return direct;

    return this.prisma.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        participants: { create: [{ userId }, { userId: otherId }] },
      },
    });
  }

  /** Adds late joiners (a doubles partner nominated after creation). */
  async addParticipants(
    conversationId: string,
    userIds: string[],
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    if (userIds.length === 0) return;
    await tx.conversationParticipant.createMany({
      data: userIds.map((userId) => ({ conversationId, userId })),
      skipDuplicates: true,
    });
  }

  /**
   * Writes a SYSTEM message into a match thread. Called by MatchesService on
   * every state transition, which is what makes the "match system messages"
   * in `foundation/04-screen-inventory.md` §A.9 real rather than decorative.
   */
  async writeSystemMessage(
    conversationId: string,
    body: string,
    systemEvent: MatchSystemEvent,
    relatedMatchId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const message = await tx.message.create({
      data: {
        conversationId,
        kind: MessageKind.SYSTEM,
        body,
        systemEvent,
        relatedMatchId,
      },
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    });
    return message;
  }

  async sendMessage(userId: string, conversationId: string, body: string) {
    await this.requireParticipant(conversationId, userId);

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          kind: MessageKind.TEXT,
          body,
        },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: created.createdAt },
      });
      // The sender has by definition read their own message.
      await tx.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { lastReadAt: created.createdAt },
      });
      return created;
    });

    this.realtime.publishMessage(conversationId, this.toMessageDto(message));
    await this.notifyOtherParticipants(conversationId, userId, body);
    return this.toMessageDto(message);
  }

  /**
   * Category MESSAGES, deliberately separate from MATCHES — a chatty match
   * thread shouldn't force muting challenge/round notifications too, and
   * vice versa.
   */
  private async notifyOtherParticipants(
    conversationId: string,
    senderId: string,
    body: string,
  ) {
    const [sender, others] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: senderId },
        select: { firstName: true, lastName: true },
      }),
      this.prisma.conversationParticipant.findMany({
        where: { conversationId, userId: { not: senderId } },
        select: { userId: true },
      }),
    ]);
    if (!sender) return;

    const preview =
      body.length > NOTIFICATION_PREVIEW_LENGTH
        ? `${body.slice(0, NOTIFICATION_PREVIEW_LENGTH)}…`
        : body;

    await Promise.all(
      others.map((p) =>
        this.notifications.create(
          p.userId,
          'MESSAGES',
          `New message from ${displayName(sender)}`,
          preview,
          'CONVERSATION',
          conversationId,
        ),
      ),
    );
  }

  async listConversations(userId: string) {
    const memberships = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              where: { userId: { not: userId } },
              include: { user: { include: playerInclude } },
            },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
    });

    const conversations = await Promise.all(
      memberships.map(async (m) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: m.conversationId,
            senderId: { not: userId },
            ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}),
          },
        });

        const lastMessage = m.conversation.messages[0];
        return {
          id: m.conversation.id,
          type: m.conversation.type,
          matchId: m.conversation.matchId,
          lastMessageAt: m.conversation.lastMessageAt,
          unreadCount,
          lastMessage: lastMessage ? this.toMessageDto(lastMessage) : null,
          participants: m.conversation.participants.map((p) =>
            toPlayerSummary(p.user, null),
          ),
        };
      }),
    );

    return { conversations };
  }

  async getMessages(
    userId: string,
    conversationId: string,
    before?: string,
    take = DEFAULT_PAGE_SIZE,
  ) {
    await this.requireParticipant(conversationId, userId);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    const relatedMatches = await this.relatedMatchContext(messages);
    const dto = messages
      .reverse()
      .map((m) =>
        this.toMessageDto(m, relatedMatches.get(m.relatedMatchId ?? '')),
      );

    // Returned oldest-first so the client can append without reversing.
    return { messages: dto };
  }

  async markRead(userId: string, conversationId: string) {
    await this.requireParticipant(conversationId, userId);
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
    return { read: true };
  }

  /** Conversation ids a user belongs to — the gateway's room subscriptions. */
  async conversationIdsFor(userId: string): Promise<string[]> {
    const memberships = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    return memberships.map((m) => m.conversationId);
  }

  private async relatedMatchContext(
    messages: { relatedMatchId: string | null }[],
  ): Promise<
    Map<
      string,
      {
        leagueId: string | null;
        leagueName: string | null;
      }
    >
  > {
    const matchIds = [
      ...new Set(
        messages
          .map((message) => message.relatedMatchId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (matchIds.length === 0) return new Map();

    const matches = await this.prisma.match.findMany({
      where: { id: { in: matchIds } },
      select: {
        id: true,
        fixture: {
          select: {
            round: {
              select: {
                league: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return new Map(
      matches.map((match) => [
        match.id,
        {
          leagueId: match.fixture?.round.league.id ?? null,
          leagueName: match.fixture?.round.league.name ?? null,
        },
      ]),
    );
  }

  private toMessageDto(
    message: {
      id: string;
      conversationId: string;
      senderId: string | null;
      kind: MessageKind;
      body: string;
      systemEvent: string | null;
      relatedMatchId: string | null;
      createdAt: Date;
    },
    related?: { leagueId: string | null; leagueName: string | null },
  ) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      kind: message.kind,
      body: message.body,
      systemEvent: message.systemEvent,
      relatedMatchId: message.relatedMatchId,
      relatedLeagueId: related?.leagueId ?? null,
      relatedLeagueName: related?.leagueName ?? null,
      createdAt: message.createdAt,
    };
  }
}
