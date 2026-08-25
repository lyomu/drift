import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TournamentState, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { buildDraw, isPowerOfTwo } from './tournament-bracket';

const ALLOWED_DRAWS = [4, 8, 16, 32];

@Injectable()
export class TournamentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matches: MatchesService,
  ) {}

  // ------------------------------------------------------------------ read

  async listForClub(clubId: string) {
    return { tournaments: await this.prisma.tournament.findMany({
      where: { clubId },
      orderBy: { createdAt: 'desc' },
      include: { club: { select: { id: true, name: true } }, _count: { select: { entries: true } } },
    }) };
  }

  async list(clubId?: string) {
    const tournaments = await this.prisma.tournament.findMany({
      where: {
        ...(clubId ? { clubId } : {}),
        state: { in: ['REGISTRATION_OPEN', 'RUNNING', 'COMPLETED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        club: { select: { id: true, name: true } },
        _count: { select: { entries: true } },
      },
      take: 100,
    });
    return { tournaments };
  }

  async detail(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        club: { select: { id: true, name: true } },
        entries: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        rounds: {
          orderBy: { index: 'asc' },
          include: {
            fixtures: {
              orderBy: { slotIndex: 'asc' },
              include: {
                sideA: { select: { id: true, firstName: true, lastName: true } },
                sideB: { select: { id: true, firstName: true, lastName: true } },
                match: { select: { id: true, state: true } },
              },
            },
          },
        },
      },
    });
    if (!tournament) throw new NotFoundException('Tournament not found.');
    return { tournament };
  }

  // ----------------------------------------------------------------- write

  async create(clubId: string, data: { name: string; description?: string; drawSize: number; registrationClosesAt: Date }) {
    if (!ALLOWED_DRAWS.includes(data.drawSize)) {
      throw new BadRequestException(`drawSize must be one of ${ALLOWED_DRAWS.join(', ')}.`);
    }
    return this.prisma.tournament.create({
      data: {
        clubId,
        name: data.name,
        description: data.description,
        drawSize: data.drawSize,
        registrationClosesAt: data.registrationClosesAt,
      },
    });
  }

  async join(tournamentId: string, userId: string) {
    const tournament = await this.load(tournamentId);
    if (tournament.state !== TournamentState.REGISTRATION_OPEN) {
      throw new BadRequestException('Registration is not open for this tournament.');
    }
    if (tournament.registrationClosesAt < new Date()) {
      throw new BadRequestException('Registration has closed.');
    }
    const count = await this.prisma.tournamentEntry.count({ where: { tournamentId } });
    if (count >= tournament.drawSize) {
      throw new BadRequestException('The draw is full.');
    }
    const entry = await this.prisma.tournamentEntry.create({
      data: { tournamentId, userId },
    });
    return entry;
  }

  async leave(tournamentId: string, userId: string) {
    const tournament = await this.load(tournamentId);
    if (tournament.state === TournamentState.RUNNING) {
      throw new BadRequestException('The tournament is already running.');
    }
    await this.prisma.tournamentEntry.deleteMany({ where: { tournamentId, userId } });
    return { left: true };
  }

  /**
   * Builds the seeded draw from current entries. Byes auto-advance at
   * generation time; the first round with real matches marks the
   * tournament RUNNING.
   */
  async generateDraw(tournamentId: string) {
    const tournament = await this.load(tournamentId);
    if (tournament.state !== TournamentState.REGISTRATION_OPEN && tournament.state !== TournamentState.DRAFT) {
      throw new BadRequestException('The draw has already been generated.');
    }
    const entries = await this.prisma.tournamentEntry.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'asc' },
    });
    if (entries.length < 2) {
      throw new BadRequestException('At least two entries are required to draw.');
    }

    const bracket = buildDraw(
      entries.map((e, i) => ({ userId: e.userId, seed: e.seed ?? (e.seed === null ? null : i + 1) })),
      tournament.drawSize,
    );

    await this.prisma.$transaction(async (tx) => {
      for (const round of bracket) {
        await tx.tournamentRound.create({
          data: {
            tournamentId,
            index: round.index,
            fixtures: {
              create: round.slots.map((s) => ({
                slotIndex: s.slotIndex,
                sideAUserId: s.sideAUserId,
                sideBUserId: s.sideBUserId,
                isBye: s.isBye,
              })),
            },
          },
        });
      }
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { state: TournamentState.RUNNING },
      });
    });

    // Auto-advance byes (and cascade any rounds that complete by bye alone).
    await this.propagateByes(tournamentId);

    // First-round real pairings get their Match rows immediately, so Enter
    // Result works from the bracket.
    const firstRound = await this.prisma.tournamentRound.findFirst({
      where: { tournamentId, index: 1 },
      include: { fixtures: true },
    });
    if (firstRound) {
      for (const fixture of firstRound.fixtures) {
        if (!fixture.isBye && !fixture.matchId && fixture.sideAUserId && fixture.sideBUserId) {
          const record = await this.matches.createFixtureMatch(
            fixture.sideAUserId,
            fixture.sideBUserId,
            'SINGLES',
            `Tournament: your ${tournament.name} first-round match is ready.`,
          );
          await this.prisma.tournamentFixture.update({
            where: { id: fixture.id },
            data: { matchId: record.id },
          });
        }
      }
    }

    return this.detail(tournamentId);
  }

  async cancel(tournamentId: string) {
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { state: TournamentState.CANCELLED },
    });
    return { cancelled: true };
  }

  // -------------------------------------------------------- result hook

  /**
   * Called from ResultsService.settle for every confirmed result. If the
   * match belongs to a tournament fixture: stamp the winner, fill the next
   * round slot, create the next-round Match when its pair is complete, and
   * complete the tournament when the final is decided.
   */
  async onMatchSettled(matchId: string, winnerUserId: string | null) {
    const fixture = await this.prisma.tournamentFixture.findUnique({
      where: { matchId },
      include: { round: true },
    });
    if (!fixture || !winnerUserId) return;

    await this.prisma.tournamentFixture.update({
      where: { id: fixture.id },
      data: { winnerUserId },
    });

    const next = {
      roundIndex: fixture.round.index + 1,
      slotIndex: Math.floor(fixture.slotIndex / 2),
    };
    const nextRound = await this.prisma.tournamentRound.findUnique({
      where: { tournamentId_index: { tournamentId: fixture.round.tournamentId, index: next.roundIndex } },
    });
    if (!nextRound) {
      // The final was decided.
      await this.prisma.tournament.update({
        where: { id: fixture.round.tournamentId },
        data: { state: TournamentState.COMPLETED },
      });
      return;
    }

    const nextFixture = await this.prisma.tournamentFixture.findUnique({
      where: { roundId_slotIndex: { roundId: nextRound.id, slotIndex: next.slotIndex } },
    });
    if (!nextFixture) return;

    const data: Prisma.TournamentFixtureUpdateInput =
      fixture.slotIndex % 2 === 0
        ? { sideA: { connect: { id: winnerUserId } } }
        : { sideB: { connect: { id: winnerUserId } } };
    await this.prisma.tournamentFixture.update({ where: { id: nextFixture.id }, data });

    // When the next round's pair is complete, create its Match.
    const filled = await this.prisma.tournamentFixture.findUnique({
      where: { id: nextFixture.id },
    });
    if (
      filled &&
      !filled.matchId &&
      filled.sideAUserId &&
      filled.sideBUserId &&
      !filled.isBye
    ) {
      const record = await this.matches.createFixtureMatch(
        filled.sideAUserId,
        filled.sideBUserId,
        'SINGLES',
        'Your next tournament match is ready.',
      );
      await this.prisma.tournamentFixture.update({
        where: { id: filled.id },
        data: { matchId: record.id },
      });
    }
  }

  // ------------------------------------------------------------- internals

  /**
   * Bye fixtures advance without a match. Cascades: a round whose slots are
   * all decided propagates the same way, including tournament completion.
   */
  private async propagateByes(tournamentId: string) {
    let progressing = true;
    while (progressing) {
      progressing = false;
      const rounds = await this.prisma.tournamentRound.findMany({
        where: { tournamentId },
        orderBy: { index: 'asc' },
        include: { fixtures: true },
      });

      for (const round of rounds) {
        for (const fixture of round.fixtures) {
          // A bye with a present player and no recorded winner: advance them.
          if (fixture.isBye && !fixture.winnerUserId) {
            const winner = fixture.sideAUserId ?? fixture.sideBUserId;
            if (winner) {
              await this.onMatchSettled(fixture.matchId ?? 'bye', winner).catch(() => {
                /* no match linked — fall through to the direct path below */
              });
              await this.prisma.tournamentFixture.update({
                where: { id: fixture.id },
                data: { winnerUserId: winner },
              });
              await this.fillNextFrom(round.tournamentId, round.index, fixture.slotIndex, winner);
              progressing = true;
            }
          }
        }
      }

      // Completion check: final round fully decided.
      const last = rounds[rounds.length - 1];
      if (last && last.fixtures.every((f) => f.winnerUserId)) {
        await this.prisma.tournament.updateMany({
          where: { id: tournamentId, state: TournamentState.RUNNING },
          data: { state: TournamentState.COMPLETED },
        });
        progressing = false;
      }
    }
  }

  private async fillNextFrom(
    tournamentId: string,
    roundIndex: number,
    slotIndex: number,
    winnerUserId: string,
  ) {
    const nextRound = await this.prisma.tournamentRound.findUnique({
      where: { tournamentId_index: { tournamentId, index: roundIndex + 1 } },
    });
    if (!nextRound) return;
    const nextFixture = await this.prisma.tournamentFixture.findUnique({
      where: { roundId_slotIndex: { roundId: nextRound.id, slotIndex: Math.floor(slotIndex / 2) } },
    });
    if (!nextFixture) return;
    const data: Prisma.TournamentFixtureUpdateInput =
      slotIndex % 2 === 0
        ? { sideA: { connect: { id: winnerUserId } } }
        : { sideB: { connect: { id: winnerUserId } } };
    await this.prisma.tournamentFixture.update({ where: { id: nextFixture.id }, data });
  }

  private async load(id: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament) throw new NotFoundException('Tournament not found.');
    return tournament;
  }
}

// isPowerOfTwo re-exported for the DTO layer's validation message.
export { isPowerOfTwo };
