import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { MessagingService } from './messaging.service';
import { RealtimePublisher } from './realtime.publisher';
import { SOCKET_EVENTS, rooms } from './messaging.events';

interface AuthedSocket extends Socket {
  userId?: string;
}

/**
 * Chat transport. Authentication reuses the same `JWT_SECRET` and payload
 * shape as the HTTP guard (`auth/strategies/jwt.strategy.ts`) — one secret,
 * one notion of identity, so a token that works for REST works here.
 *
 * CORS is open to match `main.ts`; tighten both together before production.
 *
 * Horizontally scalable as of Wave 3: `afterInit` swaps socket.io's default
 * in-memory adapter for the Redis one, so a broadcast from any API instance
 * reaches clients connected to every other. Falls back to in-memory if Redis
 * is unreachable rather than refusing to boot — a single instance still works
 * fine without it, and failing startup over an optional dependency would be
 * worse than the degraded mode.
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MessagingGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly messaging: MessagingService,
    private readonly realtime: RealtimePublisher,
  ) {}

  async afterInit(server: Server) {
    this.realtime.setServer(server);
    await this.useRedisAdapter(server);
  }

  /**
   * Best-effort. `REDIS_URL` unset means "single instance, don't bother";
   * an unreachable Redis logs a warning and leaves the in-memory adapter in
   * place, which is correct behaviour for one process.
   */
  private async useRedisAdapter(server: Server) {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.log(
        'REDIS_URL not set — using the in-memory adapter (single instance only).',
      );
      return;
    }

    try {
      const pubClient = createClient({ url });
      const subClient = pubClient.duplicate();
      // Both connections are required before the adapter can be built.
      await Promise.all([pubClient.connect(), subClient.connect()]);
      server.adapter(createAdapter(pubClient, subClient));
      this.logger.log('Socket.io is using the Redis adapter.');
    } catch (error) {
      // node-redis surfaces connection refusals as an AggregateError whose
      // `message` is empty, so fall through to the type name rather than
      // logging an unhelpful empty parenthetical.
      const reason =
        (error instanceof Error && (error.message || error.name)) ||
        String(error);
      this.logger.warn(
        `Redis adapter unavailable (${reason}) — falling back to the in-memory adapter. Broadcasts will not cross API instances.`,
      );
    }
  }

  async handleConnection(client: AuthedSocket) {
    const token = this.tokenFrom(client);
    if (!token) {
      this.reject(client, 'Missing auth token');
      return;
    }

    let userId: string;
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      userId = payload.sub;
    } catch {
      this.reject(client, 'Invalid auth token');
      return;
    }

    client.userId = userId;
    // A per-user room lets match updates reach someone who doesn't have the
    // relevant thread open.
    await client.join(rooms.user(userId));

    const conversationIds = await this.messaging.conversationIdsFor(userId);
    if (conversationIds.length > 0) {
      // join() takes an array — the default adapter resolves synchronously.
      await client.join(conversationIds.map((id) => rooms.conversation(id)));
    }
  }

  handleDisconnect(client: AuthedSocket) {
    if (client.userId) {
      this.logger.debug(`Socket disconnected for user ${client.userId}`);
    }
  }

  /**
   * Explicit join, for a conversation created after the socket connected
   * (a challenge received mid-session).
   */
  @SubscribeMessage(SOCKET_EVENTS.conversationJoin)
  async joinConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    if (!client.userId || !body?.conversationId) return { joined: false };

    // Membership is re-checked here — a client must not be able to join an
    // arbitrary room just by naming it.
    const allowed = await this.messaging.conversationIdsFor(client.userId);
    if (!allowed.includes(body.conversationId)) {
      return { joined: false };
    }

    await client.join(rooms.conversation(body.conversationId));
    return { joined: true };
  }

  @SubscribeMessage(SOCKET_EVENTS.conversationLeave)
  async leaveConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId?: string },
  ) {
    if (!body?.conversationId) return { left: false };
    await client.leave(rooms.conversation(body.conversationId));
    return { left: true };
  }

  /** Accepts the token from `auth.token` or an `Authorization: Bearer` header. */
  private tokenFrom(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    if (fromAuth) {
      return fromAuth.replace(/^Bearer\s+/i, '');
    }
    const header = client.handshake.headers.authorization;
    if (header) {
      return header.replace(/^Bearer\s+/i, '');
    }
    return null;
  }

  private reject(client: Socket, reason: string) {
    client.emit('error', { message: reason });
    client.disconnect(true);
  }
}
