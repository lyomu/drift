import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeagueState,
  LeagueRegistrationStatus,
  MatchFormat,
  MatchSide,
  MatchSport,
  MatchState,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { assertTransition, effectiveState } from '../matches/match-state';
import { matchInclude, toMatchDto } from '../matches/match.mapper';
import { playerInclude, toPlayerSummary } from '../players/player.mapper';
import { generateRounds, foldForNearestSeed } from './round-robin';
import { playerCompetitionLevel } from './player-level';
import {
  PlayerRecord as StandingsPlayerRecord,
  StandingRow,
  computeStandings,
} from './standings';
import { effectiveCompetitionState, isRegistrationOpen } from './competition-state';
import { NotificationsService } from '../notifications/notifications.service';
import { sanitizeRichText } from '../common/rich-text.util';

const MINUTE_MS = 60 * 1000;

/** States where a fixture's match never really happened by its deadline —
 * these are forced to WALKOVER when a round closes. DISPUTED is
 * deliberately excluded: a match was played, the score is just contested,
 * so overriding it would erase real result data (same
 * dispute-without-admin gap as Phase M7). */
const UNPLAYED_STATES: MatchState[] = [
  MatchState.PROPOSED,
  MatchState.SCHEDULING,
  MatchState.SCHEDULED,
  MatchState.RESCHEDULED,
];

