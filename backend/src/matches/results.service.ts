import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  MatchFormat,
  MatchResultOutcome,
  MatchResultStatus,
  MatchSide,
  MatchSport,
  MatchState,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertTransition } from './match-state';
import { MatchRecord } from './match.mapper';
import { MatchesService } from './matches.service';
import { applyDoublesResult, applyResult, seedRating } from './rating';
import { matchWinner, SetScore } from './score';
import { ReflectionDto } from './dto/reflection.dto';
import { ResultVersionDto } from './dto/result-version.dto';

/** The Match.state a confirmed outcome settles into. */
const SETTLED_STATE: Record<MatchResultOutcome, MatchState> = {
  [MatchResultOutcome.SCORE]: MatchState.COMPLETED,
  [MatchResultOutcome.WALKOVER]: MatchState.WALKOVER,
  [MatchResultOutcome.RETIREMENT]: MatchState.RETIRED,
};

interface Version {
  outcome: MatchResultOutcome;
  sets: SetScore[] | null;
  winningSide: MatchSide | null;
}

/** Prisma's Json input type doesn't accept a plain array type directly. */
function toJsonInput(
  sets: SetScore[] | null,
): Prisma.InputJsonValue | undefined {
  return sets ? (sets as unknown as Prisma.InputJsonValue) : undefined;
}

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matches: MatchesService,
    // Wave 6: optional competition settlement hook (provided globally by the
    // competitions module). Optional so matches stays dependency-free.
    @Optional()
    @Inject('COMPETITIONS_SETTLEMENT')
    private readonly settlement?: {
      onMatchSettled(
        matchId: string,
        winnerUserId: string | null,
      ): Promise<void>;
    },
  ) {}

  // ---------------------------------------------------------------- helpers

  /** Derives winningSide server-side for SCORE; trusts the caller only for
   * the two outcomes with no score to derive it from. */
  private resolveVersion(dto: ResultVersionDto): Version {
    if (dto.outcome === MatchResultOutcome.SCORE) {
      const sets = (dto.sets ?? []) as SetScore[];
      return { outcome: dto.outcome, sets, winningSide: matchWinner(sets) };
    }
    if (
      dto.outcome === MatchResultOutcome.RETIREMENT &&
      dto.winningSide === undefined
    ) {
      throw new BadRequestException('State who won after the retirement.');
    }
    return {
      outcome: dto.outcome,
      sets: null,
      winningSide: dto.winningSide ?? null,
    };
  }

  private sameVersion(a: Version, b: Version): boolean {
    if (a.outcome !== b.outcome || a.winningSide !== b.winningSide) {
      return false;
    }
    const setsA = a.sets ?? [];
    const setsB = b.sets ?? [];
    if (setsA.length !== setsB.length) return false;
    return setsA.every((set, i) => {
      const other = setsB[i];
      return (
        set.sideAGames === other.sideAGames &&
        set.sideBGames === other.sideBGames &&
        (set.sideATiebreak ?? null) === (other.sideATiebreak ?? null) &&
        (set.sideBTiebreak ?? null) === (other.sideBTiebreak ?? null)
      );
    });
  }

  /** Throws unless `userId` is on the side opposite whoever submitted. */
  private assertOpposingSide(
    match: MatchRecord,
    submittedById: string,
    userId: string,
  ) {
    const submitter = match.participants.find(
      (p) => p.userId === submittedById,
    );
    const caller = match.participants.find((p) => p.userId === userId);
    if (!submitter || !caller || caller.side === submitter.side) {
      throw new ForbiddenException(
        'Only someone on the other side of the match can do that.',
      );
    }
  }

  /**
   * Applies a settled outcome: rating update (SCORE/RETIREMENT with a
   * winner only — a WALKOVER "in favour of neither" rates nobody) and the
   * match-state transition. Shared by an ordinary confirm and a resubmit
   * that happens to land both parties on the same version.
   */
  private async settle(
    match: MatchRecord,
    version: Version,
    confirmedById: string | null,
    confirmedByPlatformAdminId?: string,
  ): Promise<{ ratingDeltaA: number | null; ratingDeltaB: number | null }> {
    const state = this.matches.assertLive(match);
    const target = SETTLED_STATE[version.outcome];
    assertTransition(state, target);

    let ratingDeltaA: number | null = null;
    let ratingDeltaB: number | null = null;

    if (version.winningSide) {
      const sideA = match.participants.filter((p) => p.side === MatchSide.A);
      const sideB = match.participants.filter((p) => p.side === MatchSide.B);
      const isDoubles = match.format === MatchFormat.DOUBLES;
      const isPadel = match.sport === MatchSport.PADEL;
      const field = isDoubles ? 'doublesRating' : 'singlesRating';

      // Padel has no `userSelectedLevel`-equivalent override (no adjust-level
      // step in that phase's scope, see PROGRESS.md) — falls back straight
      // to the assessment-derived `systemSuggestedLevel` instead.
      const ratingOf = (p: (typeof sideA)[number]) => {
        const stored = isPadel
          ? isDoubles
            ? p.user.padelProfile?.doublesRating
            : p.user.padelProfile?.singlesRating
          : isDoubles
            ? p.user.tennisProfile?.doublesRating
            : p.user.tennisProfile?.singlesRating;
        const fallback = isPadel
          ? p.user.padelProfile?.systemSuggestedLevel
          : p.user.tennisProfile?.userSelectedLevel;
        return seedRating(stored ?? fallback ?? null);
      };

      const updateRating = (userId: string, value: number) =>
        isPadel
          ? this.prisma.padelProfile.update({
              where: { userId },
              data: { [field]: value },
            })
          : this.prisma.tennisProfile.update({
              where: { userId },
              data: { [field]: value },
            });

      if (isDoubles && sideA.length === 2 && sideB.length === 2) {
        const { deltaA, deltaB } = applyDoublesResult(
          [ratingOf(sideA[0]), ratingOf(sideA[1])],
          [ratingOf(sideB[0]), ratingOf(sideB[1])],
          version.winningSide === MatchSide.A,
        );
        ratingDeltaA = deltaA;
        ratingDeltaB = deltaB;
        for (const p of sideA) {
          await updateRating(p.userId, ratingOf(p) + deltaA);
        }
        for (const p of sideB) {
          await updateRating(p.userId, ratingOf(p) + deltaB);
        }
      } else if (sideA[0] && sideB[0]) {
        const { deltaA, deltaB } = applyResult(
          ratingOf(sideA[0]),
          ratingOf(sideB[0]),
          version.winningSide === MatchSide.A ? 1 : 0,
        );
        ratingDeltaA = deltaA;
        ratingDeltaB = deltaB;
        await updateRating(sideA[0].userId, ratingOf(sideA[0]) + deltaA);
        await updateRating(sideB[0].userId, ratingOf(sideB[0]) + deltaB);
      }
    }

    await this.prisma.$transaction([
      this.prisma.matchResult.update({
        where: { matchId: match.id },
        data: {
          status: MatchResultStatus.CONFIRMED,
          // Player/club-admin confirmation carries a User id; platform
          // rulings (Wave 5) carry the staff id in its own column instead.
          confirmedById: confirmedByPlatformAdminId ? null : confirmedById,
          confirmedByPlatformAdminId: confirmedByPlatformAdminId ?? undefined,
          confirmedAt: new Date(),
          resolvedAt: new Date(),
          outcome: version.outcome,
          sets: toJsonInput(version.sets),
          winningSide: version.winningSide,
          ratingDeltaA,
          ratingDeltaB,
        },
      }),
      this.prisma.match.update({
        where: { id: match.id },
        data: { state: target },
      }),
    ]);

    // Wave 6 competition hooks: a settled result advances a tournament
    // bracket and/or resolves a ladder challenge. Must not fail the result
    // itself — competition bookkeeping is downstream.
    const winnerUserId = this.winnerOf(match, version.winningSide);
    await this.settlement
      ?.onMatchSettled(match.id, winnerUserId)
      .catch((e) =>
        this.logger.error(`competition settlement hook failed: ${e}`),
      );

    return { ratingDeltaA, ratingDeltaB };
  }

  private readonly logger = new Logger(ResultsService.name);

  private winnerOf(
    match: MatchRecord,
    winningSide: MatchSide | null,
  ): string | null {
    if (!winningSide) return null;
    const participant = match.participants.find((p) => p.side === winningSide);
    return participant?.userId ?? null;
  }

  // -------------------------------------------------------------- endpoints

  async submit(userId: string, matchId: string, dto: ResultVersionDto) {
    const { match } = await this.matches.loadForParticipant(matchId, userId);
    const state = this.matches.assertLive(match);
    if (state !== MatchState.SCHEDULED) {
      throw new BadRequestException(
        'Results can only be entered once a match is scheduled.',
      );
    }
    if (match.result) {
      throw new BadRequestException('A result has already been submitted.');
    }

    const version = this.resolveVersion(dto);

    await this.prisma.matchResult.create({
      data: {
        matchId,
        status: MatchResultStatus.PENDING_CONFIRMATION,
        outcome: version.outcome,
        sets: toJsonInput(version.sets),
        winningSide: version.winningSide,
        submittedById: userId,
      },
    });

    const final = await this.matches.loadMatch(matchId);
    const submitter = final.participants.find((p) => p.userId === userId)!;
    await this.matches.announce(
      final,
      `${this.matches.displayName(submitter.user)} submitted a result. Review it to confirm or dispute.`,
      'result_submitted',
    );
    // Doc 4 §A.4 lists Notification as the entry point for Opponent Review;
    // without this the opponent only finds out by opening the match thread.
    await this.matches.notifyOthers(
      final,
      userId,
      `${this.matches.displayName(submitter.user)} submitted a result`,
      'Review it to confirm or dispute.',
    );
    return final;
  }

  async confirm(userId: string, matchId: string) {
    const { match } = await this.matches.loadForParticipant(matchId, userId);
    const result = match.result;
    if (!result || result.status !== MatchResultStatus.PENDING_CONFIRMATION) {
      throw new NotFoundException('No result awaiting confirmation.');
    }
    this.assertOpposingSide(match, result.submittedById, userId);

    await this.settle(
      match,
      {
        outcome: result.outcome,
        sets: (result.sets as unknown as SetScore[] | null) ?? null,
        winningSide: result.winningSide,
      },
      userId,
    );

    const final = await this.matches.loadMatch(matchId);
    const confirmer = final.participants.find((p) => p.userId === userId)!;
    await this.matches.announce(
      final,
      `${this.matches.displayName(confirmer.user)} confirmed the result.`,
      'result_confirmed',
    );
    await this.matches.notifyOthers(
      final,
      userId,
      `${this.matches.displayName(confirmer.user)} confirmed your result`,
      'Your rating and stats are updated.',
    );
    return final;
  }

  async dispute(userId: string, matchId: string, dto: ResultVersionDto) {
    const { match } = await this.matches.loadForParticipant(matchId, userId);
    const state = this.matches.assertLive(match);
    const result = match.result;
    if (!result || result.status !== MatchResultStatus.PENDING_CONFIRMATION) {
      throw new NotFoundException('No result awaiting confirmation.');
    }
    this.assertOpposingSide(match, result.submittedById, userId);

    const version = this.resolveVersion(dto);
    assertTransition(state, MatchState.DISPUTED);

    await this.prisma.$transaction([
      this.prisma.matchResult.update({
        where: { matchId },
        data: {
          status: MatchResultStatus.DISPUTED,
          disputedById: userId,
          disputedAt: new Date(),
          disputantOutcome: version.outcome,
          disputantSets: toJsonInput(version.sets),
          disputantWinningSide: version.winningSide,
        },
      }),
      this.prisma.match.update({
        where: { id: matchId },
        data: { state: MatchState.DISPUTED },
      }),
    ]);

    const final = await this.matches.loadMatch(matchId);
    const disputer = final.participants.find((p) => p.userId === userId)!;
    await this.matches.announce(
      final,
      `${this.matches.displayName(disputer.user)} disputed the result.`,
      'result_disputed',
    );
    // Doc 4 §A.4 lists Notification as the entry point for Dispute Detail.
    await this.matches.notifyOthers(
      final,
      userId,
      `${this.matches.displayName(disputer.user)} disputed the result`,
      'Open the dispute to submit your version.',
    );
    return final;
  }

  /**
   * Either party revises their own stored version while DISPUTED. If it now
   * matches the other party's version, that's mutual re-confirmation —
   * Doc 6 §2's only resolution path this phase — and the match settles
   * automatically. Otherwise it stays DISPUTED with the (still-differing)
   * versions visible on both sides.
   */
  async resubmit(userId: string, matchId: string, dto: ResultVersionDto) {
    const { match, participant } = await this.matches.loadForParticipant(
      matchId,
      userId,
    );
    if (this.matches.assertLive(match) !== MatchState.DISPUTED) {
      throw new BadRequestException('This match has no open dispute.');
    }
    const result = match.result;
    if (!result || result.status !== MatchResultStatus.DISPUTED) {
      throw new NotFoundException('No open dispute.');
    }

    const submitter = match.participants.find(
      (p) => p.userId === result.submittedById,
    )!;
    const isSubmitterSlot = participant.side === submitter.side;

    const newVersion = this.resolveVersion(dto);
    const otherVersion: Version = isSubmitterSlot
      ? {
          outcome: result.disputantOutcome!,
          sets: (result.disputantSets as unknown as SetScore[] | null) ?? null,
          winningSide: result.disputantWinningSide,
        }
      : {
          outcome: result.outcome,
          sets: (result.sets as unknown as SetScore[] | null) ?? null,
          winningSide: result.winningSide,
        };

    if (this.sameVersion(newVersion, otherVersion)) {
      const confirmedById = isSubmitterSlot
        ? result.disputedById!
        : result.submittedById;
      await this.settle(match, newVersion, confirmedById);

      const final = await this.matches.loadMatch(matchId);
      await this.matches.announce(
        final,
        'Both sides now agree on the result — resolved.',
        'dispute_resolved',
      );
      await this.matches.notifyOthers(
        final,
        userId,
        'Your dispute is resolved',
        'Both versions match — ratings are updated.',
      );
      return final;
    }

    await this.prisma.matchResult.update({
      where: { matchId },
      data: isSubmitterSlot
        ? {
            outcome: newVersion.outcome,
            sets: toJsonInput(newVersion.sets),
            winningSide: newVersion.winningSide,
          }
        : {
            disputantOutcome: newVersion.outcome,
            disputantSets: toJsonInput(newVersion.sets),
            disputantWinningSide: newVersion.winningSide,
          },
    });

    const final = await this.matches.loadMatch(matchId);
    const actor = final.participants.find((p) => p.userId === userId)!;
    await this.matches.announce(
      final,
      `${this.matches.displayName(actor.user)} revised their version — still doesn't match.`,
      'result_disputed',
    );
    await this.matches.notifyOthers(
      final,
      userId,
      `${this.matches.displayName(actor.user)} revised their version`,
      'It still doesn’t match yours — take another look.',
    );
    return final;
  }

  /**
   * Phase M14 (Club Admin) — an admin ruling on an open dispute, bypassing
   * the player-only "both must agree" rule `resubmit` enforces above. This
   * is the admin path M7 documented as missing: "a dispute that never
   * converges just stays DISPUTED indefinitely" until now. Reuses `settle()`
   * exactly as the player-driven paths do — same rating engine, same
   * state transition — just invoked by an admin's ruling instead of mutual
   * re-confirmation.
   */
  async adminResolveDispute(
    matchId: string,
    adminUserId: string,
    ruling: 'SUBMITTED' | 'DISPUTANT',
    // Wave 5: platform staff are separate credentials, so the ruling's
    // attribution lands in confirmedByPlatformAdminId instead of the User
    // FK. Club-admin callers pass nothing and behave exactly as before.
    opts?: { platformAdminId?: string },
  ) {
    const match = await this.matches.loadMatch(matchId);
    if (this.matches.assertLive(match) !== MatchState.DISPUTED) {
      throw new BadRequestException('This match has no open dispute.');
    }
    const result = match.result;
    if (!result || result.status !== MatchResultStatus.DISPUTED) {
      throw new NotFoundException('No open dispute.');
    }

    const version: Version =
      ruling === 'SUBMITTED'
        ? {
            outcome: result.outcome,
            sets: (result.sets as unknown as SetScore[] | null) ?? null,
            winningSide: result.winningSide,
          }
        : {
            outcome: result.disputantOutcome!,
            sets:
              (result.disputantSets as unknown as SetScore[] | null) ?? null,
            winningSide: result.disputantWinningSide,
          };

    await this.settle(
      match,
      version,
      opts?.platformAdminId ? null : adminUserId,
      opts?.platformAdminId,
    );

    const final = await this.matches.loadMatch(matchId);
    await this.matches.announce(
      final,
      'A club admin ruled on this dispute — resolved.',
      'dispute_resolved',
    );
    // `null` because the ruling admin isn't a participant — every player
    // needs to hear this, including whoever's version was upheld.
    await this.matches.notifyOthers(
      final,
      null,
      'A club admin ruled on your dispute',
      'The result is final and ratings are updated.',
    );
    return final;
  }

  async submitReflection(userId: string, matchId: string, dto: ReflectionDto) {
    const { match } = await this.matches.loadForParticipant(matchId, userId);
    const state = this.matches.assertLive(match);
    const settled: MatchState[] = [
      MatchState.COMPLETED,
      MatchState.WALKOVER,
      MatchState.RETIRED,
    ];
    if (!settled.includes(state)) {
      throw new BadRequestException(
        'Reflections are only available once a match is settled.',
      );
    }

    await this.prisma.matchReflection.upsert({
      where: { matchId_userId: { matchId, userId } },
      create: { matchId, userId, confidence: dto.confidence, notes: dto.notes },
      update: { confidence: dto.confidence, notes: dto.notes },
    });

    return { saved: true };
  }
}
