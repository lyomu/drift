import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';
import { SOCKET_EVENTS, rooms } from './messaging.events';

/**
 * Sits between the services that want to broadcast and the gateway that owns
 * the socket server. Without this indirection MessagingService and
 * MessagingGateway would depend on each other — the gateway needs the service
 * to resolve a user's rooms, and the service needs the gateway to emit.
 *
 * Broadcasts are deliberately fire-and-forget: a socket delivery failure must
 * never fail the HTTP request that caused it, because the data is already
 * committed and the client can still fetch it over REST.
 */
@Injectable()
export class RealtimePublisher {
  private readonly logger = new Logger(RealtimePublisher.name);
  private server: Server | null = null;

  /** Called by the gateway once socket.io has initialised. */
  setServer(server: Server) {
    this.server = server;
  }

  publishMessage(conversationId: string, message: unknown) {
    this.emit(
      rooms.conversation(conversationId),
      SOCKET_EVENTS.messageNew,
      message,
    );
  }

  /** Notifies every participant of a match that its state moved. */
  publishMatchUpdate(userIds: string[], payload: unknown) {
    for (const userId of userIds) {
      this.emit(rooms.user(userId), SOCKET_EVENTS.matchUpdated, payload);
    }
  }

  private emit(room: string, event: string, payload: unknown) {
    if (!this.server) {
      // Expected in unit tests and any context where the gateway isn't up.
      return;
    }
    try {
      this.server.to(room).emit(event, payload);
    } catch (error) {
      this.logger.warn(
        `Failed to emit ${event} to ${room}: ${(error as Error).message}`,
      );
    }
  }
}
