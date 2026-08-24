import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConnectionStatus, OnboardingStep } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { blockBetween, connectionBetween } from '../common/relationship.util';
import { displayName } from '../common/display-name.util';
import { playerInclude, toPlayerSummary } from '../players/player.mapper';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async request(userId: string, addresseeId: string) {
    if (userId === addresseeId) {
      throw new BadRequestException('You cannot connect with yourself.');
    }

    const addressee = await this.prisma.user.findFirst({
      where: { id: addresseeId, onboardingStep: OnboardingStep.COMPLETE },
    });
    if (!addressee) {
      throw new NotFoundException('Player not found.');
    }

    const blocked = await this.prisma.block.findFirst({
      where: blockBetween(userId, addresseeId),
    });
    if (blocked) {
      throw new NotFoundException('Player not found.');
    }

    // A row may already exist in either direction — the unique constraint
    // only covers one, so check both before creating.
    const existing = await this.prisma.connection.findFirst({
      where: connectionBetween(userId, addresseeId),
    });

    if (existing) {
      if (existing.status === ConnectionStatus.ACCEPTED) {
        throw new BadRequestException("You're already connected.");
      }
      if (existing.status === ConnectionStatus.PENDING) {
        // They already asked us — treat this as accepting rather than
        // creating a second, mirrored pending request.
        if (existing.addresseeId === userId) {
          return this.respond(userId, existing.id, ConnectionStatus.ACCEPTED);
        }
        throw new BadRequestException('Request already sent.');
      }
      // Previously DECLINED — let it be re-sent by reviving the same row.
      const revived = await this.prisma.connection.update({
        where: { id: existing.id },
        data: {
          requesterId: userId,
          addresseeId,
          status: ConnectionStatus.PENDING,
          respondedAt: null,
        },
      });
      await this.notifyRequested(userId, addresseeId);
      return revived;
    }

    const created = await this.prisma.connection.create({
      data: { requesterId: userId, addresseeId },
    });
    await this.notifyRequested(userId, addresseeId);
    return created;
  }

  async respond(userId: string, id: string, status: ConnectionStatus) {
    const connection = await this.prisma.connection.findUnique({
      where: { id },
    });
    if (!connection) {
      throw new NotFoundException('Connection request not found.');
    }
    if (connection.addresseeId !== userId) {
      throw new ForbiddenException(
        'Only the recipient can respond to this request.',
      );
    }
    if (connection.status !== ConnectionStatus.PENDING) {
      throw new BadRequestException(
        'This request has already been responded to.',
      );
    }

    const updated = await this.prisma.connection.update({
      where: { id },
      data: { status, respondedAt: new Date() },
    });

    if (status === ConnectionStatus.ACCEPTED) {
      await this.notifyAccepted(connection.addresseeId, connection.requesterId);
    }

    return updated;
  }

  /** Cancels an outgoing request, declines nothing, or removes a connection. */
  async remove(userId: string, id: string) {
    const connection = await this.prisma.connection.findUnique({
      where: { id },
    });
    if (!connection) {
      throw new NotFoundException('Connection not found.');
    }
    if (
      connection.requesterId !== userId &&
      connection.addresseeId !== userId
    ) {
      throw new ForbiddenException('This is not your connection.');
    }

    await this.prisma.connection.delete({ where: { id } });
    return { removed: true };
  }

  /** Established connections, as player summaries the list screen can render. */
  async listAccepted(userId: string) {
    const connections = await this.prisma.connection.findMany({
      where: {
        status: ConnectionStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { include: playerInclude },
        addressee: { include: playerInclude },
      },
      orderBy: { respondedAt: 'desc' },
    });

    return {
      connections: connections.map((c) => {
        const other = c.requesterId === userId ? c.addressee : c.requester;
        return {
          connectionId: c.id,
          connectedAt: c.respondedAt,
          // Distance isn't computed here — the list is relationship-oriented,
          // and the profile screen recomputes it on open.
          player: toPlayerSummary(other, null),
        };
      }),
    };
  }

  async listPending(userId: string) {
    const pending = await this.prisma.connection.findMany({
      where: {
        status: ConnectionStatus.PENDING,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { include: playerInclude },
        addressee: { include: playerInclude },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      incoming: pending
        .filter((c) => c.addresseeId === userId)
        .map((c) => ({
          connectionId: c.id,
          requestedAt: c.createdAt,
          player: toPlayerSummary(c.requester, null),
        })),
      outgoing: pending
        .filter((c) => c.requesterId === userId)
        .map((c) => ({
          connectionId: c.id,
          requestedAt: c.createdAt,
          player: toPlayerSummary(c.addressee, null),
        })),
    };
  }

  // ---------------------------------------------------------------- notify

  private async notifyRequested(requesterId: string, addresseeId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { firstName: true, lastName: true },
    });
    if (!requester) return;
    await this.notifications.create(
      addresseeId,
      'CONNECTIONS',
      `${displayName(requester)} wants to connect`,
      'Review their request to accept or decline.',
      'CONNECTION',
      addresseeId,
    );
  }

  private async notifyAccepted(accepterId: string, requesterId: string) {
    const accepter = await this.prisma.user.findUnique({
      where: { id: accepterId },
      select: { firstName: true, lastName: true },
    });
    if (!accepter) return;
    await this.notifications.create(
      requesterId,
      'CONNECTIONS',
      `${displayName(accepter)} accepted your connection request`,
      "You're now connected.",
      'CONNECTION',
      requesterId,
    );
  }
}
