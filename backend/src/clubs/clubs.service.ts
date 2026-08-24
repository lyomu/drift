import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { boundingBox, Coordinates, haversineKm } from '../common/distance.util';
import { clubInclude, toClubProfile, toClubSummary } from './club.mapper';
import { SearchClubsDto } from './dto/search-clubs.dto';

const DEFAULT_TAKE = 20;

@Injectable()
export class ClubsService {
  constructor(private readonly prisma: PrismaService) {}

  private coordsOf(club: {
    latitude: number | null;
    longitude: number | null;
  }): Coordinates | null {
    return club.latitude !== null && club.longitude !== null
      ? { latitude: club.latitude, longitude: club.longitude }
      : null;
  }

  async search(dto: SearchClubsDto) {
    const origin: Coordinates | null =
      dto.latitude !== undefined && dto.longitude !== undefined
        ? { latitude: dto.latitude, longitude: dto.longitude }
        : null;

    const where: Prisma.ClubWhereInput = {};

    if (origin && dto.maxDistanceKm !== undefined) {
      const box = boundingBox(origin, dto.maxDistanceKm);
      where.latitude = { gte: box.minLatitude, lte: box.maxLatitude };
      where.longitude = { gte: box.minLongitude, lte: box.maxLongitude };
    }
    if (dto.search) {
      where.name = { contains: dto.search, mode: 'insensitive' };
    }

    const candidates = await this.prisma.club.findMany({
      where,
      include: clubInclude,
    });

    const withDistance = candidates.map((club) => {
      const coords = this.coordsOf(club);
      const distanceKm = origin && coords ? haversineKm(origin, coords) : null;
      return { club, distanceKm };
    });

    const filtered = withDistance.filter(
      (row) =>
        dto.maxDistanceKm === undefined ||
        (row.distanceKm !== null && row.distanceKm <= dto.maxDistanceKm),
    );

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
      clubs: filtered
        .slice(skip, skip + take)
        .map((row) => toClubSummary(row.club, row.distanceKm)),
    };
  }

  async findOne(id: string, viewerId: string, viewerCoords?: Coordinates) {
    const [club, membership] = await Promise.all([
      this.prisma.club.findUnique({ where: { id }, include: clubInclude }),
      this.prisma.clubMembership.findUnique({
        where: { clubId_userId: { clubId: id, userId: viewerId } },
        select: { status: true },
      }),
    ]);
    if (!club) {
      throw new NotFoundException('Club not found.');
    }
    const coords = this.coordsOf(club);
    const distanceKm =
      viewerCoords && coords ? haversineKm(viewerCoords, coords) : null;
    return toClubProfile(club, distanceKm, membership?.status ?? null);
  }
}
