import { Prisma } from '@prisma/client';
import { labelForLevel } from '../common/level-label.util';
import { availabilitySummary } from '../common/availability-summary.util';
import { distanceBand } from '../common/distance.util';
import { PlayerStats } from '../matches/stats.util';

/**
 * Everything the player endpoints load. Kept here so the list and detail
 * endpoints can't drift on what they read — and, by extension, on what they
 * expose.
 */
export const playerInclude = {
  tennisProfile: {
    include: {
      availabilitySlots: true,
      assessmentSessions: {
        where: { status: 'COMPLETED' as const },
        orderBy: { completedAt: 'desc' as const },
        take: 1,
      },
    },
  },
  // Phase M13 — not read by any mapper in this file (Tennis-only), just
  // along for the ride so `matches/results.service.ts` can read a Padel
  // match participant's rating without a second query. See its `settle()`.
  padelProfile: true,
} satisfies Prisma.UserInclude;

export type PlayerRecord = Prisma.UserGetPayload<{
  include: typeof playerInclude;
}>;

export type ConnectionState =
  'NONE' | 'PENDING_OUTGOING' | 'PENDING_INCOMING' | 'CONNECTED';

/** The level a player presents as — their own choice wins over the system's. */
export function effectiveLevel(player: PlayerRecord): number | null {
  return (
    player.tennisProfile?.userSelectedLevel ??
    player.tennisProfile?.systemSuggestedLevel ??
    null
  );
}

/**
 * Public-safe summary for discovery lists. Deliberately excludes
 * coordinates, email, phone, and the full availability calendar — see
 * `foundation/06-domain-technical-architecture.md` §4.
 */
export function toPlayerSummary(
  player: PlayerRecord,
  distanceKm: number | null,
) {
  const profile = player.tennisProfile;
  const level = effectiveLevel(player);

  return {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    photoUrl: player.photoUrl,
    level,
    levelLabel: level === null ? null : labelForLevel(level),
    generalLocation: profile?.generalLocation ?? null,
    distanceBand: distanceBand(distanceKm),
    preferredClubName: profile?.preferredClubName ?? null,
    formatPreference: profile?.formatPreference ?? null,
    stylePreference: profile?.stylePreference ?? null,
    availabilitySummary: availabilitySummary(profile?.availabilitySlots ?? []),
  };
}

/**
 * Full profile. Development areas and the detailed availability grid are
 * gated per the owner's Privacy Settings (Phase M12) — `EVERYONE` shows
 * them to anyone, `CONNECTIONS_ONLY` (the default) requires
 * `connectionState === 'CONNECTED'` — per
 * `foundation/06-domain-technical-architecture.md` §4.
 */
export function toPlayerProfile(
  player: PlayerRecord,
  distanceKm: number | null,
  connectionState: ConnectionState,
  // Computed by the caller via matches/stats.util.ts — a mapper doesn't run
  // its own DB queries. Not gated by connectionState: ratings/stats aren't
  // in Doc 6 §4's privacy-sensitive list the way skill breakdown is.
  stats: PlayerStats,
) {
  const profile = player.tennisProfile;
  const isConnected = connectionState === 'CONNECTED';
  const canSeeSkillBreakdown =
    profile?.skillBreakdownVisibility === 'EVERYONE' || isConnected;
  const canSeeAvailability =
    profile?.availabilityVisibility === 'EVERYONE' || isConnected;

  const latestSession = profile?.assessmentSessions[0];
  const skillBreakdown =
    canSeeSkillBreakdown && latestSession?.resultSkillBreakdown
      ? (latestSession.resultSkillBreakdown as Record<string, number>)
      : null;

  return {
    ...toPlayerSummary(player, distanceKm),
    dominantHand: profile?.dominantHand ?? null,
    connectionState,
    stats,
    // Gated fields. `null` here means "not visible to you", which the client
    // renders as a connect-to-see prompt rather than an empty state.
    skillBreakdown,
    availabilitySlots: canSeeAvailability
      ? (profile?.availabilitySlots ?? []).map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          timeBlock: slot.timeBlock,
        }))
      : null,
  };
}
