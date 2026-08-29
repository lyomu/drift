import { Injectable, NotFoundException } from '@nestjs/common';
import { MatchSport, OnboardingStep, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { boundingBox, Coordinates, haversineKm } from '../common/distance.util';
import {
  blockBetween,
  connectionBetween,
  connectionStateFor,
} from '../common/relationship.util';
import {
  PlayerRecord,
  effectiveLevel,
  playerInclude,
  toPlayerProfile,
  toPlayerSummary,
} from './player.mapper';
import { getPlayerStats } from '../matches/stats.util';
import { SearchPlayersDto } from './dto/search-players.dto';

const DEFAULT_TAKE = 20;

/**
 * Most candidates scored in one search. Generous relative to `DEFAULT_TAKE`
 * (25 pages of results) so it is unreachable at current scale, while keeping
 * a pathological query from loading the whole user table into memory.
 */
const CANDIDATE_LIMIT = 500;

/**
 * Ranking weights. `foundation/03-user-journeys.md` §4.1 specifies "proximity
 * + level compatibility weighted" without fixing the weights, so an even
 * split is the documented implementation decision for this phase — same
 * class of choice as the NTRP-style level scale made in M3.
 */
const PROXIMITY_WEIGHT = 0.5;
const LEVEL_WEIGHT = 0.5;

/** Level compatibility decays to zero across this many levels of difference. */
const LEVEL_TOLERANCE = 3.0;

/** Used to normalise proximity when the caller didn't bound the search. */
const DEFAULT_PROXIMITY_SCALE_KM = 50;

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  private async viewerProfile(userId: string) {
    const profile = await this.prisma.tennisProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Tennis profile not found.');
    }
    return profile;
  }

  private coordsOf(record: {
    latitude: number | null;
    longitude: number | null;
  }): Coordinates | null {
    return record.latitude !== null && record.longitude !== null
      ? { latitude: record.latitude, longitude: record.longitude }
      : null;
  }

  /** Ids the viewer must never see, in either block direction. */
  private async blockedUserIds(userId: string): Promise<string[]> {
    const blocks = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    return blocks.map((b) =>
      b.blockerId === userId ? b.blockedId : b.blockerId,
    );
  }

  async search(userId: string, dto: SearchPlayersDto) {
    const viewer = await this.viewerProfile(userId);
    const viewerCoords = this.coordsOf(viewer);
    const excludedIds = [userId, ...(await this.blockedUserIds(userId))];

    // Wave 8: sport dimension — Padel queries PadelProfile, Tennis (default)
    // queries TennisProfile. The rest of the filters map to whichever profile
    // the sport selects.
    const sport = (dto as { sport?: 'TENNIS' | 'PADEL' }).sport ?? 'TENNIS';
    const profileFilter: Prisma.TennisProfileWhereInput = {};

    if (dto.levelMin !== undefined || dto.levelMax !== undefined) {
      // A player's presented level is userSelectedLevel when set, otherwise
      // the system suggestion — so the range has to match either field.
      const range = {
        ...(dto.levelMin !== undefined ? { gte: dto.levelMin } : {}),
        ...(dto.levelMax !== undefined ? { lte: dto.levelMax } : {}),
      };
      profileFilter.OR = [
        { userSelectedLevel: range },
        { userSelectedLevel: null, systemSuggestedLevel: range },
      ];
    }

    if (dto.formatPreference) {
      profileFilter.formatPreference = dto.formatPreference;
    }
    if (dto.stylePreference) {
      profileFilter.stylePreference = dto.stylePreference;
    }
    if (dto.clubName) {
      profileFilter.preferredClubName = {
        contains: dto.clubName,
        mode: 'insensitive',
      };
    }
    if (dto.dayOfWeek !== undefined || dto.timeBlock) {
      profileFilter.availabilitySlots = {
        some: {
          ...(dto.dayOfWeek !== undefined ? { dayOfWeek: dto.dayOfWeek } : {}),
          ...(dto.timeBlock ? { timeBlock: dto.timeBlock } : {}),
        },
      };
    }

    // Narrow to a bounding box in SQL when we can; exact haversine happens in
    // JS below. No PostGIS in this stack — revisit if this table grows.
    if (dto.maxDistanceKm !== undefined && viewerCoords) {
      const box = boundingBox(viewerCoords, dto.maxDistanceKm);
      profileFilter.latitude = { gte: box.minLatitude, lte: box.maxLatitude };
      profileFilter.longitude = {
        gte: box.minLongitude,
        lte: box.maxLongitude,
      };
    }

    const candidates = await this.prisma.user.findMany({
      where: {
        id: { notIn: excludedIds },
        onboardingStep: OnboardingStep.COMPLETE,
        // Wave 8: Padel queries PadelProfile; Tennis (default) queries TennisProfile.
        ...(sport === 'PADEL'
          ? { padelProfile: { isNot: null } }
          : { tennisProfile: { is: profileFilter } }),
      },
      include: playerInclude,
      // Hard ceiling on the candidate set. Ranking is by a *computed* score
      // (proximity blended with level compatibility), which can't be
      // expressed in SQL without PostGIS — so results can't be paginated in
      // the database, and this query previously loaded every matching user,
      // with their full profile include, into memory on every search.
      //
      // The cap trades exhaustiveness for a bounded worst case: above this
      // many matches the tail is dropped before scoring, so a distant but
      // well-matched player could be missed. That is the point at which this
      // needs a real geospatial index rather than a bigger number here —
      // see the `total` note below and PROGRESS.md's open dependencies.
      take: CANDIDATE_LIMIT,
    });

    const viewerLevel =
      viewer.userSelectedLevel ?? viewer.systemSuggestedLevel ?? null;

    const scored = candidates
      .map((player) => {
        const coords = player.tennisProfile
          ? this.coordsOf(player.tennisProfile)
          : null;
        const distanceKm =
          viewerCoords && coords ? haversineKm(viewerCoords, coords) : null;
        return {
          player,
          distanceKm,
          score: this.score(player, distanceKm, viewerLevel, dto.maxDistanceKm),
        };
      })
      // Exact distance filter — the bounding box is a superset of the circle.
      .filter(
        (row) =>
          dto.maxDistanceKm === undefined ||
          (row.distanceKm !== null && row.distanceKm <= dto.maxDistanceKm),
      )
      .sort((a, b) => b.score - a.score);

    const skip = dto.skip ?? 0;
    const take = dto.take ?? DEFAULT_TAKE;

    return {
      // Matches *considered*, not matches in existence — once the candidate
      // ceiling is hit these differ, and `truncated` says so rather than
      // presenting a capped count as the true total.
      total: scored.length,
      truncated: candidates.length === CANDIDATE_LIMIT,
      players: scored
        .slice(skip, skip + take)
        .map((row) => toPlayerSummary(row.player, row.distanceKm)),
    };
  }

  private score(
    player: PlayerRecord,
    distanceKm: number | null,
    viewerLevel: number | null,
    maxDistanceKm?: number,
  ): number {
    const scale = maxDistanceKm ?? DEFAULT_PROXIMITY_SCALE_KM;
    // Unknown distance scores neutrally rather than last — a player without
    // coordinates isn't necessarily far, we just can't say.
    const proximityScore =
      distanceKm === null ? 0.5 : Math.max(0, 1 - distanceKm / scale);

    const playerLevel = effectiveLevel(player);
    const levelScore =
      viewerLevel === null || playerLevel === null
        ? 0.5
        : Math.max(
            0,
            1 - Math.abs(viewerLevel - playerLevel) / LEVEL_TOLERANCE,
          );

    return PROXIMITY_WEIGHT * proximityScore + LEVEL_WEIGHT * levelScore;
  }

  /**
   * Own Profile (Phase M12). A distinct method rather than routing self-views
   * through `findOne` — that method computes `connectionState` from a
   * self-to-self `Connection` lookup, which is always `NONE`, which would
   * gate a player's own skill breakdown and availability behind their own
   * Privacy Settings. `'CONNECTED'` here isn't a real connection, just the
   * cheapest way to reuse `toPlayerProfile`'s existing gate — the client
   * never reads `connectionState` on this screen (no connect/message
   * affordance makes sense on your own profile).
   */
  async getOwnProfile(userId: string) {
    const player = await this.prisma.user.findFirst({
      where: { id: userId },
      include: playerInclude,
    });
    if (!player) {
      throw new NotFoundException('Player not found.');
    }

    // players/ is Tennis-scoped this phase — Padel discovery is out of
    // scope for M13 (see PROGRESS.md) — explicit rather than relying on
    // getPlayerStats's default.
    const stats = await getPlayerStats(this.prisma, userId, MatchSport.TENNIS);
    return toPlayerProfile(player, null, 'CONNECTED', stats);
  }

  async findOne(userId: string, playerId: string) {
    const blocked = await this.prisma.block.findFirst({
      where: blockBetween(userId, playerId),
    });
    // A blocked player is indistinguishable from one who doesn't exist.
    if (blocked) {
      throw new NotFoundException('Player not found.');
    }

    const player = await this.prisma.user.findFirst({
      where: { id: playerId, onboardingStep: OnboardingStep.COMPLETE },
      include: playerInclude,
    });
    if (!player) {
      throw new NotFoundException('Player not found.');
    }

    const connection = await this.prisma.connection.findFirst({
      where: connectionBetween(userId, playerId),
    });

    const viewer = await this.viewerProfile(userId);
    const viewerCoords = this.coordsOf(viewer);
    const playerCoords = player.tennisProfile
      ? this.coordsOf(player.tennisProfile)
      : null;
    const distanceKm =
      viewerCoords && playerCoords
        ? haversineKm(viewerCoords, playerCoords)
        : null;

    const stats = await getPlayerStats(
      this.prisma,
      playerId,
      MatchSport.TENNIS,
    );

    return toPlayerProfile(
      player,
      distanceKm,
      connectionStateFor(userId, connection),
      stats,
    );
  }
}