@Injectable()
export class CompetitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matches: MatchesService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------------------------------------------------------- reads

  async listLeagues() {
    const leagues = await this.prisma.league.findMany({
      where: { state: LeagueState.PUBLISHED },
      include: { rounds: { select: { index: true, closedAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      leagues: await Promise.all(
        leagues.map((l) => this.toLeagueSummary(l)),
      ),
    };
  }

  async getLeague(leagueId: string, userId?: string) {
    await this.ensureLeagueProgressed(leagueId);
    const league = await this.loadLeague(leagueId);
    const registration = userId
      ? await this.prisma.leagueRegistration.findUnique({
          where: { leagueId_userId: { leagueId, userId } },
        })
      : null;
    return this.toLeagueSummary(league, registration?.status ?? null);
  }

  async getRegisteredPlayers(leagueId: string) {
    await this.loadLeague(leagueId);
    const registrations = await this.prisma.leagueRegistration.findMany({
      where: {
        leagueId,
        status: {
          in: [
            LeagueRegistrationStatus.ENROLLED,
            LeagueRegistrationStatus.WAITLISTED,
          ],
        },
      },
      include: { user: { include: playerInclude } },
      orderBy: { registeredAt: 'asc' },
    });
    return {
      // registrationId included alongside the player so Club Admin can
      // target PATCH /leagues/:id/registrations/:registrationId directly
      // from this same list — no separate admin-only read path needed.
      players: registrations.map((r) => ({
        registrationId: r.id,
        status: r.status,
        player: toPlayerSummary(r.user, null),
      })),
    };
  }

  async getMyLeagues(userId: string) {
    const registrations = await this.prisma.leagueRegistration.findMany({
      where: {
        userId,
        status: {
          in: [
            LeagueRegistrationStatus.ENROLLED,
            LeagueRegistrationStatus.WAITLISTED,
          ],
        },
      },
      include: { league: { include: { rounds: { select: { index: true, closedAt: true } } } } },
      orderBy: { league: { startsAt: 'desc' } },
    });

    return {
      leagues: registrations.map((r) => ({
        leagueId: r.league.id,
        leagueName: r.league.name,
        name: r.league.name,
        state: effectiveCompetitionState(
          r.league,
          this.isFinalRoundClosedFromRounds(r.league.roundCount, r.league.rounds),
        ),
        registrationStatus: r.status,
      })),
    };
  }

  async getCurrentRound(leagueId: string) {
    await this.ensureLeagueProgressed(leagueId);
    const round = await this.prisma.round.findFirst({
      where: { leagueId, openedAt: { not: null } },
      orderBy: { index: 'desc' },
    });
    if (!round) {
      return { round: null };
    }
    return { round: await this.toRoundDto(round.id) };
  }

  async getRound(leagueId: string, roundId: string) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
    });
    if (!round || round.leagueId !== leagueId) {
      throw new NotFoundException('Round not found.');
    }
    return { round: await this.toRoundDto(roundId) };
  }

  async getStandings(leagueId: string) {
    await this.ensureLeagueProgressed(leagueId);
    const league = await this.loadLeague(leagueId);
    const liveRows = await this.liveStandingRows(leagueId);
    const snapshot = await this.prisma.standing.findMany({
      where: { leagueId },
    });
    const snapshotRank = new Map(snapshot.map((s) => [s.userId, s.rank]));

    return {
      standings: liveRows.map((row) => ({
        ...row,
        previousRank: snapshotRank.get(row.userId) ?? null,
      })),
      competitionState: effectiveCompetitionState(
        league,
        await this.isFinalRoundClosed(league),
      ),
    };
  }

  // ------------------------------------------------------------- actions

  async register(userId: string, leagueId: string) {
    const league = await this.loadLeague(leagueId);
    if (!isRegistrationOpen(league)) {
      throw new BadRequestException(
        'Registration is not open for this league.',
      );
    }

    const existing = await this.prisma.leagueRegistration.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    });
    if (existing && existing.status !== LeagueRegistrationStatus.WITHDRAWN) {
      throw new BadRequestException(
        "You're already registered for this league.",
      );
    }

    const enrolledCount = await this.prisma.leagueRegistration.count({
      where: { leagueId, status: LeagueRegistrationStatus.ENROLLED },
    });
    const status =
      league.capacity != null && enrolledCount >= league.capacity
        ? LeagueRegistrationStatus.WAITLISTED
        : LeagueRegistrationStatus.ENROLLED;

    const registration = await this.prisma.leagueRegistration.upsert({
      where: { leagueId_userId: { leagueId, userId } },
      create: { leagueId, userId, status },
      update: { status, registeredAt: new Date() },
    });

    // Registration outcome notifications — a player who registers should
    // never have to discover their status by reopening the screen.
    if (registration.status === LeagueRegistrationStatus.ENROLLED) {
      await this.notifications.create(
        userId,
        'COMPETITIONS',
        "You're registered",
        `${league.name}. We'll let you know when your first round opens.`,
        'LEAGUE',
        leagueId,
      );
    } else {
      await this.notifications.create(
        userId,
        'COMPETITIONS',
        "You're on the waitlist",
        `${league.name} is full. You move in automatically if a spot opens.`,
        'LEAGUE',
        leagueId,
      );
    }

    return { status: registration.status };
  }

  async withdraw(userId: string, leagueId: string) {
    const league = await this.loadLeague(leagueId);
    if (league.startsAt && Date.now() >= league.startsAt.getTime()) {
      throw new BadRequestException(
        'You can no longer withdraw once the league has started.',
      );
    }

    await this.prisma.leagueRegistration.updateMany({
      where: { leagueId, userId },
      data: { status: LeagueRegistrationStatus.WITHDRAWN },
    });

    if (league.capacity != null) {
      const nextWaiting = await this.prisma.leagueRegistration.findFirst({
        where: { leagueId, status: LeagueRegistrationStatus.WAITLISTED },
        orderBy: { registeredAt: 'asc' },
      });
      if (nextWaiting) {
        await this.prisma.leagueRegistration.update({
          where: { id: nextWaiting.id },
          data: { status: LeagueRegistrationStatus.ENROLLED },
        });
        // The promotion must never be silent: the player believes they're
        // still queued.
        await this.notifications.create(
          nextWaiting.userId,
          'COMPETITIONS',
          "You're in",
          `A spot opened up in ${league.name}. You've been enrolled.`,
          'LEAGUE',
          leagueId,
        );
      }
    }
    return { withdrawn: true };
  }

  // ---------------------------------------------------- club-admin writes

  async leagueClubId(leagueId: string): Promise<string | null> {
    const league = await this.prisma.league.findUnique({
      where: { id: leagueId },
      select: { clubId: true },
    });
    if (!league) throw new NotFoundException('League not found.');
    return league.clubId;
  }

  async fixtureMatchId(fixtureId: string): Promise<string | null> {
    const fixture = await this.prisma.fixture.findUnique({
      where: { id: fixtureId },
      select: { matchId: true },
    });
    if (!fixture) throw new NotFoundException('Fixture not found.');
    return fixture.matchId;
  }

  async fixtureClubId(fixtureId: string): Promise<string | null> {
    const fixture = await this.prisma.fixture.findUnique({
      where: { id: fixtureId },
      select: {
        round: { select: { league: { select: { clubId: true } } } },
      },
    });
    if (!fixture) throw new NotFoundException('Fixture not found.');
    return fixture.round.league.clubId;
  }

  async createLeague(
    clubId: string,
    dto: {
      name: string;
      description?: string;
      rulesText?: string;
      scoringFormat?: string;
      walkoverRule?: string;
      unfinishedMatchPolicy?: string;
      registrationOpensAt?: Date;
      registrationClosesAt?: Date;
      startsAt?: Date;
      roundCount?: number;
      roundIntervalMinutes?: number;
      capacity?: number;
      sport?: MatchSport;
      format?: MatchFormat;
    },
  ) {
    this.assertCompetitionWindow(dto);
    const league = await this.prisma.league.create({
      data: {
        clubId,
        name: dto.name,
        description: dto.description,
        rulesText: sanitizeRichText(dto.rulesText),
        scoringFormat: dto.scoringFormat,
        walkoverRule: dto.walkoverRule,
        unfinishedMatchPolicy: dto.unfinishedMatchPolicy,
        registrationOpensAt: dto.registrationOpensAt,
        registrationClosesAt: dto.registrationClosesAt,
        startsAt: dto.startsAt,
        roundCount: dto.roundCount,
        roundIntervalMinutes: dto.roundIntervalMinutes ?? 1440,
        capacity: dto.capacity,
        sport: dto.sport,
        format: dto.format,
        state: LeagueState.DRAFT,
      },
      include: { rounds: { select: { index: true, closedAt: true } } },
    });
    return this.toLeagueSummary(league);
  }

  async listLeagueArchive(clubId: string) {
    const leagues = await this.prisma.league.findMany({
      where: {
        clubId,
        OR: [{ completedAt: { not: null } }, { cancelledAt: { not: null } }],
      },
      include: {
        standings: {
          orderBy: { rank: 'asc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        awards: {
          orderBy: { issuedAt: 'desc' },
          include: {
            recipient: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { startsAt: 'desc' },
    });
    return { leagues };
  }

  async completeLeague(leagueId: string) {
    const league = await this.prisma.league.update({
      where: { id: leagueId },
      data: { completedAt: new Date() },
    });
    return { id: league.id, completedAt: league.completedAt };
  }

  async issueLeagueAward(
    leagueId: string,
    issuedById: string,
    input: { recipientId: string; title: string; notes?: string },
  ) {
    const registration = await this.prisma.leagueRegistration.findUnique({
      where: { leagueId_userId: { leagueId, userId: input.recipientId } },
    });
    if (!registration)
      throw new BadRequestException(
        'Awards can only be issued to league participants.',
      );
    const award = await this.prisma.leagueAward.create({
      data: { leagueId, issuedById, ...input },
    });
    return { award };
  }

  async listLeaguesForClub(clubId: string) {
    const leagues = await this.prisma.league.findMany({
      where: { clubId },
      include: { rounds: { select: { index: true, closedAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      leagues: await Promise.all(leagues.map((l) => this.toLeagueSummary(l))),
    };
  }

  async updateLeague(
    leagueId: string,
    dto: {
      name?: string;
      description?: string;
      rulesText?: string;
      scoringFormat?: string;
      walkoverRule?: string;
      unfinishedMatchPolicy?: string;
      registrationOpensAt?: Date;
      registrationClosesAt?: Date;
      startsAt?: Date;
      roundCount?: number;
      roundIntervalMinutes?: number;
      capacity?: number;
      cancelReason?: string;
      state?: LeagueState;
    },
  ) {
    const current = await this.prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        registrationOpensAt: true,
        registrationClosesAt: true,
        startsAt: true,
      },
    });
    if (!current) throw new NotFoundException('League not found.');

    this.assertCompetitionWindow({
      registrationOpensAt:
        dto.registrationOpensAt ?? current.registrationOpensAt ?? undefined,
      registrationClosesAt:
        dto.registrationClosesAt ?? current.registrationClosesAt ?? undefined,
      startsAt: dto.startsAt ?? current.startsAt ?? undefined,
    });

    const data: Record<string, unknown> = { ...dto };
    if ('rulesText' in data) {
      data.rulesText = sanitizeRichText(data.rulesText as string | undefined);
    }
    if (dto.cancelReason) {
      data.cancelledAt = new Date();
    }

    const league = await this.prisma.league.update({
      where: { id: leagueId },
      data,
      include: { rounds: { select: { index: true, closedAt: true } } },
    });
    return this.toLeagueSummary(league);
  }

  /**
   * Registration must open before it closes, and close on or before the
   * competition starts. Skipped for any bound that isn't set yet — a league
   * can be drafted with no dates and filled in later.
   */
  private assertCompetitionWindow(dto: {
    registrationOpensAt?: Date;
    registrationClosesAt?: Date;
    startsAt?: Date;
  }) {
    if (
      dto.registrationOpensAt &&
      dto.registrationClosesAt &&
      dto.registrationOpensAt >= dto.registrationClosesAt
    ) {
      throw new BadRequestException('Registration must open before it closes.');
    }
    if (
      dto.registrationClosesAt &&
      dto.startsAt &&
      dto.registrationClosesAt > dto.startsAt
    ) {
      throw new BadRequestException(
        'Registration must close on or before the league starts.',
      );
    }
  }

  async updateRegistration(
    registrationId: string,
    status: LeagueRegistrationStatus,
  ) {
    const registration = await this.prisma.leagueRegistration.update({
      where: { id: registrationId },
      data: { status },
    });
    return { id: registration.id, status: registration.status };
  }

  /**
   * Admin-triggered fixture generation — distinct from `ensureLeagueProgressed`,
   * which only generates rounds once `now >= league.startsAt`. Doc 4's
   * "Generate fixtures once registration closes" is a different condition,
   * so this calls the same pure `generateRounds`/`openRound` machinery
   * directly rather than waiting for the date gate. Idempotent — a no-op if
   * rounds already exist.
   */
  async adminGenerateFixtures(leagueId: string) {
    const league = await this.loadLeague(leagueId);
    if (!league.startsAt || !league.roundCount) {
      throw new BadRequestException(
        'Set the start date and number of rounds before generating fixtures.',
      );
    }
    const roundCount = await this.prisma.round.count({ where: { leagueId } });
    if (roundCount === 0) {
      await this.generateLeagueRounds(league);
    }
    await this.openRound(leagueId, 1);
    return this.getCurrentRound(leagueId);
  }

  /** Only takes effect before the fixture's match exists (before its round
   * opens) — reassigning sides on a fixture that already has a live match
   * would desync the two. */
  async updateFixture(
    fixtureId: string,
    dto: { sideAUserId?: string; sideBUserId?: string },
  ) {
    const fixture = await this.prisma.fixture.findUniqueOrThrow({
      where: { id: fixtureId },
    });
    if (fixture.matchId) {
      throw new BadRequestException(
        'This fixture already has a scheduled match — cancel it first before reassigning players.',
      );
    }
    const updated = await this.prisma.fixture.update({
      where: { id: fixtureId },
      data: { sideAUserId: dto.sideAUserId, sideBUserId: dto.sideBUserId },
    });
    return { id: updated.id };
  }

  /** Every open dispute across this club's leagues — the queue M7 left
   * with no admin ruling path. */
  async listDisputesForClub(clubId: string) {
    const fixtures = await this.prisma.fixture.findMany({
      where: {
        round: { league: { clubId } },
        match: { state: MatchState.DISPUTED },
      },
      include: {
        round: true,
        match: { include: matchInclude },
        sideA: { include: playerInclude },
        sideB: { include: playerInclude },
      },
    });
    return {
      disputes: fixtures.map((f) => ({
        fixtureId: f.id,
        leagueId: f.round.leagueId,
        sideA: toPlayerSummary(f.sideA, null),
        sideB: f.sideB ? toPlayerSummary(f.sideB, null) : null,
        match: f.match ? toMatchDto(f.match, f.sideAUserId) : null,
      })),
    };
  }

  // ---------------------------------------------------------------- helpers

  private async loadLeague(leagueId: string) {
    const league = await this.prisma.league.findUnique({
      where: { id: leagueId },
      include: { rounds: { select: { index: true, closedAt: true } } },
    });
    if (!league) {
      throw new NotFoundException('League not found.');
    }
    return league;
  }

  private async toLeagueSummary(
    league: {
      id: string;
      clubId: string | null;
      sport: string;
      name: string;
      description: string | null;
      rulesText: string | null;
      scoringFormat: string | null;
      walkoverRule: string | null;
      unfinishedMatchPolicy: string | null;
      format: string;
      state: LeagueState;
      registrationOpensAt: Date | null;
      registrationClosesAt: Date | null;
      startsAt: Date | null;
      roundCount: number | null;
      roundIntervalMinutes: number;
      capacity: number | null;
      cancelledAt: Date | null;
      completedAt: Date | null;
      rounds: { index: number; closedAt: Date | null }[];
    },
    viewerRegistrationStatus: LeagueRegistrationStatus | null = null,
  ) {
    const enrolledCount = await this.prisma.leagueRegistration.count({
      where: { leagueId: league.id, status: LeagueRegistrationStatus.ENROLLED },
    });
    return {
      id: league.id,
      clubId: league.clubId,
      sport: league.sport,
      name: league.name,
      description: league.description,
      rulesText: league.rulesText,
      scoringFormat: league.scoringFormat,
      walkoverRule: league.walkoverRule,
      unfinishedMatchPolicy: league.unfinishedMatchPolicy,
      format: league.format,
      state: league.state,
      competitionState: effectiveCompetitionState(
        league,
        this.isFinalRoundClosedFromRounds(league.roundCount, league.rounds),
      ),
      registrationOpensAt: league.registrationOpensAt?.toISOString() ?? null,
      registrationClosesAt: league.registrationClosesAt?.toISOString() ?? null,
      startsAt: league.startsAt?.toISOString() ?? null,
      roundCount: league.roundCount,
      roundIntervalMinutes: league.roundIntervalMinutes,
      capacity: league.capacity,
      enrolledCount,
      completedAt: league.completedAt?.toISOString() ?? null,
      cancelledAt: league.cancelledAt?.toISOString() ?? null,
      viewerRegistrationStatus,
    };
  }

  private isFinalRoundClosedFromRounds(
    roundCount: number | null,
    rounds: { index: number; closedAt: Date | null }[],
  ): boolean {
    if (!roundCount) return false;
    const finalRound = rounds.find((r) => r.index === roundCount);
    return Boolean(finalRound?.closedAt);
  }

  private async isFinalRoundClosed(league: {
    id: string;
    roundCount: number | null;
  }): Promise<boolean> {
    if (!league.roundCount) return false;
    const finalRound = await this.prisma.round.findUnique({
      where: {
        leagueId_index: { leagueId: league.id, index: league.roundCount },
      },
    });
    return Boolean(finalRound?.closedAt);
  }

  private async toRoundDto(roundId: string) {
    const round = await this.prisma.round.findUniqueOrThrow({
      where: { id: roundId },
      include: {
        fixtures: {
          include: {
            sideA: { include: playerInclude },
            sideB: { include: playerInclude },
            match: { include: matchInclude },
          },
        },
      },
    });

    return {
      id: round.id,
      leagueId: round.leagueId,
      index: round.index,
      deadline: round.deadline,
      openedAt: round.openedAt,
      closedAt: round.closedAt,
      fixtures: round.fixtures.map((f) => ({
        id: f.id,
        sideA: toPlayerSummary(f.sideA, null),
        sideB: f.sideB ? toPlayerSummary(f.sideB, null) : null,
        isBye: f.sideBUserId === null,
        match: f.match ? toMatchDto(f.match, f.sideAUserId) : null,
      })),
    };
  }

  /**
   * Computed fresh from fixture/match data on every call rather than read
   * from the persisted `Standing` snapshot — results should reflect on
   * Standings the moment they're confirmed (§5), not just when a round
   * closes. The persisted snapshot exists only to answer "what was the rank
   * as of the last round close", for the movement arrow.
   */
  private async liveStandingRows(leagueId: string): Promise<StandingRow[]> {
    const fixtures = await this.prisma.fixture.findMany({
      where: { round: { leagueId }, matchId: { not: null } },
      include: {
        match: { include: matchInclude },
        sideA: { select: { id: true, firstName: true, lastName: true } },
        sideB: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const tally = new Map<
      string,
      { displayName: string; wins: number; losses: number }
    >();
    const ensure = (
      userId: string,
      user: { firstName: string | null; lastName: string | null },
    ) => {
      let entry = tally.get(userId);
      if (!entry) {
        entry = {
          displayName: this.matches.displayName(user),
          wins: 0,
          losses: 0,
        };
        tally.set(userId, entry);
      }
      return entry;
    };

    for (const fixture of fixtures) {
      ensure(fixture.sideAUserId, fixture.sideA);
      if (fixture.sideBUserId && fixture.sideB) {
        ensure(fixture.sideBUserId, fixture.sideB);
      }
      if (!fixture.match || !fixture.sideBUserId) continue;

      const state = effectiveState(fixture.match);
      // WALKOVER is a neutral no-result; DISPUTED is pending and not yet
      // decisive — neither counts toward a win or a loss.
      if (state !== MatchState.COMPLETED && state !== MatchState.RETIRED) {
        continue;
      }
      const winSide = fixture.match.result?.winningSide;
      if (!winSide) continue;

      const winnerId =
        winSide === MatchSide.A ? fixture.sideAUserId : fixture.sideBUserId;
      const loserId =
        winSide === MatchSide.A ? fixture.sideBUserId : fixture.sideAUserId;
      tally.get(winnerId)!.wins++;
      tally.get(loserId)!.losses++;
    }

    const records: StandingsPlayerRecord[] = [...tally.entries()].map(
      ([userId, v]) => ({ userId, ...v }),
    );
    return computeStandings(records);
  }

  /** Persists this moment's standings as the baseline for the *next*
   * round's movement arrow. Only called from `closeRoundAndAdvance`. */
  private async snapshotStandings(leagueId: string) {
    const before = await this.prisma.standing.findMany({
      where: { leagueId },
    });
    const beforeRank = new Map(before.map((s) => [s.userId, s.rank]));
    const liveRows = await this.liveStandingRows(leagueId);

    await this.prisma.$transaction(
      liveRows.map((row) =>
        this.prisma.standing.upsert({
          where: { leagueId_userId: { leagueId, userId: row.userId } },
          create: {
            leagueId,
            userId: row.userId,
            rank: row.rank,
            points: row.points,
            wins: row.wins,
            losses: row.losses,
            previousRank: beforeRank.get(row.userId) ?? null,
          },
          update: {
            rank: row.rank,
            points: row.points,
            wins: row.wins,
            losses: row.losses,
            previousRank: beforeRank.get(row.userId) ?? null,
          },
        }),
      ),
    );
  }

  // ---------------------------------------------------- lazy progression

  /**
   * Called at the top of every league/round/standings read. Idempotent —
   * safe to call on every request, same "derive on read" discipline as
   * `effectiveState()` for a single match's expiry.
   */
  async ensureLeagueProgressed(leagueId: string): Promise<void> {
    const league = await this.prisma.league.findUnique({
      where: { id: leagueId },
    });
    if (!league || league.cancelledAt || league.completedAt) return;
    if (!league.startsAt || !league.roundCount) return;

    const now = Date.now();

    if (now >= league.startsAt.getTime()) {
      const roundCount = await this.prisma.round.count({ where: { leagueId } });
      if (roundCount === 0) {
        await this.generateLeagueRounds(league);
        await this.openRound(leagueId, 1);
      }
    }

    const openRoundRow = await this.prisma.round.findFirst({
      where: { leagueId, openedAt: { not: null }, closedAt: null },
    });
    if (openRoundRow && openRoundRow.deadline.getTime() < now) {
      await this.closeRoundAndAdvance(league, openRoundRow);
    }
  }

  private async generateLeagueRounds(league: {
    id: string;
    startsAt: Date | null;
    roundCount: number | null;
    roundIntervalMinutes: number;
  }) {
    if (!league.startsAt || !league.roundCount) return;

    const registrations = await this.prisma.leagueRegistration.findMany({
      where: { leagueId: league.id, status: LeagueRegistrationStatus.ENROLLED },
      orderBy: { registeredAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            tennisProfile: {
              select: { userSelectedLevel: true, systemSuggestedLevel: true },
            },
          },
        },
      },
    });
    // Fewer than 2 enrolled players — no competition to run. No rounds get
    // generated; a re-read after more players register (before startsAt)
    // or an operator fixing the data is the only way forward.
    if (registrations.length < 2) return;

    // M15 — seed by level so players meet nearest-level opponents first:
    // sort strongest-first, then fold so the circle method's round-1
    // opposite-end pairing lands adjacent seeds together.
    const byLevel = [...registrations].sort(
      (a, b) =>
        playerCompetitionLevel(b.user.tennisProfile) -
        playerCompetitionLevel(a.user.tennisProfile),
    );
    const playerIds = foldForNearestSeed(byLevel.map((r) => r.user.id));

    const schedule = generateRounds(playerIds, league.roundCount);
    const startsAt = league.startsAt;

    for (const roundPairing of schedule) {
      const deadline = new Date(
        startsAt.getTime() +
          roundPairing.index * league.roundIntervalMinutes * MINUTE_MS,
      );
      await this.prisma.round.create({
        data: {
          leagueId: league.id,
          index: roundPairing.index,
          deadline,
          fixtures: {
            create: roundPairing.pairs.map(([sideA, sideB]) => ({
              sideAUserId: sideA,
              sideBUserId: sideB,
            })),
          },
        },
      });
    }
  }

  private async openRound(leagueId: string, index: number) {
    const round = await this.prisma.round.findUnique({
      where: { leagueId_index: { leagueId, index } },
      include: {
        fixtures: true,
        league: true,
      },
    });
    if (!round || round.openedAt) return;

    for (const fixture of round.fixtures) {
      if (!fixture.sideBUserId) continue; // a bye — nothing to schedule
      const match = await this.matches.createFixtureMatch(
        fixture.sideAUserId,
        fixture.sideBUserId,
        round.league.format,
        `You've been paired for Round ${round.index} of ${round.league.name}.`,
      );
      await this.prisma.fixture.update({
        where: { id: fixture.id },
        data: { matchId: match.id },
      });
    }

    await this.prisma.round.update({
      where: { id: round.id },
      data: { openedAt: new Date() },
    });

    await this.notifyRoundOpened(leagueId, round.index, round.league.name);
  }

  private async notifyRoundOpened(
    leagueId: string,
    roundIndex: number,
    leagueName: string,
  ) {
    const registered = await this.prisma.leagueRegistration.findMany({
      where: { leagueId, status: LeagueRegistrationStatus.ENROLLED },
      select: { userId: true },
    });
    await Promise.all(
      registered.map((r) =>
        this.notifications.create(
          r.userId,
          'COMPETITIONS',
          `Round ${roundIndex} is now open`,
          `${leagueName} — check your fixture and get a time agreed.`,
          'LEAGUE',
          leagueId,
        ),
      ),
    );
  }

  private async closeRoundAndAdvance(
    league: { id: string; roundCount: number | null },
    round: { id: string; index: number },
  ) {
    const fixtures = await this.prisma.fixture.findMany({
      where: { roundId: round.id },
      include: { match: { include: matchInclude } },
    });

    for (const fixture of fixtures) {
      if (!fixture.match) continue; // bye
      const state = effectiveState(fixture.match);
      if (!UNPLAYED_STATES.includes(state)) continue;

      assertTransition(state, MatchState.WALKOVER);
      await this.prisma.match.update({
        where: { id: fixture.matchId! },
        data: { state: MatchState.WALKOVER },
      });
      const fresh = await this.matches.loadMatch(fixture.matchId!);
      await this.matches.announce(
        fresh,
        'The round deadline passed before this fixture was played — recorded as an unplayed walkover, in favour of neither player.',
        'fixture_unplayed_walkover',
      );
    }

    await this.snapshotStandings(league.id);
    await this.prisma.round.update({
      where: { id: round.id },
      data: { closedAt: new Date() },
    });

    if (league.roundCount && round.index < league.roundCount) {
      await this.openRound(league.id, round.index + 1);
    } else {
      await this.prisma.league.update({
        where: { id: league.id },
        data: { completedAt: new Date() },
      });
    }
  }
}
