import { Connection, ConnectionStatus } from '@prisma/client';
import { ConnectionState } from '../players/player.mapper';

/** Matches a connection row between two users regardless of who asked whom. */
export function connectionBetween(userA: string, userB: string) {
  return {
    OR: [
      { requesterId: userA, addresseeId: userB },
      { requesterId: userB, addresseeId: userA },
    ],
  };
}

/** Matches a block in either direction — blocks are enforced symmetrically. */
export function blockBetween(userA: string, userB: string) {
  return {
    OR: [
      { blockerId: userA, blockedId: userB },
      { blockerId: userB, blockedId: userA },
    ],
  };
}

/** How `viewerId` stands relative to the connection row, from their side. */
export function connectionStateFor(
  viewerId: string,
  connection: Connection | null,
): ConnectionState {
  if (!connection) return 'NONE';
  if (connection.status === ConnectionStatus.ACCEPTED) return 'CONNECTED';
  if (connection.status === ConnectionStatus.PENDING) {
    return connection.requesterId === viewerId
      ? 'PENDING_OUTGOING'
      : 'PENDING_INCOMING';
  }
  // DECLINED behaves as no relationship — the requester may try again later.
  return 'NONE';
}
