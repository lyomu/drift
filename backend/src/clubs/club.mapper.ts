import { ClubMembershipStatus, Prisma } from '@prisma/client';
import { courtInclude, toCourtSummary } from '../courts/court.mapper';

export const clubInclude = {
  courts: { include: courtInclude },
} satisfies Prisma.ClubInclude;

export type ClubRecord = Prisma.ClubGetPayload<{
  include: typeof clubInclude;
}>;

export function toClubSummary(club: ClubRecord, distanceKm: number | null) {
  return {
    id: club.id,
    name: club.name,
    address: club.address,
    latitude: club.latitude,
    longitude: club.longitude,
    distanceKm,
    verificationStatus: club.verificationStatus,
    courtCount: club.courts.length,
  };
}

/**
 * Every field with no verified source is an explicit `null`, never omitted —
 * same "never fabricate" discipline as `courts/court.mapper.ts`. Embeds its
 * owned courts (may be an empty list — a club owning no court is a valid,
 * browsable profile, not an error).
 */
export function toClubProfile(
  club: ClubRecord,
  distanceKm: number | null,
  /** The viewer's own membership state, so Club Profile can render
   * Join / Requested / Leave. `null` means "not a member". */
  membershipStatus: ClubMembershipStatus | null = null,
) {
  return {
    ...toClubSummary(club, distanceKm),
    membershipStatus,
    description: club.description,
    phone: club.phone,
    website: club.website,
    sports: club.sports,
    amenities: club.amenities,
    openingHoursNote: club.openingHoursNote,
    photoUrls: club.photoUrls,
    courts: club.courts.map((court) => toCourtSummary(court, null)),
  };
}
