import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourtBookingType,
  CourtInquiryKind,
  CourtSurface,
  MatchSport,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { boundingBox, Coordinates, haversineKm } from '../common/distance.util';
import { buildCourtWhere } from './court-query';
import {
  CourtRecord,
  courtInclude,
  toCourtProfile,
  toCourtSummary,
} from './court.mapper';
import { SearchCourtsDto } from './dto/search-courts.dto';
import { ReportCourtDto } from './dto/report-court.dto';

export interface CourtGroupInput {
  sport?: MatchSport;
  surface: CourtSurface;
  indoor?: boolean;
  lighting?: boolean;
  count: number;
}

export interface CreateCourtInput {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  courtGroups: CourtGroupInput[];
}

export interface UpdateCourtInput {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  bookingType?: CourtBookingType;
  bookingUrl?: string;
  amenities?: string[];
  openingHoursNote?: string;
  isPublic?: boolean;
  photoUrls?: string[];
  courtGroups?: CourtGroupInput[];
}

const DEFAULT_TAKE = 20;

@Injectable()
export class CourtsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- reads

  private coordsOf(court: {
    latitude: number | null;
    longitude: number | null;
  }): Coordinates | null {
    return court.latitude !== null && court.longitude !== null
      ? { latitude: court.latitude, longitude: court.longitude }
      : null;
  }

  async search(dto: SearchCourtsDto) {
    const origin: Coordinates | null =
      dto.latitude !== undefined && dto.longitude !== undefined
        ? { latitude: dto.latitude, longitude: dto.longitude }
        : null;

    // Narrow to a bounding box in SQL when we can; exact haversine happens
    // in JS below. No PostGIS in this stack — same approach as players.
    const box =
      origin && dto.maxDistanceKm !== undefined
        ? boundingBox(origin, dto.maxDistanceKm)
        : undefined;

    const where = buildCourtWhere(
      {
        surfaces: dto.surfaces,
        sport: dto.sport,
        indoor: dto.indoor,
        lighting: dto.lighting,
        isPublic: dto.isPublic,
        hasBookingInfo: dto.hasBookingInfo,
        clubId: dto.clubId,
        independentOnly: dto.independentOnly,
        search: dto.search,
      },
      box,
    );

    const candidates = await this.prisma.court.findMany({
      where,
      include: courtInclude,
    });

    const withDistance = candidates.map((court) => {
      const coords = this.coordsOf(court);
      const distanceKm = origin && coords ? haversineKm(origin, coords) : null;
      return { court, distanceKm };
    });

    // Exact distance filter — the bounding box is a superset of the circle.
    const filtered = withDistance.filter(
      (row) =>
        dto.maxDistanceKm === undefined ||
        (row.distanceKm !== null && row.distanceKm <= dto.maxDistanceKm),
    );

    // Nearest first when we have an origin; otherwise stable name order.
    filtered.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    const skip = dto.skip ?? 0;
    const take = dto.take ?? DEFAULT_TAKE;

    return {
      total: filtered.length,
      courts: filtered
        .slice(skip, skip + take)
        .map((row) => toCourtSummary(row.court, row.distanceKm)),
    };
  }

  async findOne(id: string, viewerCoords?: Coordinates, viewerId?: string) {
    const court = await this.loadCourt(id);
    if (court.clubId) {
      await this.prisma.courtInquiry.create({
        data: {
          courtId: id,
          clubId: court.clubId,
          viewerId,
          kind: CourtInquiryKind.PROFILE_VIEW,
        },
      });
    }
    const coords = this.coordsOf(court);
    const distanceKm =
      viewerCoords && coords ? haversineKm(viewerCoords, coords) : null;
    return toCourtProfile(court, distanceKm);
  }

  async recordInquiry(
    courtId: string,
    viewerId: string,
    kind: CourtInquiryKind,
  ) {
    if (
      kind !== CourtInquiryKind.CONTACT &&
      kind !== CourtInquiryKind.BOOKING
    ) {
      throw new BadRequestException(
        'Only contact and booking inquiries can be recorded explicitly.',
      );
    }
    const court = await this.loadCourt(courtId);
    if (!court.clubId) return { recorded: false };
    await this.prisma.courtInquiry.create({
      data: { courtId, clubId: court.clubId, viewerId, kind },
    });
    return { recorded: true };
  }

  // ------------------------------------------------------------- actions

  async report(userId: string, courtId: string, dto: ReportCourtDto) {
    await this.loadCourt(courtId);

    const report = await this.prisma.courtReport.create({
      data: {
        courtId,
        reporterId: userId,
        reason: dto.reason,
        notes: dto.notes,
      },
    });

    return { reportId: report.id, status: report.status };
  }

  // -------------------------------------------------------- admin actions

  /** Phase M14 (Club Admin) — the first write path for Court, previously
   * seed-only since M9. `clubId` is trusted from the caller (the admin
   * controller resolves it from the authorized route, not the client). */
  async createForClub(clubId: string, input: CreateCourtInput) {
    const court = await this.prisma.court.create({
      data: {
        clubId,
        name: input.name,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
        courtGroups: {
          create: input.courtGroups.map((g) => ({
            sport: g.sport,
            surface: g.surface,
            indoor: g.indoor ?? false,
            lighting: g.lighting ?? false,
            count: g.count,
          })),
        },
      },
      include: courtInclude,
    });
    return toCourtProfile(court, null);
  }

  async updateForClub(clubId: string, id: string, input: UpdateCourtInput) {
    await this.requireCourtOwnedByClub(id, clubId);

    await this.prisma.$transaction(async (tx) => {
      await tx.court.update({
        where: { id },
        data: {
          name: input.name,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          phone: input.phone,
          website: input.website,
          bookingType: input.bookingType,
          bookingUrl: input.bookingUrl,
          amenities: input.amenities,
          openingHoursNote: input.openingHoursNote,
          isPublic: input.isPublic,
          photoUrls: input.photoUrls,
        },
      });
      // Whole-set replace, not a merge — simpler than diffing groups and
      // matches how the client naturally edits "the list of court groups"
      // as one unit (same idiom as onboarding's availability slots).
      if (input.courtGroups) {
        await tx.courtGroup.deleteMany({ where: { courtId: id } });
        await tx.courtGroup.createMany({
          data: input.courtGroups.map((g) => ({
            courtId: id,
            sport: g.sport,
            surface: g.surface,
            indoor: g.indoor ?? false,
            lighting: g.lighting ?? false,
            count: g.count,
          })),
        });
      }
    });

    const court = await this.loadCourt(id);
    return toCourtProfile(court, null);
  }

  /** Links an ownerless independent court to this club — the only way
   * this phase lets an admin touch a court outside their own club's. */
  async claimForClub(clubId: string, id: string) {
    const court = await this.loadCourt(id);
    if (court.clubId !== null) {
      throw new BadRequestException('This court already belongs to a club.');
    }
    await this.prisma.court.update({ where: { id }, data: { clubId } });
    return { claimed: true };
  }

  async listForClub(clubId: string) {
    const courts = await this.prisma.court.findMany({
      where: { clubId },
      include: courtInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { courts: courts.map((c) => toCourtSummary(c, null)) };
  }

  private async requireCourtOwnedByClub(id: string, clubId: string) {
    const court = await this.loadCourt(id);
    if (court.clubId !== clubId) {
      throw new NotFoundException('Court not found.');
    }
    return court;
  }

  // ---------------------------------------------------------------- helpers

  private async loadCourt(id: string): Promise<CourtRecord> {
    const court = await this.prisma.court.findUnique({
      where: { id },
      include: courtInclude,
    });
    if (!court) {
      throw new NotFoundException('Court not found.');
    }
    return court;
  }
}
