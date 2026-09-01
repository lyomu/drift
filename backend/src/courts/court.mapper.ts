import { Prisma } from '@prisma/client';

/**
 * Everything the court endpoints load. Kept here so the list and detail
 * endpoints can't drift on what they read — and, by extension, on what they
 * expose.
 */
export const courtInclude = {
  courtGroups: true,
  club: { select: { id: true, name: true, verificationStatus: true } },
} satisfies Prisma.CourtInclude;

export type CourtRecord = Prisma.CourtGetPayload<{
  include: typeof courtInclude;
}>;

const SURFACE_LABEL: Record<string, string> = {
  HARD: 'Hard',
  CLAY: 'Clay',
  GRASS: 'Grass',
  ARTIFICIAL_GRASS: 'Artificial Grass',
};

/** e.g. ["6 Hard", "2 Clay"] — one entry per court group. */
function surfaceSummaries(court: CourtRecord): string[] {
  return court.courtGroups.map(
    (g) => `${g.count} ${SURFACE_LABEL[g.surface] ?? g.surface}`,
  );
}

/**
 * Courts are public venues, not private individuals — unlike
 * `players/player.mapper.ts`'s `distanceBand`, a court exposes its exact
 * coordinates and a precise distance, per
 * `foundation/06-domain-technical-architecture.md` §1's Court Map/pins
 * requirement. This is a deliberate divergence from the player-privacy
 * banding rule, not an oversight.
 */
export function toCourtSummary(court: CourtRecord, distanceKm: number | null) {
  return {
    id: court.id,
    name: court.name,
    address: court.address,
    latitude: court.latitude,
    longitude: court.longitude,
    distanceKm,
    surfaces: surfaceSummaries(court),
    indoorAvailable: court.courtGroups.some((g) => g.indoor),
    outdoorAvailable: court.courtGroups.some((g) => !g.indoor),
    verificationStatus: court.verificationStatus,
    bookingType: court.bookingType,
    clubId: court.club?.id ?? null,
    clubName: court.club?.name ?? null,
  };
}

export type CourtSummary = ReturnType<typeof toCourtSummary>;

/**
 * Full profile. Every field with no verified source is built as an explicit
 * `null` (never omitted, never guessed) — this is where
 * `foundation/06-domain-technical-architecture.md` §2's "never fabricate"
 * business rule is enforced in exactly one place, same discipline
 * `players/player.mapper.ts` uses for privacy gating.
 */
export function toCourtProfile(court: CourtRecord, distanceKm: number | null) {
  return {
    ...toCourtSummary(court, distanceKm),
    phone: court.phone,
    website: court.website,
    mapsUrl: court.mapsUrl,
    bookingUrl: court.bookingType === 'EXTERNAL_LINK' ? court.bookingUrl : null,
    amenities: court.amenities,
    openingHoursNote: court.openingHoursNote,
    isPublic: court.isPublic,
    photoUrls: court.photoUrls,
    googlePlacesRef: court.googlePlacesRef,
    googlePlacesSyncStatus: court.googlePlacesSyncStatus,
    googlePlacesSyncedAt: court.googlePlacesSyncedAt,
    googlePlacesSyncError: court.googlePlacesSyncError,
    courtGroups: court.courtGroups.map((g) => ({
      id: g.id,
      sport: g.sport,
      surface: g.surface,
      indoor: g.indoor,
      lighting: g.lighting,
      count: g.count,
    })),
    club: court.club
      ? {
          id: court.club.id,
          name: court.club.name,
          verificationStatus: court.club.verificationStatus,
        }
      : null,
  };
}
