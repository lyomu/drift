import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeagueState,
  MatchFormat,
  MatchSide,
  MatchSport,
  MatchState,
  SeasonRegistrationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { assertTransition, effectiveState } from '../matches/match-state';
import { matchInclude, toMatchDto } from '../matches/match.mapper';
import { playerInclude, toPlayerSummary } from '../players/player.mapper';
import { generateRounds } from './round-robin';
import {
  PlayerRecord as StandingsPlayerRecord,
  StandingRow,
  computeStandings,
} from './standings';
import { effectiveSeasonState, isRegistrationOpen } from './season-state';
import { NotificationsService } from '../notifications/notifications.service';

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
      include: { seasons: { orderBy: { startsAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return { leagues: leagues.map((l) => this.toLeagueSummary(l)) };
  }

  async getLeague(leagueId: string) {
    const league = await this.loadLeague(leagueId);
    return this.toLeagueSummary(league);
  }

  async getSeason(seasonId: string, userId: string) {
    await this.ensureSeasonProgressed(seasonId);
    const season = await this.loadSeason(seasonId);
    const finalRoundClosed = await this.isFinalRoundClosed(season);
    const registration = await this.prisma.seasonRegistration.findUnique({
      where: { seasonId_userId: { seasonId, userId } },
    });
    const enrolledCount = await this.prisma.seasonRegistration.count({
      where: { seasonId, status: SeasonRegistrationStatus.ENROLLED },
    });

    return {
      id: season.id,
      leagueId: season.leagueId,
      leagueName: season.league.name,
      label: season.label,
      state: effectiveSeasonState(season, finalRoundClosed),
      registrationOpensAt: season.registrationOpensAt,
      registrationClosesAt: season.registrationClosesAt,
      startsAt: season.startsAt,
      roundCount: season.roundCount,
      enrolledCount,
      capacity: season.capacity,
      viewerRegistrationStatus: registration?.status ?? null,
    };
  }

  async getRegisteredPlayers(seasonId: string) {
    await this.loadSeason(seasonId);
    const registrations = await this.prisma.seasonRegistration.findMany({
      where: {
        seasonId,
        status: {
          in: [
            SeasonRegistrationStatus.ENROLLED,
            SeasonRegistrationStatus.WAITLISTED,
          ],
        },
      },
      include: { user: { include: playerInclude } },
      orderBy: { registeredAt: 'asc' },
    });
    return {
      // registrationId included alongside the player so Club Admin can
      // target PATCH /seasons/:id/registrations/:registrationId directly
      // from this same list — no separate admin-only read path needed.
      players: registrations.map((r) => ({
        registrationId: r.id,
        status: r.status,
        player: toPlayerSummary(r.user, null),
      })),
    };
  }

  async getMySeasons(userId: string) {
    const registrations = await this.prisma.seasonRegistration.findMany({
      where: {
        userId,
        status: {
          in: [
            SeasonRegistrationStatus.ENROLLED,
            SeasonRegistrationStatus.WAITLISTED,
          ],
        },
      },
      include: { season: { include: { league: true } } },
      orderBy: { season: { startsAt: 'desc' } },
    });

    return {
      seasons: await Promise.all(
        registrations.map(async (r) => {
          const finalRoundClosed = await this.isFinalRoundClosed(r.season);
          return {
            seasonId: r.season.id,
            leagueId: r.season.leagueId,
            leagueName: r.season.league.name,
            label: r.season.label,
            state: effectiveSeasonState(r.season, finalRoundClosed),
            registrationStatus: r.status,
          };
        }),
      ),
    };
  }

  async getCurrentRound(seasonId: string) {
    await this.ensureSeasonProgressed(seasonId);
    const round = await this.prisma.round.findFirst({
      where: { seasonId, openedAt: { not: null } },
      orderBy: { index: 'desc' },
    });
    if (!round) {
      return { round: null };
    }
    return { round: await this.toRoundDto(round.id) };
  }

  async getRound(seasonId: string, roundId: string) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
    });
    if (!round || round.seasonId !== seasonId) {
      throw new NotFoundException('Round not found.');
    }
    return { round: await this.toRoundDto(roundId) };
  }

  async getStandings(seasonId: string) {
    await this.ensureSeasonProgressed(seasonId);
    const season = await this.loadSeason(seasonId);
    const liveRows = await this.liveStandingRows(seasonId);
    const snapshot = await this.prisma.standing.findMany({
      where: { seasonId },
    });
    const snapshotRank = new Map(snapshot.map((s) => [s.userId, s.rank]));

    return {
      standings: liveRows.map((row) => ({
        ...row,
        previousRank: snapshotRank.get(row.userId) ?? null,
      })),
      seasonState: effectiveSeasonState(
        season,
        await this.isFinalRoundClosed(season),
      ),
    };
  }

  // ------------------------------------------------------------- actions

  async register(userId: string, seasonId: string) {
    const season = await this.loadSeason(seasonId);
    if (!isRegistrationOpen(season)) {
      throw new BadRequestException(
        'Registration is not open for this season.',
      );
    }

    const existing = await this.prisma.seasonRegistration.findUnique({
      where: { seasonId_userId: { seasonId, userId } },
    });
    if (existing && existing.status !== SeasonRegistrationStatus.WITHDRAWN) {
      throw new BadRequestException(
        "You're already registered for this season.",
      );
    }

    const enrolledCount = await this.prisma.seasonRegistration.count({
      where: { seasonId, status: SeasonRegistrationStatus.ENROLLED },
    });
    const status =
      season.capacity != null && enrolledCount >= season.capacity
        ? SeasonRegistrationStatus.WAITLISTED
        : SeasonRegistrationStatus.ENROLLED;

    const registration = await this.prisma.seasonRegistration.upsert({
      where: { seasonId_userId: { seasonId, userId } },
      create: { seasonId, userId, status },
      update: { status, registeredAt: new Date() },
    });

    // Registration outcome notifications (the batch Wave 1.4 deferred —
    // a player who registers should never have to discover their status
    // by reopening the screen).
    if (registration.status === SeasonRegistrationStatus.ENROLLED) {
      await this.notifications.create(
        userId,
        'COMPETITIONS',
        "You're registered",
        `${season.league.name} — ${season.label}. We'll let you know when your round opens.`,
        'SEASON',
        seasonId,
      );
    } else {
      await this.notifications.create(
        userId,
        'COMPETITIONS',
        "You're on the waitlist",
        `${season.league.name} — ${season.label} is full. You move in automatically if a spot opens.`,
        'SEASON',
        seasonId,
      );
    }

    return { status: registration.status };
  }

  async withdraw(userId: string, seasonId: string) {
    const season = await this.loadSeason(seasonId);
    if (Date.now() >= season.startsAt.getTime()) {
      throw new BadRequestException(
        'You can no longer withdraw once the season has started.',
      );
    }

    await this.prisma.seasonRegistration.updateMany({
      where: { seasonId, userId },
      data: { status: SeasonRegistrationStatus.WITHDRAWN },
    });

    if (season.capacity != null) {
      const nextWaiting = await this.prisma.seasonRegistration.findFirst({
        where: { seasonId, status: SeasonRegistrationStatus.WAITLISTED },
        orderBy: { registeredAt: 'asc' },
      });
      if (nextWaiting) {
        await this.prisma.seasonRegistration.update({
          where: { id: nextWaiting.id },
          data: { status: SeasonRegistrationStatus.ENROLLED },
        });
        // The promotion must never be silent again (PROGRESS.md carried
        // forward since Wave 1.4): the player believes they're still queued.
        await this.notifications.create(
          nextWaiting.userId,
          'COMPETITIONS',
          "You're in",
          `A spot opened up in ${season.league.name} — ${season.label}. You've been enrolled.`,
          'SEASON',
          seasonId,
        );
      }
    }
    return { withdrawn: true };
  }

  // ---------------------------------------------------- club-admin writes
  //
  // Phase M14 — the create/manage-league surface M8 explicitly deferred
  // ("no create/manage-league API or screen at all"). Reuses every read
  // path and the lazy-progression engine above unmodified; these are the
  // first writes against League/Season/Fixture/SeasonRegistration.

  async leagueClubId(leagueId: string): Promise<string | null> {
    const league = await this.prisma.league.findUnique({
      where: { id: leagueId },
      select: { clubId: true },
    });
    if (!league) throw new NotFoundException('League not found.');
    return league.clubId;
  }

  async seasonClubId(seasonId: string): Promise<string | null> {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      select: { league: { select: { clubId: true } } },
    });
    if (!season) throw new NotFoundException('Season not found.');
    return season.league.clubId;
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
        round: {
          select: {
            season: { select: { league: { select: { clubId: true } } } },
          },
        },
      },
    });
    if (!fixture) throw new NotFoundException('Fixture not found.');
    return fixture.round.season.league.clubId;
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
      sport?: MatchSport;
      format?: MatchFormat;
    },
  ) {
    const league = await this.prisma.league.create({
      data: {
        clubId,
        name: dto.name,
        description: dto.description,
        rulesText: dto.rulesText,
        sport: dto.sport,
        format: dto.format,
        state: LeagueState.DRAFT,
      },
    });
    return this.toLeagueSummary({ ...league, seasons: [] });
  }

  async listSeasonArchive(clubId: string) {
    const seasons = await this.prisma.season.findMany({
      where: { league: { clubId }, OR: [{ completedAt: { not: null } }, { cancelledAt: { not: null } }] },
      include: {
        league: { select: { id: true, name: true } },
        standings: { orderBy: { rank: 'asc' }, include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        awards: { orderBy: { issuedAt: 'desc' }, include: { recipient: { select: { id: true, firstName: true, lastName: true } } } },
      },
      orderBy: { startsAt: 'desc' },
    });
    return { seasons };
  }

  async completeSeason(seasonId: string) {
    const season = await this.prisma.season.update({ where: { id: seasonId }, data: { completedAt: new Date() } });
    return { id: season.id, completedAt: season.completedAt };
  }

  async issueSeasonAward(seasonId: string, issuedById: string, input: { recipientId: string; title: string; notes?: string }) {
    const registration = await this.prisma.seasonRegistration.findUnique({
      where: { seasonId_userId: { seasonId, userId: input.recipientId } },
    });
    if (!registration) throw new BadRequestException('Awards can only be issued to season participants.');
    const award = await this.prisma.seasonAward.create({ data: { seasonId, issuedById, ...input } });
    return { award };
  }

  async listLeaguesForClub(clubId: string) {
    const leagues = await this.prisma.league.findMany({
      where: { clubId },
      include: { seasons: { orderBy: { startsAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return { leagues: leagues.map((l) => this.toLeagueSummary(l)) };
  }

  async updateLeague(
    leagueId: string,
    dto: {
      name?: string;
      description?: string;
      rulesText?: string;
      state?: LeagueState;
    },
  ) {
    const league = await this.prisma.league.update({
      where: { id: leagueId },
      data: dto,
      include: { seasons: { orderBy: { startsAt: 'desc' } } },
    });
    return this.toLeagueSummary(league);
  }

  async createSeason(
    leagueId: string,
    dto: {
      label: string;
      registrationOpensAt: Date;
      registrationClosesAt: Date;
      startsAt: Date;
      roundCount: number;
      roundIntervalMinutes?: number;
      capacity?: number;
    },
  ) {
    if (dto.registrationOpensAt >= dto.registrationClosesAt) {
      throw new BadRequestException('Registration must open before it closes.');
    }
    if (dto.registrationClosesAt > dto.startsAt) {
      throw new BadRequestException(
        'Registration must close on or before the season starts.',
      );
    }
    const season = await this.prisma.season.create({
      data: { leagueId, ...dto },
    });
    return { id: season.id };
  }

  async updateSeason(
    seasonId: string,
    dto: {
      label?: string;
      registrationOpensAt?: Date;
      registrationClosesAt?: Date;
      startsAt?: Date;
      capacity?: number;
      cancelReason?: string;
    },
  ) {
    const data: Record<string, unknown> = { ...dto };
    if (dto.cancelReason) {
      data.cancelledAt = new Date();
    }
    const season = await this.prisma.season.update({
      where: { id: seasonId },
      data,
      include: { league: true },
    });
    return {
      id: season.id,
      label: season.label,
      registrationOpensAt: season.registrationOpensAt,
      registrationClosesAt: season.registrationClosesAt,
      startsAt: season.startsAt,
      capacity: season.capacity,
      cancelledAt: season.cancelledAt,
    };
  }

  async updateRegistration(
    registrationId: string,
    status: SeasonRegistrationStatus,
  ) {
    const registration = await this.prisma.seasonRegistration.update({
      where: { id: registrationId },
      data: { status },
    });
    return { id: registration.id, status: registration.status };
  }

  /**
   * Admin-triggered fixture generation — distinct from `ensureSeasonProgressed`
   * above, which only generates rounds once `now >= season.startsAt`. Doc 4's
   * "Generate fixtures once registration closes" is a different condition,
   * so this calls the same pure `generateRounds`/`openRound` machinery
   * directly rather than waiting for the date gate. Idempotent — a no-op if
   * rounds already exist.
   */
  async adminGenerateFixtures(seasonId: string) {
    const season = await this.loadSeason(seasonId);
    const roundCount = await this.prisma.round.count({ where: { seasonId } });
    if (roundCount === 0) {
      await this.generateSeasonRounds(season);
    }
    await this.openRound(seasonId, 1);
    return this.getCurrentRound(seasonId);
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
        round: { season: { league: { clubId } } },
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
        seasonId: f.round.seasonId,
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
      include: { seasons: { orderBy: { startsAt: 'desc' } } },
    });
    if (!league) {
      throw new NotFoundException('League not found.');
    }
    return league;
  }

  private async loadSeason(seasonId: string) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      include: { league: true },
    });
    if (!season) {
      throw new NotFoundException('Season not found.');
    }
    return season;
  }

  private toLeagueSummary(league: {
    id: string;
    sport: string;
    name: string;
    description: string | null;
    rulesText: string | null;
    scoringFormat: string | null;
    walkoverRule: string | null;
    unfinishedMatchPolicy: string | null;
    format: string;
    seasons: { id: string; label: string }[];
  }) {
    return {
      id: league.id,
      sport: league.sport,
      name: league.name,
      description: league.description,
      rulesText: league.rulesText,
      scoringFormat: league.scoringFormat,
      walkoverRule: league.walkoverRule,
      unfinishedMatchPolicy: league.unfinishedMatchPolicy,
      format: league.format,
      seasons: league.seasons.map((s) => ({
        id: s.id,
        label: s.label,
      })),
    };
  }

  private async isFinalRoundClosed(season: {
    id: string;
    roundCount: number;
  }): Promise<boolean> {
    const finalRound = await this.prisma.round.findUnique({
      where: {
        seasonId_index: { seasonId: season.id, index: season.roundCount },
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
      seasonId: round.seasonId,
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
  private async liveStandingRows(seasonId: string): Promise<StandingRow[]> {
    const fixtures = await this.prisma.fixture.findMany({
      where: { round: { seasonId }, matchId: { not: null } },
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
  private async snapshotStandings(seasonId: string) {
    const before = await this.prisma.standing.findMany({
      where: { seasonId },
    });
    const beforeRank = new Map(before.map((s) => [s.userId, s.rank]));
    const liveRows = await this.liveStandingRows(seasonId);

    await this.prisma.$transaction(
      liveRows.map((row) =>
        this.prisma.standing.upsert({
          where: { seasonId_userId: { seasonId, userId: row.userId } },
          create: {
            seasonId,
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
   * Called at the top of every season/round/standings read. Idempotent —
   * safe to call on every request, same "derive on read" discipline as
   * `effectiveState()` for a single match's expiry.
   */
  async ensureSeasonProgressed(seasonId: string): Promise<void> {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
    });
    if (!season || season.cancelledAt || season.completedAt) return;

    const now = Date.now();

    if (now >= season.startsAt.getTime()) {
      const roundCount = await this.prisma.round.count({ where: { seasonId } });
      if (roundCount === 0) {
        await this.generateSeasonRounds(season);
        await this.openRound(seasonId, 1);
      }
    }

    const openRoundRow = await this.prisma.round.findFirst({
      where: { seasonId, openedAt: { not: null }, closedAt: null },
    });
    if (openRoundRow && openRoundRow.deadline.getTime() < now) {
      await this.closeRoundAndAdvance(season, openRoundRow);
    }
  }

  private async generateSeasonRounds(season: {
    id: string;
    startsAt: Date;
    roundCount: number;
    roundIntervalMinutes: number;
  }) {
    const registrations = await this.prisma.seasonRegistration.findMany({
      where: { seasonId: season.id, status: SeasonRegistrationStatus.ENROLLED },
      orderBy: { registeredAt: 'asc' },
    });
    const playerIds = registrations.map((r) => r.userId);
    // Fewer than 2 enrolled players — no season to run. No rounds get
    // generated; a re-read after more players register (before startsAt)
    // or an operator fixing the seed data is the only way forward. Not a
    // crash, just an inert season.
    if (playerIds.length < 2) return;

    const schedule = generateRounds(playerIds, season.roundCount);

    for (const roundPairing of schedule) {
      const deadline = new Date(
        season.startsAt.getTime() +
          roundPairing.index * season.roundIntervalMinutes * MINUTE_MS,
      );
      await this.prisma.round.create({
        data: {
          seasonId: season.id,
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

  private async openRound(seasonId: string, index: number) {
    const round = await this.prisma.round.findUnique({
      where: { seasonId_index: { seasonId, index } },
      include: {
        fixtures: true,
        season: { include: { league: true } },
      },
    });
    if (!round || round.openedAt) return;

    for (const fixture of round.fixtures) {
      if (!fixture.sideBUserId) continue; // a bye — nothing to schedule
      const match = await this.matches.createFixtureMatch(
        fixture.sideAUserId,
        fixture.sideBUserId,
        round.season.league.format,
        `You've been paired for Round ${round.index} of ${round.season.league.name}.`,
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

    await this.notifyRoundOpened(
      seasonId,
      round.index,
      round.season.league.name,
    );
  }

  private async notifyRoundOpened(
    seasonId: string,
    roundIndex: number,
    leagueName: string,
  ) {
    const registered = await this.prisma.seasonRegistration.findMany({
      where: { seasonId, status: SeasonRegistrationStatus.ENROLLED },
      select: { userId: true },
    });
    await Promise.all(
      registered.map((r) =>
        this.notifications.create(
          r.userId,
          'COMPETITIONS',
          `Round ${roundIndex} is now open`,
          `${leagueName} — check your fixture and get a time agreed.`,
          'SEASON',
          seasonId,
        ),
      ),
    );
  }

  private async closeRoundAndAdvance(
    season: { id: string; roundCount: number },
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

    await this.snapshotStandings(season.id);
    await this.prisma.round.update({
      where: { id: round.id },
      data: { closedAt: new Date() },
    });

    if (round.index < season.roundCount) {
      await this.openRound(season.id, round.index + 1);
    } else {
      await this.prisma.season.update({ where: { id: season.id }, data: { completedAt: new Date() } });
    }
  }
}
