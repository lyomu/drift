import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LadderState,
  LeagueState,
  MatchFormat,
  MatchSport,
  Prisma,
  TournamentState,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { UpsertCompetitionRulesetDto } from './dto/competition-admin.dto';

type CompetitionType = 'LEAGUE' | 'TOURNAMENT' | 'LADDER';

const COMPETITION_TYPES: CompetitionType[] = ['LEAGUE', 'TOURNAMENT', 'LADDER'];

@Injectable()
export class CompetitionAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listCompetitions(query: {
    type?: string;
    sport?: string;
    state?: string;
    clubId?: string;
    search?: string;
    take?: number;
    skip?: number;
  }) {
    const requestedTypes = this.resolveTypes(query.type);
    const take = Math.min(query.take ?? 100, 250);
    const skip = query.skip ?? 0;
    const preload = Math.min(take + skip, 250);
    const sport = this.resolveEnum(MatchSport, query.sport);
    const search = query.search?.trim();

    const [
      leagues,
      tournaments,
      ladders,
      leagueTotal,
      tournamentTotal,
      ladderTotal,
    ] = await this.prisma.$transaction([
      requestedTypes.includes('LEAGUE')
        ? this.prisma.league.findMany({
            where: this.leagueWhere({
              sport,
              state: query.state,
              clubId: query.clubId,
              search,
            }),
            include: {
              club: {
                select: {
                  id: true,
                  name: true,
                  verificationStatus: true,
                  platformStatus: true,
                },
              },
              _count: { select: { registrations: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: preload,
          })
        : this.prisma.league.findMany({
            where: { id: '__none__' },
            include: {
              club: {
                select: {
                  id: true,
                  name: true,
                  verificationStatus: true,
                  platformStatus: true,
                },
              },
              _count: { select: { registrations: true } },
            },
          }),
      requestedTypes.includes('TOURNAMENT')
        ? this.prisma.tournament.findMany({
            where: this.tournamentWhere({
              sport,
              state: query.state,
              clubId: query.clubId,
              search,
            }),
            include: {
              club: {
                select: {
                  id: true,
                  name: true,
                  verificationStatus: true,
                  platformStatus: true,
                },
              },
              _count: { select: { entries: true, rounds: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: preload,
          })
        : this.prisma.tournament.findMany({
            where: { id: '__none__' },
            include: {
              club: {
                select: {
                  id: true,
                  name: true,
                  verificationStatus: true,
                  platformStatus: true,
                },
              },
              _count: { select: { entries: true, rounds: true } },
            },
          }),
      requestedTypes.includes('LADDER')
        ? this.prisma.ladder.findMany({
            where: this.ladderWhere({
              sport,
              state: query.state,
              clubId: query.clubId,
              search,
            }),
            include: {
              club: {
                select: {
                  id: true,
                  name: true,
                  verificationStatus: true,
                  platformStatus: true,
                },
              },
              _count: { select: { entries: true, challenges: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: preload,
          })
        : this.prisma.ladder.findMany({
            where: { id: '__none__' },
            include: {
              club: {
                select: {
                  id: true,
                  name: true,
                  verificationStatus: true,
                  platformStatus: true,
                },
              },
              _count: { select: { entries: true, challenges: true } },
            },
          }),
      requestedTypes.includes('LEAGUE')
        ? this.prisma.league.count({
            where: this.leagueWhere({
              sport,
              state: query.state,
              clubId: query.clubId,
              search,
            }),
          })
        : this.prisma.league.count({ where: { id: '__none__' } }),
      requestedTypes.includes('TOURNAMENT')
        ? this.prisma.tournament.count({
            where: this.tournamentWhere({
              sport,
              state: query.state,
              clubId: query.clubId,
              search,
            }),
          })
        : this.prisma.tournament.count({ where: { id: '__none__' } }),
      requestedTypes.includes('LADDER')
        ? this.prisma.ladder.count({
            where: this.ladderWhere({
              sport,
              state: query.state,
              clubId: query.clubId,
              search,
            }),
          })
        : this.prisma.ladder.count({ where: { id: '__none__' } }),
    ]);

    const rows = [
      ...leagues.map((league) => ({
        id: league.id,
        type: 'LEAGUE' as const,
        name: league.name,
        description: league.description,
        sport: league.sport,
        format: league.format,
        state: league.state,
        club: league.club,
        primaryCountLabel: 'Registrations',
        primaryCount: league._count.registrations,
        secondaryCountLabel: 'Rules',
        secondaryCount: [
          league.scoringFormat,
          league.walkoverRule,
          league.unfinishedMatchPolicy,
          league.rulesText,
        ].filter(Boolean).length,
        createdAt: league.createdAt,
        updatedAt: league.updatedAt,
      })),
      ...tournaments.map((tournament) => ({
        id: tournament.id,
        type: 'TOURNAMENT' as const,
        name: tournament.name,
        description: tournament.description,
        sport: tournament.sport,
        format: null,
        state: tournament.state,
        club: tournament.club,
        primaryCountLabel: 'Entries',
        primaryCount: tournament._count.entries,
        secondaryCountLabel: 'Rounds',
        secondaryCount: tournament._count.rounds,
        createdAt: tournament.createdAt,
        updatedAt: tournament.createdAt,
      })),
      ...ladders.map((ladder) => ({
        id: ladder.id,
        type: 'LADDER' as const,
        name: ladder.name,
        description: null,
        sport: ladder.sport,
        format: null,
        state: ladder.state,
        club: ladder.club,
        primaryCountLabel: 'Entries',
        primaryCount: ladder._count.entries,
        secondaryCountLabel: 'Challenges',
        secondaryCount: ladder._count.challenges,
        createdAt: ladder.createdAt,
        updatedAt: ladder.createdAt,
      })),
    ]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(skip, skip + take);

    return {
      total: leagueTotal + tournamentTotal + ladderTotal,
      competitions: rows,
      totalsByType: {
        leagues: leagueTotal,
        tournaments: tournamentTotal,
        ladders: ladderTotal,
      },
    };
  }

  async detail(type: string, id: string) {
    const normalized = this.requireType(type);
    if (normalized === 'LEAGUE') return this.leagueDetail(id);
    if (normalized === 'TOURNAMENT') return this.tournamentDetail(id);
    return this.ladderDetail(id);
  }

  async listRulesets(query: {
    sport?: string;
    format?: string;
    type?: string;
    status?: string;
    search?: string;
  }) {
    const sport = this.resolveEnum(MatchSport, query.sport);
    const format = this.resolveEnum(MatchFormat, query.format);
    const where: Prisma.CompetitionRulesetWhereInput = {
      ...(sport ? { sport } : {}),
      ...(format ? { format } : {}),
      ...(query.type &&
      COMPETITION_TYPES.includes(query.type.toUpperCase() as CompetitionType)
        ? { competitionTypes: { has: query.type.toUpperCase() } }
        : {}),
      ...(query.status === 'ACTIVE' ? { isActive: true } : {}),
      ...(query.status === 'INACTIVE' ? { isActive: false } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { name: { contains: query.search.trim(), mode: 'insensitive' } },
              {
                description: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                scoringFormat: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const rulesets = await this.prisma.competitionRuleset.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      take: 250,
    });
    return { rulesets };
  }

  async rulesetDetail(id: string) {
    const ruleset = await this.prisma.competitionRuleset.findUnique({
      where: { id },
    });
    if (!ruleset) throw new NotFoundException('Ruleset not found.');
    return { ruleset };
  }

  async createRuleset(actorId: string, dto: UpsertCompetitionRulesetDto) {
    const data = this.rulesetData(dto);
    if (!data.isActive && data.isDefault) {
      throw new BadRequestException(
        'An inactive ruleset cannot be the default.',
      );
    }

    const ruleset = await this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.competitionRuleset.updateMany({
          where: { sport: data.sport, format: data.format, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.competitionRuleset.create({ data });
    });

    await this.audit.record(
      actorId,
      'competition.ruleset.create',
      'CompetitionRuleset',
      ruleset.id,
      {
        name: ruleset.name,
        sport: ruleset.sport,
        format: ruleset.format,
        competitionTypes: ruleset.competitionTypes,
        isDefault: ruleset.isDefault,
      },
    );
    return { ruleset };
  }

  async updateRuleset(
    actorId: string,
    id: string,
    dto: UpsertCompetitionRulesetDto,
  ) {
    const existing = await this.prisma.competitionRuleset.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Ruleset not found.');

    const data = this.rulesetData(dto);
    if (!data.isActive && data.isDefault) {
      throw new BadRequestException(
        'An inactive ruleset cannot be the default.',
      );
    }
    if (!data.isActive) data.isDefault = false;

    const ruleset = await this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.competitionRuleset.updateMany({
          where: {
            sport: data.sport,
            format: data.format,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }
      return tx.competitionRuleset.update({ where: { id }, data });
    });

    await this.audit.record(
      actorId,
      'competition.ruleset.update',
      'CompetitionRuleset',
      id,
      {
        previous: {
          name: existing.name,
          sport: existing.sport,
          format: existing.format,
          competitionTypes: existing.competitionTypes,
          isDefault: existing.isDefault,
          isActive: existing.isActive,
        },
        next: {
          name: ruleset.name,
          sport: ruleset.sport,
          format: ruleset.format,
          competitionTypes: ruleset.competitionTypes,
          isDefault: ruleset.isDefault,
          isActive: ruleset.isActive,
        },
      },
    );
    return { ruleset };
  }

  private async leagueDetail(id: string) {
    const league = await this.prisma.league.findUnique({
      where: { id },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            verificationStatus: true,
            platformStatus: true,
          },
        },
        _count: {
          select: {
            registrations: true,
            rounds: true,
            standings: true,
            awards: true,
          },
        },
      },
    });
    if (!league) throw new NotFoundException('League not found.');
    return { competition: { type: 'LEAGUE', ...league } };
  }

  private async tournamentDetail(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            verificationStatus: true,
            platformStatus: true,
          },
        },
        entries: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          take: 50,
        },
        rounds: {
          orderBy: { index: 'asc' },
          include: {
            fixtures: {
              orderBy: { slotIndex: 'asc' },
              include: {
                sideA: {
                  select: { id: true, firstName: true, lastName: true },
                },
                sideB: {
                  select: { id: true, firstName: true, lastName: true },
                },
                match: { select: { id: true, state: true } },
              },
            },
          },
          take: 25,
        },
      },
    });
    if (!tournament) throw new NotFoundException('Tournament not found.');
    return { competition: { type: 'TOURNAMENT', ...tournament } };
  }

  private async ladderDetail(id: string) {
    const ladder = await this.prisma.ladder.findUnique({
      where: { id },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            verificationStatus: true,
            platformStatus: true,
          },
        },
        entries: {
          orderBy: { position: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          take: 50,
        },
        challenges: {
          orderBy: { createdAt: 'desc' },
          include: {
            challenger: {
              select: { id: true, firstName: true, lastName: true },
            },
            defender: { select: { id: true, firstName: true, lastName: true } },
            match: { select: { id: true, state: true } },
          },
          take: 50,
        },
      },
    });
    if (!ladder) throw new NotFoundException('Ladder not found.');
    return { competition: { type: 'LADDER', ...ladder } };
  }

  private leagueWhere(filters: {
    sport?: MatchSport;
    state?: string;
    clubId?: string;
    search?: string;
  }): Prisma.LeagueWhereInput {
    const state = this.resolveEnum(LeagueState, filters.state);
    if (filters.state && !state) return { id: '__none__' };
    return {
      ...(filters.sport ? { sport: filters.sport } : {}),
      ...(state ? { state } : {}),
      ...(filters.clubId ? { clubId: filters.clubId } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              {
                description: { contains: filters.search, mode: 'insensitive' },
              },
              {
                club: {
                  name: { contains: filters.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
  }

  private tournamentWhere(filters: {
    sport?: MatchSport;
    state?: string;
    clubId?: string;
    search?: string;
  }): Prisma.TournamentWhereInput {
    const state = this.resolveEnum(TournamentState, filters.state);
    if (filters.state && !state) return { id: '__none__' };
    return {
      ...(filters.sport ? { sport: filters.sport } : {}),
      ...(state ? { state } : {}),
      ...(filters.clubId ? { clubId: filters.clubId } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              {
                description: { contains: filters.search, mode: 'insensitive' },
              },
              {
                club: {
                  name: { contains: filters.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
  }

  private ladderWhere(filters: {
    sport?: MatchSport;
    state?: string;
    clubId?: string;
    search?: string;
  }): Prisma.LadderWhereInput {
    const state = this.resolveEnum(LadderState, filters.state);
    if (filters.state && !state) return { id: '__none__' };
    return {
      ...(filters.sport ? { sport: filters.sport } : {}),
      ...(state ? { state } : {}),
      ...(filters.clubId ? { clubId: filters.clubId } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              {
                club: {
                  name: { contains: filters.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
  }

  private rulesetData(dto: UpsertCompetitionRulesetDto) {
    const competitionTypes = dto.competitionTypes.filter((type) =>
      COMPETITION_TYPES.includes(type as CompetitionType),
    );
    if (competitionTypes.length === 0) {
      throw new BadRequestException('Select at least one competition type.');
    }
    return {
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      sport: dto.sport,
      format: dto.format,
      competitionTypes,
      scoringFormat: dto.scoringFormat.trim(),
      walkoverRule: dto.walkoverRule.trim(),
      unfinishedMatchPolicy: dto.unfinishedMatchPolicy.trim(),
      rulesText: dto.rulesText?.trim() || null,
      isDefault: dto.isDefault ?? false,
      isActive: dto.isActive ?? true,
    };
  }

  private resolveTypes(type?: string): CompetitionType[] {
    if (!type) return COMPETITION_TYPES;
    const normalized = type.toUpperCase() as CompetitionType;
    return COMPETITION_TYPES.includes(normalized) ? [normalized] : [];
  }

  private requireType(type: string): CompetitionType {
    const normalized = type.toUpperCase() as CompetitionType;
    if (!COMPETITION_TYPES.includes(normalized)) {
      throw new BadRequestException(
        'Competition type must be LEAGUE, TOURNAMENT, or LADDER.',
      );
    }
    return normalized;
  }

  private resolveEnum<T extends Record<string, string>>(
    values: T,
    value?: string,
  ): T[keyof T] | undefined {
    if (!value) return undefined;
    return Object.values(values).includes(value)
      ? (value as T[keyof T])
      : undefined;
  }
}
