import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MatchFormat,
  MatchSide,
  MatchSport,
  MatchState,
  OnboardingStep,
  ParticipantRole,
  ParticipantStatus,
  Prisma,
  TimeProposalStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { blockBetween } from '../common/relationship.util';
import { MessagingService } from '../messaging/messaging.service';
import { RealtimePublisher } from '../messaging/realtime.publisher';
import { MatchSystemEvent } from '../messaging/messaging.events';
import {
  ACTIVE_STATES,
  CHALLENGE_TTL_MS,
  HISTORY_STATES,
  MAX_PROPOSAL_ROUNDS,
  assertTransition,
  effectiveState,
} from './match-state';
import { MatchRecord, matchInclude, toMatchDto } from './match.mapper';
import { CreateMatchDto } from './dto/create-match.dto';
import { ProposeTimesDto } from './dto/propose-times.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
    private readonly realtime: RealtimePublisher,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------------------------------------------------------- helpers
  //
  // Not private: ResultsService (results.service.ts) is the second consumer
  // of the load/guard/announce trio, and depending on MatchesService for
  // them is simpler than extracting a third shared service for a two-user
  // set of helpers. MatchesService never depends on ResultsService, so
  // there's no cycle.

  async loadMatch(matchId: string): Promise<MatchRecord> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: matchInclude,
    });
    if (!match) {
      throw new NotFoundException('Match not found.');
    }
    return match;
  }

  /** Loads a match the viewer actually participates in. */
  async loadForParticipant(matchId: string, userId: string) {
    const match = await this.loadMatch(matchId);
    const participant = match.participants.find((p) => p.userId === userId);
    if (!participant) {
      // Non-participants can't distinguish "not yours" from "doesn't exist".
      throw new NotFoundException('Match not found.');
    }
    return { match, participant };
  }

  /**
   * Guards every action that assumes the match is still live. Uses the
   * effective state so a lapsed challenge can't be acted on even though the
   * stored row hasn't been swept.
   */
  assertLive(match: MatchRecord): MatchState {
    const state = effectiveState(match);
    if (state === MatchState.EXPIRED) {
      throw new BadRequestException('This challenge has expired.');
    }
    if (state === MatchState.CANCELLED) {
      throw new BadRequestException('This match was cancelled.');
    }
    return state;
  }

  displayName(user: { firstName: string | null; lastName: string | null }) {
    return (
      [user.firstName, user.lastName].filter(Boolean).join(' ') || 'A player'
    );
  }

  private async assertChallengeable(userId: string, otherId: string) {
    if (userId === otherId) {
      throw new BadRequestException('You cannot challenge yourself.');
    }
    const other = await this.prisma.user.findFirst({
      where: { id: otherId, onboardingStep: OnboardingStep.COMPLETE },
    });
    if (!other) {
      throw new NotFoundException('Player not found.');
    }
    const blocked = await this.prisma.block.findFirst({
      where: blockBetween(userId, otherId),
    });
    if (blocked) {
      throw new NotFoundException('Player not found.');
    }
    return other;
  }

  /**
   * Writes a system message into the match thread and pushes the update to
   * every participant. Called after each successful transition.
   */
  async announce(match: MatchRecord, body: string, event: MatchSystemEvent) {
    const conversationId = match.conversation?.id;
    if (conversationId) {
      await this.messaging.writeSystemMessage(
        conversationId,
        body,
        event,
        match.id,
      );
    }
    this.realtime.publishMatchUpdate(
      match.participants.map((p) => p.userId),
      { matchId: match.id, event },
    );
  }

  /**
   * The notification counterpart to [announce]. `announce` only reaches
   * someone who opens the match thread; this is what puts the same event in
   * their Notification Centre, so every transition below pairs the two.
   *
   * Fans out to every participant except `exceptUserId` — pass `null` when
   * the actor isn't a participant (an admin ruling on a dispute), and
   * everyone is notified. Correct for doubles without special-casing, since
   * `participants` holds all four players.
   *
   * `'MATCH'` + the match id is the deep-link contract the mobile
   * Notification Centre already switches on, so these arrive tappable.
   */
  async notifyOthers(
    match: MatchRecord,
    exceptUserId: string | null,
    title: string,
    body: string,
  ) {
    await Promise.all(
      match.participants
        .filter((p) => p.userId !== exceptUserId)
        .map((p) =>
          this.notifications.create(
            p.userId,
            'MATCHES',
            title,
            body,
            'MATCH',
            match.id,
          ),
        ),
    );
  }

  // ------------------------------------------------------------- challenges

  async create(userId: string, dto: CreateMatchDto) {
    const format = dto.format ?? MatchFormat.SINGLES;
    // Throws if the opponent doesn't exist, hasn't onboarded, or either
    // party has blocked the other.
    await this.assertChallengeable(userId, dto.opponentId);

    // Side A is the challenger's pair, side B the opponent's.
    const participants: Prisma.MatchParticipantCreateManyMatchInput[] = [
      {
        userId,
        side: MatchSide.A,
        role: ParticipantRole.CHALLENGER,
        // The challenger has consented by definition.
        status: ParticipantStatus.ACCEPTED,
        respondedAt: new Date(),
      },
      {
        userId: dto.opponentId,
        side: MatchSide.B,
        role: ParticipantRole.OPPONENT,
        status: ParticipantStatus.INVITED,
      },
    ];

    if (format === MatchFormat.DOUBLES) {
      if (!dto.partnerId) {
        throw new BadRequestException(
          'A doubles challenge needs your partner.',
        );
      }
      if (dto.partnerId === dto.opponentId) {
        throw new BadRequestException(
          'Your partner cannot also be your opponent.',
        );
      }
      await this.assertChallengeable(userId, dto.partnerId);
      participants.push({
        userId: dto.partnerId,
        side: MatchSide.A,
        role: ParticipantRole.PARTNER,
        status: ParticipantStatus.INVITED,
      });
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          sport: dto.sport ?? undefined,
          format,
          state: MatchState.PROPOSED,
          createdById: userId,
          expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
          participants: { createMany: { data: participants } },
        },
      });

      await this.messaging.ensureMatchConversation(
        match.id,
        participants.map((p) => p.userId),
        tx,
      );
      return match;
    });

    const match = await this.loadMatch(created.id);
    const challenger = match.participants.find((p) => p.userId === userId)!;
    await this.announce(
      match,
      `${this.displayName(challenger.user)} sent a ${format.toLowerCase()} challenge${
        dto.note ? `: "${dto.note}"` : '.'
      }`,
      'match_challenge_sent',
    );
    await this.notifications.create(
      dto.opponentId,
      'MATCHES',
      `${this.displayName(challenger.user)} challenged you to a match`,
      'Review the challenge and accept or decline.',
      'MATCH',
      match.id,
    );
    // The challenger's own partner is INVITED too and has to accept before
    // the match can progress — they get their own message rather than the
    // opponent's "challenged you", which would read as the wrong invitation.
    if (dto.partnerId) {
      await this.notifications.create(
        dto.partnerId,
        'MATCHES',
        `${this.displayName(challenger.user)} wants you as their doubles partner`,
        'Accept to join the match.',
        'MATCH',
        match.id,
      );
    }

    return toMatchDto(await this.loadMatch(created.id), userId);
  }

  /**
   * Accepting is per-participant. The match only leaves PROPOSED once every
   * invited player is in — for doubles that's all four, and the accepting
   * opponent nominates their own partner here.
   */
  async accept(userId: string, matchId: string, partnerId?: string) {
    const { match, participant } = await this.loadForParticipant(
      matchId,
      userId,
    );
    this.assertLive(match);

    if (participant.status === ParticipantStatus.ACCEPTED) {
      throw new BadRequestException("You've already accepted this match.");
    }
    if (effectiveState(match) !== MatchState.PROPOSED) {
      throw new BadRequestException(
        'This match is no longer awaiting replies.',
      );
    }

    const isOpponent = participant.role === ParticipantRole.OPPONENT;
    const needsPartner =
      match.format === MatchFormat.DOUBLES &&
      isOpponent &&
      !match.participants.some(
        (p) => p.side === MatchSide.B && p.role === ParticipantRole.PARTNER,
      );

    if (needsPartner && !partnerId) {
      throw new BadRequestException(
        'Choose your doubles partner to accept this match.',
      );
    }
    if (partnerId) {
      if (match.participants.some((p) => p.userId === partnerId)) {
        throw new BadRequestException('That player is already in this match.');
      }
      await this.assertChallengeable(userId, partnerId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.matchParticipant.update({
        where: { matchId_userId: { matchId, userId } },
        data: {
          status: ParticipantStatus.ACCEPTED,
          respondedAt: new Date(),
        },
      });

      if (needsPartner && partnerId) {
        await tx.matchParticipant.create({
          data: {
            matchId,
            userId: partnerId,
            side: MatchSide.B,
            role: ParticipantRole.PARTNER,
            status: ParticipantStatus.INVITED,
          },
        });
        if (match.conversation?.id) {
          await this.messaging.addParticipants(
            match.conversation.id,
            [partnerId],
            tx,
          );
        }
      }
    });

    // Re-read so the just-added partner counts toward the tally.
    const updated = await this.loadMatch(matchId);
    const everyoneIn = updated.participants.every(
      (p) => p.status === ParticipantStatus.ACCEPTED,
    );

    if (everyoneIn) {
      assertTransition(updated.state, MatchState.SCHEDULING);
      await this.prisma.match.update({
        where: { id: matchId },
        data: { state: MatchState.SCHEDULING },
      });
    }

    const final = await this.loadMatch(matchId);
    await this.announce(
      final,
      everyoneIn
        ? 'Everyone is in — time to agree a time.'
        : `${this.displayName(participant.user)} accepted. Waiting on the rest.`,
      'match_challenge_accepted',
    );
    // A nominated partner is INVITED, not accepted — they need the invite,
    // not the news that someone else accepted, so they're notified
    // separately and excluded from the fan-out below.
    if (needsPartner && partnerId) {
      await this.notifications.create(
        partnerId,
        'MATCHES',
        `${this.displayName(participant.user)} wants you as their doubles partner`,
        'Accept to join the match.',
        'MATCH',
        final.id,
      );
    }
    await Promise.all(
      final.participants
        .filter((pt) => pt.userId !== userId && pt.userId !== partnerId)
        .map((pt) =>
          this.notifications.create(
            pt.userId,
            'MATCHES',
            everyoneIn
              ? 'Everyone is in — agree a time'
              : `${this.displayName(participant.user)} accepted your challenge`,
            everyoneIn
              ? 'Propose a time to get the match scheduled.'
              : 'Waiting on the rest of the players.',
            'MATCH',
            final.id,
          ),
        ),
    );

    return toMatchDto(final, userId);
  }

  async decline(userId: string, matchId: string) {
    const { match, participant } = await this.loadForParticipant(
      matchId,
      userId,
    );
    this.assertLive(match);

    if (participant.role === ParticipantRole.CHALLENGER) {
      throw new BadRequestException(
        'Cancel the match instead of declining your own challenge.',
      );
    }

    const state = effectiveState(match);
    assertTransition(state, MatchState.CANCELLED);

    await this.prisma.$transaction([
      this.prisma.matchParticipant.update({
        where: { matchId_userId: { matchId, userId } },
        data: {
          status: ParticipantStatus.DECLINED,
          respondedAt: new Date(),
        },
      }),
      // One decline collapses the whole match — there's no partial match to
      // salvage, and §4.2 is explicit that a decline closes it with no
      // penalty state on either side.
      this.prisma.match.update({
        where: { id: matchId },
        data: {
          state: MatchState.CANCELLED,
          cancelledById: userId,
          cancelledAt: new Date(),
          cancelReason: 'Declined',
        },
      }),
    ]);

    const final = await this.loadMatch(matchId);
    await this.announce(
      final,
      `${this.displayName(participant.user)} declined the challenge.`,
      'match_challenge_declined',
    );
    await this.notifyOthers(
      final,
      userId,
      `${this.displayName(participant.user)} declined your challenge`,
      'Find another opponent when you’re ready.',
    );

    return toMatchDto(final, userId);
  }

  // ------------------------------------------------------------- scheduling

  async proposeTimes(userId: string, matchId: string, dto: ProposeTimesDto) {
    const { match } = await this.loadForParticipant(matchId, userId);
    const state = this.assertLive(match);

    if (state !== MatchState.SCHEDULING && state !== MatchState.RESCHEDULED) {
      throw new BadRequestException(
        'Times can only be proposed once everyone has accepted.',
      );
    }

    const open = match.timeProposals.find(
      (p) => p.status === TimeProposalStatus.PENDING,
    );
    if (open && open.proposedById === userId) {
      throw new BadRequestException(
        "You've already proposed — it's their turn to reply.",
      );
    }

    const nextRound = match.proposalRound + 1;
    if (nextRound > MAX_PROPOSAL_ROUNDS) {
      throw new BadRequestException(
        `After ${MAX_PROPOSAL_ROUNDS} rounds it's easier to sort this out in chat.`,
      );
    }

    const past = dto.options.filter((o) => o.getTime() < Date.now());
    if (past.length > 0) {
      throw new BadRequestException('Proposed times must be in the future.');
    }

    await this.prisma.$transaction(async (tx) => {
      if (open) {
        await tx.timeProposal.update({
          where: { id: open.id },
          data: { status: TimeProposalStatus.SUPERSEDED },
        });
      }
      await tx.timeProposal.create({
        data: {
          matchId,
          proposedById: userId,
          round: nextRound,
          options: {
            createMany: { data: dto.options.map((startsAt) => ({ startsAt })) },
          },
        },
      });
      await tx.match.update({
        where: { id: matchId },
        data: { proposalRound: nextRound },
      });
    });

    const final = await this.loadMatch(matchId);
    const proposer = final.participants.find((p) => p.userId === userId)!;
    await this.announce(
      final,
      `${this.displayName(proposer.user)} proposed ${dto.options.length} time${
        dto.options.length === 1 ? '' : 's'
      }.`,
      'match_time_proposed',
    );
    await this.notifyOthers(
      final,
      userId,
      `${this.displayName(proposer.user)} proposed a time`,
      'Pick one that works or counter with your own.',
    );

    return toMatchDto(final, userId);
  }

  async acceptTime(userId: string, matchId: string, optionId: string) {
    const { match } = await this.loadForParticipant(matchId, userId);
    const state = this.assertLive(match);

    const proposal = match.timeProposals.find(
      (p) => p.status === TimeProposalStatus.PENDING,
    );
    if (!proposal) {
      throw new BadRequestException('There is no open time proposal.');
    }
    if (proposal.proposedById === userId) {
      throw new BadRequestException('You cannot accept your own proposal.');
    }

    const option = proposal.options.find((o) => o.id === optionId);
    if (!option) {
      throw new BadRequestException('That time is not on offer.');
    }

    assertTransition(state, MatchState.SCHEDULED);

    await this.prisma.$transaction([
      this.prisma.timeProposal.update({
        where: { id: proposal.id },
        data: {
          status: TimeProposalStatus.ACCEPTED,
          respondedById: userId,
          respondedAt: new Date(),
          acceptedOptionId: optionId,
        },
      }),
      this.prisma.match.update({
        where: { id: matchId },
        data: {
          state: MatchState.SCHEDULED,
          confirmedTime: option.startsAt,
          // A scheduled match no longer lapses.
          expiresAt: null,
        },
      }),
    ]);

    const final = await this.loadMatch(matchId);
    await this.announce(
      final,
      `Match confirmed for ${option.startsAt.toISOString()}.`,
      'match_confirmed',
    );
    await this.notifyOthers(
      final,
      userId,
      'Your match is confirmed',
      `Locked in for ${option.startsAt.toISOString()}.`,
    );

    return toMatchDto(final, userId);
  }

  async suggestCourt(
    userId: string,
    matchId: string,
    courtName: string,
    courtNote?: string,
    courtId?: string,
  ) {
    const { match } = await this.loadForParticipant(matchId, userId);
    this.assertLive(match);

    if (courtId) {
      const court = await this.prisma.court.findUnique({
        where: { id: courtId },
        select: { id: true },
      });
      if (!court) {
        throw new NotFoundException('Court not found.');
      }
    }

    await this.prisma.match.update({
      where: { id: matchId },
      data: { courtName, courtNote, courtId: courtId ?? null },
    });

    const final = await this.loadMatch(matchId);
    const suggester = final.participants.find((p) => p.userId === userId)!;
    await this.announce(
      final,
      `${this.displayName(suggester.user)} suggested ${courtName}.`,
      'match_court_suggested',
    );
    await this.notifyOthers(
      final,
      userId,
      `${this.displayName(suggester.user)} suggested a court`,
      courtName,
    );

    return toMatchDto(final, userId);
  }

  /** Reopens negotiation on an already-scheduled match. */
  async reschedule(userId: string, matchId: string) {
    const { match } = await this.loadForParticipant(matchId, userId);
    const state = this.assertLive(match);

    assertTransition(state, MatchState.RESCHEDULED);

    await this.prisma.$transaction([
      this.prisma.match.update({
        where: { id: matchId },
        data: {
          state: MatchState.RESCHEDULED,
          confirmedTime: null,
          // Reset the negotiation budget — this is a fresh round of talks,
          // not a continuation of the one that already succeeded.
          proposalRound: 0,
          expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
        },
      }),
      this.prisma.timeProposal.updateMany({
        where: { matchId, status: TimeProposalStatus.PENDING },
        data: { status: TimeProposalStatus.SUPERSEDED },
      }),
    ]);

    const final = await this.loadMatch(matchId);
    const actor = final.participants.find((p) => p.userId === userId)!;
    await this.announce(
      final,
      `${this.displayName(actor.user)} asked to reschedule.`,
      'match_rescheduled',
    );
    await this.notifyOthers(
      final,
      userId,
      `${this.displayName(actor.user)} wants to reschedule`,
      'Propose a new time to get it back on.',
    );

    return toMatchDto(final, userId);
  }

  async cancel(userId: string, matchId: string, reason?: string) {
    const { match } = await this.loadForParticipant(matchId, userId);
    const state = this.assertLive(match);

    assertTransition(state, MatchState.CANCELLED);

    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        state: MatchState.CANCELLED,
        cancelledById: userId,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    const final = await this.loadMatch(matchId);
    const actor = final.participants.find((p) => p.userId === userId)!;
    await this.announce(
      final,
      `${this.displayName(actor.user)} cancelled the match${reason ? `: ${reason}` : '.'}`,
      'match_cancelled',
    );
    await this.notifyOthers(
      final,
      userId,
      `${this.displayName(actor.user)} cancelled the match`,
      reason ?? 'No reason given.',
    );

    return toMatchDto(final, userId);
  }

  // ------------------------------------------------------------------ reads

  /**
   * `challenges` = still being agreed; `active` = agreed, awaiting play, or
   * disputed; `history` = settled. Mirrors the Play Hub segments in
   * `foundation/04-screen-inventory.md` §A.4.
   */
  async list(
    userId: string,
    segment: 'challenges' | 'active' | 'history' | 'all' = 'all',
    sport?: MatchSport,
  ) {
    const stateFilter =
      segment === 'history'
        ? HISTORY_STATES
        : segment === 'all'
          ? undefined
          : ACTIVE_STATES;

    const matches = await this.prisma.match.findMany({
      where: {
        participants: { some: { userId } },
        ...(stateFilter ? { state: { in: stateFilter } } : {}),
        ...(sport ? { sport } : {}),
      },
      include: matchInclude,
      orderBy: { updatedAt: 'desc' },
    });

    const dtos = matches.map((m) => toMatchDto(m, userId));

    if (segment === 'challenges') {
      return {
        matches: dtos.filter(
          (m) =>
            m.state === MatchState.PROPOSED ||
            m.state === MatchState.SCHEDULING ||
            m.state === MatchState.RESCHEDULED,
        ),
      };
    }
    if (segment === 'active') {
      return {
        matches: dtos.filter(
          (m) =>
            m.state === MatchState.SCHEDULED || m.state === MatchState.DISPUTED,
        ),
      };
    }
    return { matches: dtos };
  }

  async findOne(userId: string, matchId: string) {
    const { match } = await this.loadForParticipant(matchId, userId);
    return toMatchDto(match, userId);
  }

  // -------------------------------------------------------------- fixtures
  //
  // Second consumer, same pattern as ResultsService above: CompetitionsService
  // (Phase M8) calls this to turn a round's pairing into a real Match.
  // Pairing is mandatory (a league fixture, not an opt-in challenge), so
  // there's no PROPOSED/accept negotiation — both sides start ACCEPTED and
  // the match goes straight into SCHEDULING, which every downstream flow
  // (proposeTimes/acceptTime/suggestCourt/results) already handles unchanged.

  async createFixtureMatch(
    sideAUserId: string,
    sideBUserId: string,
    format: MatchFormat,
    announceBody: string,
  ): Promise<MatchRecord> {
    const participants: Prisma.MatchParticipantCreateManyMatchInput[] = [
      {
        userId: sideAUserId,
        side: MatchSide.A,
        role: ParticipantRole.OPPONENT,
        status: ParticipantStatus.ACCEPTED,
        respondedAt: new Date(),
      },
      {
        userId: sideBUserId,
        side: MatchSide.B,
        role: ParticipantRole.OPPONENT,
        status: ParticipantStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    ];

    const created = await this.prisma.$transaction(async (tx) => {
      // createdById is required by the schema but meaningless for a
      // system-paired fixture — sideA is used arbitrarily.
      const match = await tx.match.create({
        data: {
          format,
          state: MatchState.SCHEDULING,
          createdById: sideAUserId,
          participants: { createMany: { data: participants } },
        },
      });
      await this.messaging.ensureMatchConversation(
        match.id,
        [sideAUserId, sideBUserId],
        tx,
      );
      return match;
    });

    const match = await this.loadMatch(created.id);
    await this.announce(match, announceBody, 'fixture_scheduled');
    return match;
  }
}
