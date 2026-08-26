import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LadderChallengeState, LadderState } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { NotificationsService } from '../notifications/notifications.service';
import { canChallenge, resolvePositions } from './ladder-rules';

@Injectable()
export class LaddersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matches: MatchesService,
    private readonly notifications: NotificationsService,
  ) {}

  // ------------------------------------------------------------------ read

  async list(clubId?: string) {
    const ladders = await this.prisma.ladder.findMany({
      where: {
        ...(clubId ? { clubId } : {}),
        state: LadderState.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        club: { select: { id: true, name: true } },
        _count: { select: { entries: true } },
      },
      take: 100,
    });
    return { ladders };
  }

  async detail(id: string, viewerId?: string) {
    const ladder = await this.prisma.ladder.findUnique({
      where: { id },
      include: {
        club: { select: { id: true, name: true } },
        entries: {
          orderBy: { position: 'asc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        challenges: {
          where: { state: { in: ['PENDING', 'ACCEPTED'] } },
          include: {
            challenger: {
              select: { id: true, firstName: true, lastName: true },
            },
            defender: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!ladder) throw new NotFoundException('Ladder not found.');

    const myEntry = viewerId
      ? ladder.entries.find((e) => e.userId === viewerId)
      : undefined;

    return { ladder, myEntry: myEntry ?? null };
  }

  // ----------------------------------------------------------------- write

  async create(
    clubId: string,
    data: { name: string; challengeRange?: number },
  ) {
    return this.prisma.ladder.create({
      data: {
        clubId,
        name: data.name,
        challengeRange: data.challengeRange ?? 2,
      },
    });
  }

  async join(ladderId: string, userId: string) {
    const ladder = await this.load(ladderId);
    if (ladder.state !== LadderState.ACTIVE) {
      throw new BadRequestException('This ladder is archived.');
    }
    const existing = await this.prisma.ladderEntry.findUnique({
      where: { ladderId_userId: { ladderId, userId } },
    });
    if (existing)
      throw new BadRequestException('You are already on this ladder.');

    const max = await this.prisma.ladderEntry.aggregate({
      where: { ladderId },
      _max: { position: true },
    });
    const position = (max._max.position ?? 0) + 1;
    return this.prisma.ladderEntry.create({
      data: { ladderId, userId, position },
    });
  }

  async challenge(
    ladderId: string,
    challengerId: string,
    defenderUserId: string,
  ) {
    const ladder = await this.load(ladderId);
    if (ladder.state !== LadderState.ACTIVE) {
      throw new BadRequestException('This ladder is archived.');
    }

    const challenger = await this.prisma.ladderEntry.findUnique({
      where: { ladderId_userId: { ladderId, userId: challengerId } },
    });
    const defender = await this.prisma.ladderEntry.findUnique({
      where: { ladderId_userId: { ladderId, userId: defenderUserId } },
    });
    if (!challenger || !defender) {
      throw new BadRequestException('Both players must be on the ladder.');
    }
    if (challenger.userId === defender.userId) {
      throw new BadRequestException('You cannot challenge yourself.');
    }
    if (
      !canChallenge(
        challenger.position,
        defender.position,
        ladder.challengeRange,
      )
    ) {
      throw new BadRequestException(
        `You can only challenge players up to ${ladder.challengeRange} rungs above you.`,
      );
    }

    const pending = await this.prisma.ladderChallenge.findFirst({
      where: {
        ladderId,
        state: LadderChallengeState.PENDING,
        OR: [
          { challengerId, defenderId: defenderUserId },
          { challengerId: defenderUserId, defenderId: challengerId },
        ],
      },
    });
    if (pending) {
      throw new BadRequestException(
        'A challenge between you two is already open.',
      );
    }

    const created = await this.prisma.ladderChallenge.create({
      data: {
        ladderId,
        challengerId,
        defenderId: defenderUserId,
      },
    });

    await this.notifications.create(
      defenderUserId,
      'COMPETITIONS',
      'Ladder challenge',
      `You've been challenged on ${ladder.name}. Accept to schedule the match.`,
      'LADDER',
      ladderId,
    );

    return created;
  }

  async accept(actorId: string, challengeId: string) {
    const challenge = await this.loadChallenge(challengeId);
    if (challenge.state !== LadderChallengeState.PENDING) {
      throw new BadRequestException('This challenge is not pending.');
    }
    if (challenge.defenderId !== actorId) {
      throw new BadRequestException('Only the defender can accept.');
    }

    const record = await this.matches.createFixtureMatch(
      challenge.challengerId,
      challenge.defenderId,
      'SINGLES',
      'Ladder match scheduled — play and record the result.',
    );

    const updated = await this.prisma.ladderChallenge.update({
      where: { id: challengeId },
      data: { state: LadderChallengeState.ACCEPTED, matchId: record.id },
    });
    return updated;
  }

  async decline(actorId: string, challengeId: string) {
    const challenge = await this.loadChallenge(challengeId);
    if (challenge.state !== LadderChallengeState.PENDING) {
      throw new BadRequestException('This challenge is not pending.');
    }
    if (challenge.defenderId !== actorId) {
      throw new BadRequestException('Only the defender can decline.');
    }
    return this.prisma.ladderChallenge.update({
      where: { id: challengeId },
      data: { state: LadderChallengeState.DECLINED },
    });
  }

  async archive(ladderId: string) {
    await this.prisma.ladder.update({
      where: { id: ladderId },
      data: { state: LadderState.ARCHIVED },
    });
    return { archived: true };
  }

  async updatePositions(
    ladderId: string,
    entries: { entryId: string; position: number }[],
  ) {
    const ladder = await this.load(ladderId);
    if (ladder.state !== LadderState.ACTIVE) {
      throw new BadRequestException('Archived ladders cannot be reordered.');
    }
    const existing = await this.prisma.ladderEntry.findMany({
      where: { ladderId },
    });
    const ids = new Set(existing.map((entry) => entry.id));
    const positions = new Set(entries.map((entry) => entry.position));
    if (
      entries.length !== existing.length ||
      positions.size !== entries.length ||
      entries.some(
        (entry) =>
          !ids.has(entry.entryId) ||
          entry.position < 1 ||
          entry.position > entries.length,
      )
    ) {
      throw new BadRequestException(
        'Positions must uniquely cover every ladder entry.',
      );
    }
    await this.prisma.$transaction(
      entries.map((entry) =>
        this.prisma.ladderEntry.update({
          where: { id: entry.entryId },
          data: { position: entry.position },
        }),
      ),
    );
    return { reordered: true };
  }

  // -------------------------------------------------------- result hook

  /**
   * Called from ResultsService.settle for confirmed results. If the match
   * belongs to an ACCEPTED ladder challenge: apply the position rule, bump
   * W/L, and mark the challenge PLAYED.
   */
  async onMatchSettled(matchId: string, winnerUserId: string | null) {
    if (!winnerUserId) return;
    const challenge = await this.prisma.ladderChallenge.findUnique({
      where: { matchId },
      include: { ladder: true },
    });
    if (!challenge || challenge.state !== LadderChallengeState.ACCEPTED) return;

    const challenger = await this.prisma.ladderEntry.findUnique({
      where: {
        ladderId_userId: {
          ladderId: challenge.ladderId,
          userId: challenge.challengerId,
        },
      },
    });
    const defender = await this.prisma.ladderEntry.findUnique({
      where: {
        ladderId_userId: {
          ladderId: challenge.ladderId,
          userId: challenge.defenderId,
        },
      },
    });
    if (!challenger || !defender) return;

    const result = resolvePositions(
      { userId: challenger.userId, position: challenger.position },
      { userId: defender.userId, position: defender.position },
      winnerUserId,
    );

    await this.prisma.$transaction([
      this.prisma.ladderEntry.update({
        where: {
          ladderId_userId: {
            ladderId: challenge.ladderId,
            userId: result.winnerUserId,
          },
        },
        data: { position: result.winnerPosition, wins: { increment: 1 } },
      }),
      this.prisma.ladderEntry.update({
        where: {
          ladderId_userId: {
            ladderId: challenge.ladderId,
            userId: result.loserUserId,
          },
        },
        data: { position: result.loserPosition, losses: { increment: 1 } },
      }),
      this.prisma.ladderChallenge.update({
        where: { id: challenge.id },
        data: { state: LadderChallengeState.PLAYED },
      }),
    ]);
  }
  // ------------------------------------------------------------- internals

  private async load(id: string) {
    const ladder = await this.prisma.ladder.findUnique({ where: { id } });
    if (!ladder) throw new NotFoundException('Ladder not found.');
    return ladder;
  }

  private async loadChallenge(id: string) {
    const challenge = await this.prisma.ladderChallenge.findUnique({
      where: { id },
    });
    if (!challenge) throw new NotFoundException('Challenge not found.');
    return challenge;
  }
}
