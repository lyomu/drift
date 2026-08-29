import type { toMatchDto } from '../matches/match.mapper';
import type { toPlayerSummary } from '../players/player.mapper';
import type { toCourtSummary } from '../courts/court.mapper';

/**
 * The Home feed's card contract — `foundation/04-screen-inventory.md` §A.3.
 *
 * Home answers "What should I do next?", so a card is a *prompt*, not a
 * summary: every card carries an `action` the client can route to, an
 * `accent` that says how loudly to render it, and (for rich types) a typed
 * `data` payload so the client can reuse the real design-system widget for
 * that entity instead of rendering yet another title/body block.
 *
 * Card ordering is by `priority` ascending. The numbers are spaced in tens so
 * a new card type can slot between two existing ones without renumbering.
 */
export type HomeCardType =
  // Tier 1 — time-sensitive, something is waiting on this user.
  | 'UNCONFIRMED_RESULT'
  | 'INCOMING_CHALLENGE'
  | 'LEAGUE_ROUND_DEADLINE'
  | 'UPCOMING_MATCH'
  | 'PENDING_CONNECTION'
  | 'UNREAD_MESSAGES'
  // Tier 2 — discovery, shown when nothing urgent is outstanding.
  | 'SUGGESTED_OPPONENTS'
  | 'DEVELOPMENT_RECOMMENDATION'
  | 'NEARBY_COURTS'
  | 'CLUB_ANNOUNCEMENT'
  // Deliberately *progress*, not "recently earned": achievements are derived
  // on read from a rule catalogue with no `earnedAt` column, so recency
  // isn't representable without fabricating it. See the contributor.
  | 'ACHIEVEMENT_PROGRESS'
  | 'NEWS_HIGHLIGHT'
  | 'PADEL_PROMPT'
  // Shown only when literally nothing else qualifies.
  | 'EMPTY_FALLBACK';

/**
 * How loudly to render a card. `urgent` is reserved for cards with a real
 * deadline attached (a result awaiting confirmation, a round about to force a
 * walkover) — if everything is urgent, nothing is.
 */
export type HomeCardAccent = 'urgent' | 'info' | 'success' | 'neutral';

export interface HomeCardAction {
  label: string;
  /** A client route, matching `mobile/lib/core/router/app_router.dart`. */
  route: string;
}

type MatchDto = ReturnType<typeof toMatchDto>;
type PlayerSummary = ReturnType<typeof toPlayerSummary>;
type CourtSummary = ReturnType<typeof toCourtSummary>;

/**
 * Typed payloads for cards the client renders with a real widget rather than
 * as text. Reusing the existing DTO return types (rather than redeclaring
 * shapes here) means a change to `toMatchDto`/`toPlayerSummary` can't silently
 * desync the Home feed from the rest of the API.
 */
export type HomeCardData =
  | { kind: 'match'; match: MatchDto }
  | { kind: 'players'; players: PlayerSummary[] }
  | { kind: 'courts'; courts: CourtSummary[] }
  | {
      kind: 'story';
      storyId: string;
      headline: string;
      imageUrl: string | null;
    }
  | { kind: 'content'; contentId: string; contentType: string; title: string }
  | { kind: 'announcement'; clubId: string; clubName: string; postId: string }
  | {
      kind: 'achievement';
      earnedCount: number;
      totalCount: number;
      nextTitle: string | null;
      nextIcon: string | null;
    }
  | { kind: 'counts'; count: number };

export interface HomeCard {
  /**
   * Stable across refreshes for a given subject, because it doubles as the
   * dismissal key — dismissing "the challenge from Alice" must stay dismissed
   * when the feed is rebuilt, so ids embed the entity id rather than an index.
   */
  id: string;
  type: HomeCardType;
  priority: number;
  title: string;
  body: string;
  accent: HomeCardAccent;
  action: HomeCardAction | null;
  /**
   * Whether the user may dismiss/snooze this card. Cards representing a real
   * obligation to another player (an unconfirmed result, an incoming
   * challenge) are deliberately not dismissible — hiding them would strand
   * the other side.
   */
  dismissible: boolean;
  data: HomeCardData | null;
}

/**
 * Priority bands. Tier 1 occupies 10-99 so every urgent card outranks every
 * discovery card no matter how the two sets grow.
 */
export const HOME_CARD_PRIORITY: Record<HomeCardType, number> = {
  UNCONFIRMED_RESULT: 10,
  INCOMING_CHALLENGE: 20,
  LEAGUE_ROUND_DEADLINE: 30,
  UPCOMING_MATCH: 40,
  PENDING_CONNECTION: 50,
  UNREAD_MESSAGES: 60,

  SUGGESTED_OPPONENTS: 100,
  DEVELOPMENT_RECOMMENDATION: 110,
  NEARBY_COURTS: 120,
  CLUB_ANNOUNCEMENT: 130,
  ACHIEVEMENT_PROGRESS: 140,
  NEWS_HIGHLIGHT: 150,
  PADEL_PROMPT: 160,

  EMPTY_FALLBACK: 999,
};
