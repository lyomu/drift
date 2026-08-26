import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CourtBookingType,
  ListingVerificationStatus,
  Prisma,
  VenueDuplicateDecisionType,
  VenuePlacesSyncStatus,
  VenueVerificationRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { haversineKm } from '../common/distance.util';
import { AuditService } from './audit.service';
import {
  BulkVenueActionDto,
  MergeVenuesDto,
  ReviewVenueVerificationDto,
  UpsertPlatformVenueDto,
  VenuePairDto,
} from './dto/venue-admin.dto';

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1_000;

const venueInclude = {
  courtGroups: true,
  club: { select: { id: true, name: true, verificationStatus: true } },
  _count: { select: { matches: true, reports: true, inquiries: true } },
} satisfies Prisma.CourtInclude;

type VenueRecord = Prisma.CourtGetPayload<{ include: typeof venueInclude }>;

type DuplicateCandidateVenue = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  club: VenueRecord['club'];
  googlePlacesRef: string | null;
  verificationStatus: ListingVerificationStatus;
  courtGroups: VenueRecord['courtGroups'];
  counts: VenueRecord['_count'];
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  error?: { message?: string };
};

@Injectable()
export class VenueAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async clubOptions() {
    return {
      clubs: await this.prisma.club.findMany({
        select: { id: true, name: true, verificationStatus: true },
        orderBy: { name: 'asc' },
        take: 1000,
      }),
    };
  }

  async list(query: {
    search?: string;
    verification?: string;
    placesSync?: string;
    clubId?: string;
    take?: number;
    skip?: number;
  }) {
    const where: Prisma.CourtWhereInput = {
      AND: [
        query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { address: { contains: query.search, mode: 'insensitive' } },
                {
                  googlePlacesRef: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
                {
                  club: {
                    name: { contains: query.search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {},
        query.verification
          ? {
              verificationStatus:
                query.verification as ListingVerificationStatus,
            }
          : {},
        query.clubId ? { clubId: query.clubId } : {},
        this.placesWhere(query.placesSync),
      ],
    };
    const [venues, total] = await this.prisma.$transaction([
      this.prisma.court.findMany({
        where,
        include: venueInclude,
        orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
        take: Math.min(Math.max(query.take ?? 50, 1), 200),
        skip: Math.max(query.skip ?? 0, 0),
      }),
      this.prisma.court.count({ where }),
    ]);
    return { total, venues: venues.map((venue) => this.toVenue(venue)) };
  }

  async detail(id: string) {
    return { venue: this.toVenue(await this.requireVenue(id)) };
  }

  async create(actorId: string, dto: UpsertPlatformVenueDto) {
    await this.validateVenueInput(dto);
    const venue = await this.prisma.court.create({
      data: {
        name: dto.name.trim(),
        address: this.clean(dto.address),
        latitude: dto.latitude,
        longitude: dto.longitude,
        clubId: dto.clubId || null,
        phone: this.clean(dto.phone),
        website: this.clean(dto.website),
        bookingType: dto.bookingType,
        bookingUrl:
          dto.bookingType === CourtBookingType.EXTERNAL_LINK
            ? this.clean(dto.bookingUrl)
            : null,
        amenities: this.cleanList(dto.amenities),
        openingHoursNote: this.clean(dto.openingHoursNote),
        isPublic: dto.isPublic,
        photoUrls: this.cleanList(dto.photoUrls),
        googlePlacesRef: this.clean(dto.googlePlacesRef),
        googlePlacesSyncStatus: VenuePlacesSyncStatus.STALE,
        verificationStatus: dto.verificationStatus,
        courtGroups: { create: dto.courtGroups },
      },
      include: venueInclude,
    });
    await this.audit.record(actorId, 'venue.create', 'Court', venue.id, {
      name: venue.name,
      clubId: venue.clubId,
    });
    return { venue: this.toVenue(venue) };
  }

  async update(actorId: string, id: string, dto: UpsertPlatformVenueDto) {
    const existing = await this.requireVenue(id);
    await this.validateVenueInput(dto);
    const nextPlacesRef = this.clean(dto.googlePlacesRef);
    const placesRefChanged = nextPlacesRef !== existing.googlePlacesRef;

    await this.prisma.$transaction(async (tx) => {
      await tx.court.update({
        where: { id },
        data: {
          name: dto.name.trim(),
          address: this.clean(dto.address),
          latitude: dto.latitude,
          longitude: dto.longitude,
          clubId: dto.clubId || null,
          phone: this.clean(dto.phone),
          website: this.clean(dto.website),
          bookingType: dto.bookingType,
          bookingUrl:
            dto.bookingType === CourtBookingType.EXTERNAL_LINK
              ? this.clean(dto.bookingUrl)
              : null,
          amenities: this.cleanList(dto.amenities),
          openingHoursNote: this.clean(dto.openingHoursNote),
          isPublic: dto.isPublic,
          photoUrls: this.cleanList(dto.photoUrls),
          googlePlacesRef: nextPlacesRef,
          verificationStatus: dto.verificationStatus,
          ...(placesRefChanged
            ? {
                googlePlacesSyncStatus: VenuePlacesSyncStatus.STALE,
                googlePlacesSyncedAt: null,
                googlePlacesSyncError: null,
              }
            : {}),
        },
      });
      await tx.courtGroup.deleteMany({ where: { courtId: id } });
      if (dto.courtGroups.length > 0) {
        await tx.courtGroup.createMany({
          data: dto.courtGroups.map((group) => ({ courtId: id, ...group })),
        });
      }
    });
    await this.audit.record(actorId, 'venue.update', 'Court', id, {
      previousName: existing.name,
      placesRefChanged,
    });
    return this.detail(id);
  }

  async bulk(actorId: string, dto: BulkVenueActionDto) {
    if (dto.ids.length === 0)
      throw new BadRequestException('Select at least one venue.');
    const found = await this.prisma.court.count({
      where: { id: { in: dto.ids } },
    });
    if (found !== dto.ids.length)
      throw new NotFoundException('One or more venues no longer exist.');
    const data: Prisma.CourtUpdateManyMutationInput =
      dto.action === 'VERIFY'
        ? { verificationStatus: ListingVerificationStatus.VERIFIED }
        : dto.action === 'UNVERIFY'
          ? { verificationStatus: ListingVerificationStatus.UNVERIFIED }
          : {
              googlePlacesSyncStatus: VenuePlacesSyncStatus.STALE,
              googlePlacesSyncError: null,
            };
    const result = await this.prisma.court.updateMany({
      where: { id: { in: dto.ids } },
      data,
    });
    await this.audit.record(
      actorId,
      `venue.bulk.${dto.action.toLowerCase()}`,
      'CourtBatch',
      dto.ids.join(','),
      {
        ids: dto.ids,
        count: result.count,
      },
    );
    return { updated: result.count };
  }

  async placesSyncStatus() {
    const venues = await this.prisma.court.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        googlePlacesRef: true,
        googlePlacesSyncStatus: true,
        googlePlacesSyncedAt: true,
        googlePlacesSyncError: true,
      },
      orderBy: [{ googlePlacesSyncStatus: 'asc' }, { name: 'asc' }],
    });
    const rows = venues.map((venue) => ({
      ...venue,
      syncStatus: this.effectivePlacesStatus(venue),
    }));
    const latestSuccess = rows
      .map((row) => row.googlePlacesSyncedAt)
      .filter((value): value is Date => value !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return {
      integration: {
        configured: Boolean(this.config.get<string>('GOOGLE_PLACES_API_KEY')),
        latestSuccess: latestSuccess ?? null,
        counts: {
          synced: rows.filter(
            (row) => row.syncStatus === VenuePlacesSyncStatus.SYNCED,
          ).length,
          stale: rows.filter(
            (row) => row.syncStatus === VenuePlacesSyncStatus.STALE,
          ).length,
          failed: rows.filter(
            (row) => row.syncStatus === VenuePlacesSyncStatus.FAILED,
          ).length,
        },
      },
      venues: rows,
    };
  }

  async forcePlacesSync(actorId: string, id: string) {
    const venue = await this.requireVenue(id);
    if (!venue.googlePlacesRef) {
      return this.recordPlacesFailure(
        actorId,
        venue,
        'Add a Google Places reference before syncing.',
      );
    }
    const apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return this.recordPlacesFailure(
        actorId,
        venue,
        'GOOGLE_PLACES_API_KEY is not configured.',
      );
    }

    const placeId = venue.googlePlacesRef.replace(/^places\//, '');
    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
        {
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'id,displayName,formattedAddress,location,nationalPhoneNumber,websiteUri,regularOpeningHours',
          },
          signal: AbortSignal.timeout(8_000),
        },
      );
      const body = (await response.json()) as GooglePlace;
      if (!response.ok) {
        throw new Error(
          body.error?.message ??
            `Google Places returned HTTP ${response.status}.`,
        );
      }

      const updated = await this.prisma.court.update({
        where: { id },
        data: {
          name: body.displayName?.text?.trim() || venue.name,
          address: body.formattedAddress?.trim() || venue.address,
          latitude: body.location?.latitude ?? venue.latitude,
          longitude: body.location?.longitude ?? venue.longitude,
          phone: body.nationalPhoneNumber?.trim() || venue.phone,
          website: body.websiteUri?.trim() || venue.website,
          openingHoursNote:
            body.regularOpeningHours?.weekdayDescriptions?.join('; ') ||
            venue.openingHoursNote,
          googlePlacesSyncStatus: VenuePlacesSyncStatus.SYNCED,
          googlePlacesSyncedAt: new Date(),
          googlePlacesSyncError: null,
        },
        include: venueInclude,
      });
      await this.audit.record(actorId, 'venue.places.sync', 'Court', id, {
        googlePlacesRef: venue.googlePlacesRef,
      });
      return {
        venue: this.toVenue(updated),
        status: VenuePlacesSyncStatus.SYNCED,
      };
    } catch (error) {
      return this.recordPlacesFailure(
        actorId,
        venue,
        error instanceof Error
          ? error.message.slice(0, 1000)
          : 'Google Places sync failed.',
      );
    }
  }

  async verificationRequests(status?: string) {
    const requests = await this.prisma.venueVerificationRequest.findMany({
      where: status
        ? { status: status as VenueVerificationRequestStatus }
        : undefined,
      include: {
        club: {
          select: {
            id: true,
            name: true,
            description: true,
            address: true,
            latitude: true,
            longitude: true,
            phone: true,
            website: true,
            verificationStatus: true,
            _count: { select: { courts: true, memberships: true } },
          },
        },
        submittedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { requests };
  }

  async reviewVerification(
    actorId: string,
    requestId: string,
    dto: ReviewVenueVerificationDto,
  ) {
    const request = await this.prisma.venueVerificationRequest.findUnique({
      where: { id: requestId },
      include: { club: true },
    });
    if (!request)
      throw new NotFoundException('Verification request not found.');
    if (request.status !== VenueVerificationRequestStatus.PENDING) {
      throw new BadRequestException(
        'This verification request has already been reviewed.',
      );
    }
    if (dto.action !== 'APPROVE' && !dto.note?.trim()) {
      throw new BadRequestException(
        'Add a reason or information request before continuing.',
      );
    }
    const status =
      dto.action === 'APPROVE'
        ? VenueVerificationRequestStatus.APPROVED
        : dto.action === 'REJECT'
          ? VenueVerificationRequestStatus.REJECTED
          : VenueVerificationRequestStatus.MORE_INFO;
    const clubStatus =
      dto.action === 'APPROVE'
        ? ListingVerificationStatus.VERIFIED
        : ListingVerificationStatus.UNVERIFIED;
    const reviewed = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.venueVerificationRequest.update({
        where: { id: requestId },
        data: {
          status,
          decisionNote: dto.note?.trim() || null,
          reviewedById: actorId,
          reviewedAt: new Date(),
        },
      });
      await tx.club.update({
        where: { id: request.clubId },
        data: { verificationStatus: clubStatus },
      });
      return updated;
    });
    await this.audit.record(
      actorId,
      `venue.verification.${dto.action.toLowerCase()}`,
      'VenueVerificationRequest',
      requestId,
      {
        clubId: request.clubId,
        note: dto.note?.trim() || null,
      },
    );
    return { request: reviewed, clubVerificationStatus: clubStatus };
  }

  async duplicateCandidates() {
    const [venues, decisions] = await Promise.all([
      this.prisma.court.findMany({
        include: venueInclude,
        orderBy: { name: 'asc' },
        take: 1000,
      }),
      this.prisma.venueDuplicateDecision.findMany({
        select: { pairKey: true },
      }),
    ]);
    const resolved = new Set(decisions.map((decision) => decision.pairKey));
    const candidates: {
      pairKey: string;
      confidence: number;
      reasons: string[];
      first: DuplicateCandidateVenue;
      second: DuplicateCandidateVenue;
    }[] = [];

    for (let firstIndex = 0; firstIndex < venues.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < venues.length;
        secondIndex += 1
      ) {
        const first = venues[firstIndex];
        const second = venues[secondIndex];
        const pairKey = this.pairKey(first.id, second.id);
        if (resolved.has(pairKey)) continue;
        const comparison = this.compareVenues(first, second);
        if (comparison.confidence < 50) continue;
        candidates.push({
          pairKey,
          ...comparison,
          first: this.toCandidateVenue(first),
          second: this.toCandidateVenue(second),
        });
      }
    }
    return {
      candidates: candidates.sort((a, b) => b.confidence - a.confidence),
      scanned: venues.length,
      capped: venues.length === 1000,
    };
  }

  async markDistinct(actorId: string, dto: VenuePairDto) {
    if (dto.firstCourtId === dto.secondCourtId) {
      throw new BadRequestException('Choose two different venues.');
    }
    await Promise.all([
      this.requireVenue(dto.firstCourtId),
      this.requireVenue(dto.secondCourtId),
    ]);
    const pairKey = this.pairKey(dto.firstCourtId, dto.secondCourtId);
    const [firstCourtId, secondCourtId] = pairKey.split(':');
    await this.prisma.venueDuplicateDecision.upsert({
      where: { pairKey },
      create: {
        pairKey,
        firstCourtId,
        secondCourtId,
        decision: VenueDuplicateDecisionType.DISTINCT,
        decidedById: actorId,
      },
      update: {
        decision: VenueDuplicateDecisionType.DISTINCT,
        survivorCourtId: null,
        decidedById: actorId,
      },
    });
    await this.audit.record(
      actorId,
      'venue.duplicate.distinct',
      'VenuePair',
      pairKey,
    );
    return { distinct: true, pairKey };
  }

  async merge(actorId: string, dto: MergeVenuesDto) {
    if (dto.survivorCourtId === dto.duplicateCourtId) {
      throw new BadRequestException('Choose two different venues.');
    }
    const [survivor, duplicate] = await Promise.all([
      this.requireVenue(dto.survivorCourtId),
      this.requireVenue(dto.duplicateCourtId),
    ]);
    if (
      survivor.clubId &&
      duplicate.clubId &&
      survivor.clubId !== duplicate.clubId
    ) {
      throw new BadRequestException(
        'These venues belong to different clubs. Resolve ownership before merging.',
      );
    }
    if (
      survivor.googlePlacesRef &&
      duplicate.googlePlacesRef &&
      survivor.googlePlacesRef !== duplicate.googlePlacesRef
    ) {
      throw new BadRequestException(
        'These venues have different Google Places references. Mark them distinct or resolve the references first.',
      );
    }
    const pairKey = this.pairKey(survivor.id, duplicate.id);
    const [firstCourtId, secondCourtId] = pairKey.split(':');

    await this.prisma.$transaction(async (tx) => {
      await tx.court.update({
        where: { id: survivor.id },
        data: {
          address: survivor.address ?? duplicate.address,
          latitude: survivor.latitude ?? duplicate.latitude,
          longitude: survivor.longitude ?? duplicate.longitude,
          clubId: survivor.clubId ?? duplicate.clubId,
          phone: survivor.phone ?? duplicate.phone,
          website: survivor.website ?? duplicate.website,
          bookingType:
            survivor.bookingType === CourtBookingType.UNKNOWN
              ? duplicate.bookingType
              : survivor.bookingType,
          bookingUrl: survivor.bookingUrl ?? duplicate.bookingUrl,
          amenities: [
            ...new Set([...survivor.amenities, ...duplicate.amenities]),
          ],
          openingHoursNote:
            survivor.openingHoursNote ?? duplicate.openingHoursNote,
          isPublic: survivor.isPublic ?? duplicate.isPublic,
          photoUrls: [
            ...new Set([...survivor.photoUrls, ...duplicate.photoUrls]),
          ],
          googlePlacesRef:
            survivor.googlePlacesRef ?? duplicate.googlePlacesRef,
          googlePlacesSyncStatus:
            survivor.googlePlacesSyncStatus === VenuePlacesSyncStatus.SYNCED ||
            duplicate.googlePlacesSyncStatus === VenuePlacesSyncStatus.SYNCED
              ? VenuePlacesSyncStatus.SYNCED
              : survivor.googlePlacesSyncStatus,
          googlePlacesSyncedAt:
            survivor.googlePlacesSyncedAt ?? duplicate.googlePlacesSyncedAt,
          googlePlacesSyncError:
            survivor.googlePlacesSyncError ?? duplicate.googlePlacesSyncError,
          verificationStatus: this.strongerVerification(
            survivor.verificationStatus,
            duplicate.verificationStatus,
          ),
        },
      });
      if (
        survivor.courtGroups.length === 0 &&
        duplicate.courtGroups.length > 0
      ) {
        await tx.courtGroup.createMany({
          data: duplicate.courtGroups.map((group) => ({
            courtId: survivor.id,
            sport: group.sport,
            surface: group.surface,
            indoor: group.indoor,
            lighting: group.lighting,
            count: group.count,
          })),
        });
      }
      await tx.match.updateMany({
        where: { courtId: duplicate.id },
        data: { courtId: survivor.id },
      });
      await tx.courtReport.updateMany({
        where: { courtId: duplicate.id },
        data: { courtId: survivor.id },
      });
      await tx.courtInquiry.updateMany({
        where: { courtId: duplicate.id },
        data: { courtId: survivor.id },
      });
      await tx.court.delete({ where: { id: duplicate.id } });
      await tx.venueDuplicateDecision.upsert({
        where: { pairKey },
        create: {
          pairKey,
          firstCourtId,
          secondCourtId,
          decision: VenueDuplicateDecisionType.MERGED,
          survivorCourtId: survivor.id,
          decidedById: actorId,
          metadata: {
            survivorName: survivor.name,
            duplicateName: duplicate.name,
          },
        },
        update: {
          decision: VenueDuplicateDecisionType.MERGED,
          survivorCourtId: survivor.id,
          decidedById: actorId,
          metadata: {
            survivorName: survivor.name,
            duplicateName: duplicate.name,
          },
        },
      });
      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: 'venue.duplicate.merge',
          entityType: 'Court',
          entityId: survivor.id,
          metadata: {
            duplicateCourtId: duplicate.id,
            duplicateName: duplicate.name,
          },
        },
      });
    });
    return { merged: true, survivor: (await this.detail(survivor.id)).venue };
  }

  private async recordPlacesFailure(
    actorId: string,
    venue: VenueRecord,
    message: string,
  ) {
    await this.prisma.court.update({
      where: { id: venue.id },
      data: {
        googlePlacesSyncStatus: VenuePlacesSyncStatus.FAILED,
        googlePlacesSyncError: message,
      },
    });
    await this.audit.record(
      actorId,
      'venue.places.sync_failed',
      'Court',
      venue.id,
      {
        reason: message,
      },
    );
    return { status: VenuePlacesSyncStatus.FAILED, error: message };
  }

  private async validateVenueInput(dto: UpsertPlatformVenueDto) {
    if (!dto.name.trim())
      throw new BadRequestException('Venue name is required.');
    if (
      (dto.latitude === null) !== (dto.longitude === null) ||
      (dto.latitude === undefined) !== (dto.longitude === undefined)
    ) {
      throw new BadRequestException(
        'Latitude and longitude must be supplied together.',
      );
    }
    if (
      dto.bookingType === CourtBookingType.EXTERNAL_LINK &&
      !this.clean(dto.bookingUrl)
    ) {
      throw new BadRequestException('External booking requires a booking URL.');
    }
    if (dto.clubId) {
      const club = await this.prisma.club.findUnique({
        where: { id: dto.clubId },
        select: { id: true },
      });
      if (!club) throw new BadRequestException('Selected club does not exist.');
    }
  }

  private async requireVenue(id: string) {
    const venue = await this.prisma.court.findUnique({
      where: { id },
      include: venueInclude,
    });
    if (!venue) throw new NotFoundException('Venue not found.');
    return venue;
  }

  private toVenue(venue: VenueRecord) {
    return {
      ...venue,
      placesSyncStatus: this.effectivePlacesStatus(venue),
    };
  }

  private toCandidateVenue(venue: VenueRecord) {
    return {
      id: venue.id,
      name: venue.name,
      address: venue.address,
      latitude: venue.latitude,
      longitude: venue.longitude,
      phone: venue.phone,
      club: venue.club,
      googlePlacesRef: venue.googlePlacesRef,
      verificationStatus: venue.verificationStatus,
      courtGroups: venue.courtGroups,
      counts: venue._count,
    };
  }

  private effectivePlacesStatus(venue: {
    googlePlacesSyncStatus: VenuePlacesSyncStatus;
    googlePlacesSyncedAt: Date | null;
  }) {
    if (
      venue.googlePlacesSyncStatus === VenuePlacesSyncStatus.SYNCED &&
      (!venue.googlePlacesSyncedAt ||
        Date.now() - venue.googlePlacesSyncedAt.getTime() > STALE_AFTER_MS)
    ) {
      return VenuePlacesSyncStatus.STALE;
    }
    return venue.googlePlacesSyncStatus;
  }

  private placesWhere(status?: string): Prisma.CourtWhereInput {
    if (!status) return {};
    if (status === VenuePlacesSyncStatus.SYNCED) {
      return {
        googlePlacesSyncStatus: VenuePlacesSyncStatus.SYNCED,
        googlePlacesSyncedAt: { gte: new Date(Date.now() - STALE_AFTER_MS) },
      };
    }
    if (status === VenuePlacesSyncStatus.STALE) {
      return {
        OR: [
          { googlePlacesSyncStatus: VenuePlacesSyncStatus.STALE },
          {
            googlePlacesSyncStatus: VenuePlacesSyncStatus.SYNCED,
            googlePlacesSyncedAt: { lt: new Date(Date.now() - STALE_AFTER_MS) },
          },
        ],
      };
    }
    return { googlePlacesSyncStatus: status as VenuePlacesSyncStatus };
  }

  private compareVenues(first: VenueRecord, second: VenueRecord) {
    let confidence = 0;
    const reasons: string[] = [];
    const firstName = this.normalized(first.name);
    const secondName = this.normalized(second.name);
    const nameSimilarity = this.tokenSimilarity(firstName, secondName);
    if (firstName === secondName) {
      confidence += 55;
      reasons.push('Same normalized name');
    } else if (nameSimilarity >= 0.7) {
      confidence += 35;
      reasons.push('Very similar name');
    }
    const firstAddress = this.normalized(first.address ?? '');
    const secondAddress = this.normalized(second.address ?? '');
    if (firstAddress && firstAddress === secondAddress) {
      confidence += 45;
      reasons.push('Same normalized address');
    }
    if (
      first.googlePlacesRef &&
      first.googlePlacesRef === second.googlePlacesRef
    ) {
      confidence += 70;
      reasons.push('Same Google Places reference');
    }
    if (first.phone && first.phone === second.phone) {
      confidence += 20;
      reasons.push('Same phone number');
    }
    if (
      first.latitude !== null &&
      first.longitude !== null &&
      second.latitude !== null &&
      second.longitude !== null
    ) {
      const metres =
        haversineKm(
          { latitude: first.latitude, longitude: first.longitude },
          { latitude: second.latitude, longitude: second.longitude },
        ) * 1000;
      if (metres <= 25) {
        confidence += 35;
        reasons.push(`${Math.round(metres)} m apart`);
      } else if (metres <= 75 && nameSimilarity >= 0.5) {
        confidence += 20;
        reasons.push(`${Math.round(metres)} m apart`);
      }
    }
    return { confidence: Math.min(confidence, 100), reasons };
  }

  private strongerVerification(
    first: ListingVerificationStatus,
    second: ListingVerificationStatus,
  ) {
    const weight = {
      [ListingVerificationStatus.UNVERIFIED]: 0,
      [ListingVerificationStatus.PENDING]: 1,
      [ListingVerificationStatus.VERIFIED]: 2,
    };
    return weight[first] >= weight[second] ? first : second;
  }

  private pairKey(first: string, second: string) {
    return [first, second].sort().join(':');
  }

  private normalized(value: string) {
    return value
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private tokenSimilarity(first: string, second: string) {
    const firstTokens = new Set(first.split(' ').filter(Boolean));
    const secondTokens = new Set(second.split(' ').filter(Boolean));
    const union = new Set([...firstTokens, ...secondTokens]);
    if (union.size === 0) return 0;
    const shared = [...firstTokens].filter((token) =>
      secondTokens.has(token),
    ).length;
    return shared / union.size;
  }

  private clean(value?: string | null) {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private cleanList(values: string[]) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }
}
