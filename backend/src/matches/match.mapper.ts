import { Prisma } from '@prisma/client';
import { playerInclude, toPlayerSummary } from '../players/player.mapper';
import { courtInclude, toCourtSummary } from '../courts/court.mapper';
import { MAX_PROPOSAL_ROUNDS, effectiveState } from './match-state';

export const matchInclude = {
  participants: {
    include: { user: { include: playerInclude } },
  },
  timeProposals: {
    include: { options: { orderBy: { startsAt: 'asc' as const } } },
    orderBy: { round: 'desc' as const },
  },
  conversation: { select: { id: true } },
  result: true,
  // Doc 6 §1's "competitionContext" hook — present only for fixture-
  // generated matches (Phase M8).
  fixture: {
    include: { round: { include: { season: { include: { league: true } } } } },
  },
  // Optional real-court link (Phase M9) — courtName/courtNote below stay
  // authoritative free text; this is populated only once a real court is
  // chosen via suggestCourt().
  court: { include: courtInclude },
} satisfies Prisma.MatchInclude;

export type MatchRecord = Prisma.MatchGetPayload<{
  include: typeof matchInclude;
}>;

/**
 * `state` is the *effective* state — expiry is derived on read (see
 * match-state.ts), so a lapsed challenge reads as EXPIRED even though the
 * stored row still says PROPOSED.
 */
export function toMatchDto(match: MatchRecord, viewerId: string) {
  const state = effectiveState(match);
  const latestProposal = match.timeProposals[0] ?? null;
  const viewer = match.participants.find((p) => p.userId === viewerId);

  return {
    id: match.id,
    sport: match.sport,
    format: match.format,
    state,
    createdById: match.createdById,
    confirmedTime: match.confirmedTime,
    courtName: match.courtName,
    courtNote: match.courtNote,
    court: match.court ? toCourtSummary(match.court, null) : null,
    proposalRound: match.proposalRound,
    roundsRemaining: Math.max(0, MAX_PROPOSAL_ROUNDS - match.proposalRound),
    expiresAt: match.expiresAt,
    cancelReason: match.cancelReason,
    conversationId: match.conversation?.id ?? null,
    createdAt: match.createdAt,

    // The viewer's own standing, so the client can pick the right actions
    // without re-deriving it from the participant list.
    viewerRole: viewer?.role ?? null,
    viewerStatus: viewer?.status ?? null,
    viewerSide: viewer?.side ?? null,

    participants: match.participants.map((p) => ({
      userId: p.userId,
      side: p.side,
      role: p.role,
      status: p.status,
      player: toPlayerSummary(p.user, null),
    })),

    latestProposal: latestProposal
      ? {
          id: latestProposal.id,
          round: latestProposal.round,
          status: latestProposal.status,
          proposedById: latestProposal.proposedById,
          acceptedOptionId: latestProposal.acceptedOptionId,
          options: latestProposal.options.map((o) => ({
            id: o.id,
            startsAt: o.startsAt,
          })),
        }
      : null,

    result: match.result
      ? {
          id: match.result.id,
          status: match.result.status,
          outcome: match.result.outcome,
          sets: match.result.sets,
          winningSide: match.result.winningSide,
          submittedById: match.result.submittedById,
          submittedAt: match.result.submittedAt,
          confirmedById: match.result.confirmedById,
          confirmedAt: match.result.confirmedAt,
          disputedById: match.result.disputedById,
          disputedAt: match.result.disputedAt,
          disputantOutcome: match.result.disputantOutcome,
          disputantSets: match.result.disputantSets,
          disputantWinningSide: match.result.disputantWinningSide,
          resolvedAt: match.result.resolvedAt,
          ratingDeltaA: match.result.ratingDeltaA,
          ratingDeltaB: match.result.ratingDeltaB,
        }
      : null,

    competitionContext: match.fixture
      ? {
          leagueId: match.fixture.round.season.league.id,
          leagueName: match.fixture.round.season.league.name,
          seasonId: match.fixture.round.season.id,
          seasonLabel: match.fixture.round.season.label,
          roundId: match.fixture.round.id,
          roundIndex: match.fixture.round.index,
        }
      : null,
  };
}
