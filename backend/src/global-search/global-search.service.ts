import { Injectable } from '@nestjs/common';
import {
  AccountStatus,
  ClubPlatformStatus,
  LadderState,
  LeagueState,
  OnboardingStep,
  TournamentState,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { displayName } from '../common/display-name.util';
import {
  GlobalSearchDto,
  GlobalSearchEntityType,
} from './dto/global-search.dto';

type SearchResult = {
  id: string;
  type: 'PLAYER' | 'COURT' | 'CLUB' | 'LEAGUE' | 'TOURNAMENT' | 'LADDER';
  title: string;
  subtitle: string | null;
  route: string;
};

@Injectable()
export class GlobalSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async run(userId: string, dto: GlobalSearchDto) {
    const query = dto.query?.trim() ?? '';
    const take = dto.take ?? 8;
    if (query.length < 2) return { results: [] };

    const type = dto.type ?? GlobalSearchEntityType.ALL;
    const buckets = await Promise.all([
      this.includes(type, GlobalSearchEntityType.PLAYER)
        ? this.players(userId, query, take)
        : [],
      this.includes(type, GlobalSearchEntityType.COURT)
        ? this.courts(query, take)
        : [],
      this.includes(type, GlobalSearchEntityType.CLUB)
        ? this.clubs(query, take)
        : [],
      this.includes(type, GlobalSearchEntityType.COMPETITION)
        ? this.competitions(query, take)
        : [],
    ]);

    return { results: buckets.flat().slice(0, dto.take ?? 24) };
  }

  private includes(
    type: GlobalSearchEntityType,
    bucket: GlobalSearchEntityType,
  ) {
    return type === GlobalSearchEntityType.ALL || type === bucket;
  }

  private async blockedUserIds(userId: string): Promise<string[]> {
    const blocks = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    return blocks.map((b) =>
      b.blockerId === userId ? b.blockedId : b.blockerId,
    );
  }

  private async players(
    userId: string,
    query: string,
    take: number,
  ): Promise<SearchResult[]> {
    const blockedIds = [userId, ...(await this.blockedUserIds(userId))];
    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: blockedIds },
        accountStatus: AccountStatus.ACTIVE,
        onboardingStep: OnboardingStep.COMPLETE,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          {
            tennisProfile: {
              is: { generalLocation: { contains: query, mode: 'insensitive' } },
            },
          },
          {
            tennisProfile: {
              is: {
                preferredClubName: { contains: query, mode: 'insensitive' },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tennisProfile: {
          select: {
            generalLocation: true,
            userSelectedLevel: true,
            systemSuggestedLevel: true,
          },
        },
      },
      take,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    return users.map((user) => {
      const level =
        user.tennisProfile?.userSelectedLevel ??
        user.tennisProfile?.systemSuggestedLevel ??
        null;
      return {
        id: user.id,
        type: 'PLAYER',
        title: displayName(user),
        subtitle:
          [
            level != null ? `Level ${level.toFixed(1)}` : null,
            user.tennisProfile?.generalLocation ?? null,
          ]
            .filter(Boolean)
            .join(' - ') || null,
        route: `/players/${user.id}`,
      };
    });
  }

  private async courts(query: string, take: number): Promise<SearchResult[]> {
    const courts = await this.prisma.court.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { address: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, address: true, verificationStatus: true },
      take,
      orderBy: { name: 'asc' },
    });
    return courts.map((court) => ({
      id: court.id,
      type: 'COURT',
      title: court.name,
      subtitle: court.address ?? court.verificationStatus,
      route: `/discover/courts/${court.id}`,
    }));
  }

  private async clubs(query: string, take: number): Promise<SearchResult[]> {
    const clubs = await this.prisma.club.findMany({
      where: {
        platformStatus: ClubPlatformStatus.ACTIVE,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { address: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, address: true, verificationStatus: true },
      take,
      orderBy: { name: 'asc' },
    });
    return clubs.map((club) => ({
      id: club.id,
      type: 'CLUB',
      title: club.name,
      subtitle: club.address ?? club.verificationStatus,
      route: `/discover/clubs/${club.id}`,
    }));
  }

  private async competitions(
    query: string,
    take: number,
  ): Promise<SearchResult[]> {
    const [leagues, tournaments, ladders] = await Promise.all([
      this.prisma.league.findMany({
        where: {
          state: LeagueState.PUBLISHED,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true, sport: true, format: true },
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.tournament.findMany({
        where: {
          state: { not: TournamentState.CANCELLED },
          name: { contains: query, mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          state: true,
          club: { select: { name: true } },
        },
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.ladder.findMany({
        where: {
          state: LadderState.ACTIVE,
          name: { contains: query, mode: 'insensitive' },
        },
        select: { id: true, name: true, club: { select: { name: true } } },
        take,
        orderBy: { name: 'asc' },
      }),
    ]);

    return [
      ...leagues.map((league) => ({
        id: league.id,
        type: 'LEAGUE' as const,
        title: league.name,
        subtitle: `${league.sport} - ${league.format}`,
        route: `/compete/leagues/${league.id}`,
      })),
      ...tournaments.map((tournament) => ({
        id: tournament.id,
        type: 'TOURNAMENT' as const,
        title: tournament.name,
        subtitle: `Tournament - ${tournament.club.name} - ${tournament.state}`,
        route: `/compete/tournaments/${tournament.id}`,
      })),
      ...ladders.map((ladder) => ({
        id: ladder.id,
        type: 'LADDER' as const,
        title: ladder.name,
        subtitle: `Ladder - ${ladder.club.name}`,
        route: `/compete/ladders/${ladder.id}`,
      })),
    ].slice(0, take);
  }
}
