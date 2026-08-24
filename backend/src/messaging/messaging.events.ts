/** Socket.io event names, shared by the gateway and the Flutter client. */
export const SOCKET_EVENTS = {
  /** Server → client: a new message landed in a conversation you're in. */
  messageNew: 'message:new',
  /** Server → client: a match you participate in changed state. */
  matchUpdated: 'match:updated',
  /** Client → server: join/leave a conversation room explicitly. */
  conversationJoin: 'conversation:join',
  conversationLeave: 'conversation:leave',
} as const;

/** Room naming, kept in one place so gateway and service can't disagree. */
export const rooms = {
  conversation: (id: string) => `conversation:${id}`,
  user: (id: string) => `user:${id}`,
};

/**
 * System message types written into a match thread as the match moves
 * through `foundation/03-user-journeys.md` §4.2. These double as the
 * analytics event names in Doc 6 §5 (`match_challenge_sent`,
 * `match_time_proposed`, ...), so the two stay aligned.
 */
export type MatchSystemEvent =
  | 'match_challenge_sent'
  | 'match_challenge_accepted'
  | 'match_challenge_declined'
  | 'match_time_proposed'
  | 'match_time_accepted'
  | 'match_court_suggested'
  | 'match_confirmed'
  | 'match_rescheduled'
  | 'match_cancelled'
  | 'result_submitted'
  | 'result_confirmed'
  | 'result_disputed'
  | 'dispute_resolved'
  | 'fixture_scheduled'
  | 'fixture_unplayed_walkover';
