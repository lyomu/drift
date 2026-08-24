import { Prisma, CourtSurface, MatchSport } from '@prisma/client';
import { BoundingBox } from '../common/distance.util';

export interface CourtQueryFilters {
  surfaces?: CourtSurface[];
  sport?: MatchSport;
  indoor?: boolean;
  lighting?: boolean;
  isPublic?: boolean;
  hasBookingInfo?: boolean;
  clubId?: string;
  independentOnly?: boolean;
  /** Case-insensitive substring match on name — Doc 4 §A.6 lists "Search" as
   * a primary action on the Court Finder Hub alongside filters. */
  search?: string;
}

/**
 * Builds the Prisma where-clause for court search from whatever filters the
 * caller actually supplied. `=== undefined` checks throughout (not `??`) so
 * an explicit `false` for indoor/lighting survives instead of being treated
 * as "unset" — same discipline the fixture builders in this codebase's specs
 * use for the equivalent problem.
 */
export function buildCourtWhere(
  filters: CourtQueryFilters,
  box?: BoundingBox,
): Prisma.CourtWhereInput {
  const where: Prisma.CourtWhereInput = {};

  if (box) {
    where.latitude = { gte: box.minLatitude, lte: box.maxLatitude };
    where.longitude = { gte: box.minLongitude, lte: box.maxLongitude };
  }

  if (filters.isPublic !== undefined) {
    where.isPublic = filters.isPublic;
  }

  if (filters.hasBookingInfo) {
    where.bookingType = { not: 'UNKNOWN' };
  }

  if (filters.independentOnly) {
    where.clubId = null;
  } else if (filters.clubId !== undefined) {
    where.clubId = filters.clubId;
  }

  if (filters.search) {
    where.name = { contains: filters.search, mode: 'insensitive' };
  }

  const groupFilter: Prisma.CourtGroupWhereInput = {};
  if (filters.sport !== undefined) {
    groupFilter.sport = filters.sport;
  }
  if (filters.surfaces !== undefined && filters.surfaces.length > 0) {
    groupFilter.surface = { in: filters.surfaces };
  }
  if (filters.indoor !== undefined) {
    groupFilter.indoor = filters.indoor;
  }
  if (filters.lighting !== undefined) {
    groupFilter.lighting = filters.lighting;
  }
  if (Object.keys(groupFilter).length > 0) {
    where.courtGroups = { some: groupFilter };
  }

  return where;
}
