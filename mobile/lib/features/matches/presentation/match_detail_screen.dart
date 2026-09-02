import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_primary_button.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_error_retry.dart';
import '../../../shared/widgets/drift_match_card.dart' show formatMatchTime;
import '../../../shared/widgets/drift_pill.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../../connections/application/connections_providers.dart';
import '../../users/application/current_user_provider.dart';
import '../application/matches_providers.dart';
import '../data/matches_repository.dart';
import 'enter_score_screen.dart';
import 'propose_time_sheet.dart';

/// Challenge Status / Match Detail — `foundation/04-screen-inventory.md`
/// §A.4 (redesign 2026-08). One screen covers the whole lifecycle; which
/// actions appear is driven by match state plus the viewer's participant
/// status.
class MatchDetailScreen extends ConsumerStatefulWidget {
  const MatchDetailScreen({super.key, required this.matchId});

  final String matchId;

  @override
  ConsumerState<MatchDetailScreen> createState() => _MatchDetailScreenState();
}

class _MatchDetailScreenState extends ConsumerState<MatchDetailScreen> {
  bool _isBusy = false;

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _isBusy = true);
    try {
      await action();
      ref.invalidate(matchDetailProvider(widget.matchId));
      ref.invalidate(matchListProvider(MatchSegment.challenges));
      ref.invalidate(matchListProvider(MatchSegment.active));
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final match = ref.watch(matchDetailProvider(widget.matchId));
    final viewer = ref.watch(currentUserProvider).valueOrNull;
    final conversationId = match.valueOrNull?.conversationId;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DriftBackHeader(
              title: 'Match',
              trailing: conversationId == null
                  ? null
                  : DriftHeaderSquareButton(
                      icon: Icons.chat_bubble_outline,
                      onTap: () => context.push('/messages/$conversationId'),
                    ),
            ),
            Expanded(
              child: switch (match) {
                AsyncData(:final value) => _Body(
                  match: value,
                  viewerId: viewer?.id ?? '',
                  isBusy: _isBusy,
                  onAction: _run,
                ),
                AsyncError() => DriftErrorRetry(
                  message: "Couldn't load this match.",
                  onRetry: () =>
                      ref.invalidate(matchDetailProvider(widget.matchId)),
                ),
                _ => const Center(child: CircularProgressIndicator()),
              },
            ),
          ],
        ),
      ),
    );
  }
}

Text _cardLabel(BuildContext context, String text) {
  final type = Theme.of(context).extension<DriftTypography>()!;
  final colors = Theme.of(context).extension<DriftColors>()!;
  return Text(
    text.toUpperCase(),
    style: type.caption.copyWith(
      color: colors.textSecondary,
      fontWeight: FontWeight.w700,
    ),
  );
}

DriftPillTone _stateTone(MatchState state) => switch (state) {
  MatchState.scheduled => DriftPillTone.success,
  MatchState.scheduling || MatchState.rescheduled => DriftPillTone.warning,
  MatchState.proposed => DriftPillTone.info,
  MatchState.disputed => DriftPillTone.error,
  MatchState.completed ||
  MatchState.walkover ||
  MatchState.retired => DriftPillTone.neutral,
  _ => DriftPillTone.neutral,
};

class _Body extends ConsumerWidget {
  const _Body({
    required this.match,
    required this.viewerId,
    required this.isBusy,
    required this.onAction,
  });

  final DriftMatch match;
  final String viewerId;
  final bool isBusy;
  final Future<void> Function(Future<void> Function()) onAction;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final repo = ref.read(matchesRepositoryProvider);

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        if (match.competitionContext != null) ...[
          _CompetitionBanner(context: match.competitionContext!),
          const SizedBox(height: 12),
        ],

        _OpponentCard(match: match, viewerId: viewerId),
        const SizedBox(height: 12),

        DriftSoftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _cardLabel(context, 'Players'),
              const SizedBox(height: 10),
              for (var i = 0; i < match.participants.length; i++)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  decoration: i < match.participants.length - 1
                      ? BoxDecoration(
                          border: Border(
                            bottom: BorderSide(color: colors.border),
                          ),
                        )
                      : null,
                  child: Row(
                    children: [
                      DriftPlayerAvatar(
                        player: match.participants[i].player,
                        radius: 18,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          '${match.participants[i].player.displayName}'
                          '${match.participants[i].userId == viewerId ? ' (you)' : ''}',
                          style: type.body.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      Text(
                        switch (match.participants[i].status) {
                          ParticipantStatus.accepted => 'In',
                          ParticipantStatus.declined => 'Declined',
                          ParticipantStatus.invited => 'Invited',
                        },
                        style: type.caption.copyWith(
                          fontWeight: FontWeight.w600,
                          color:
                              match.participants[i].status ==
                                  ParticipantStatus.accepted
                              ? colors.success
                              : colors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),

        if (match.courtName != null) ...[
          const SizedBox(height: 12),
          DriftSoftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _cardLabel(context, 'Court'),
                const SizedBox(height: 8),
                Text(
                  match.courtName!,
                  style: type.body.copyWith(fontWeight: FontWeight.w600),
                ),
                if (match.courtNote != null)
                  Text(
                    match.courtNote!,
                    style: type.bodySmall.copyWith(color: colors.textSecondary),
                  ),
              ],
            ),
          ),
        ],

        if (match.result == null && match.state == MatchState.walkover) ...[
          const SizedBox(height: 12),
          const _UnplayedWalkoverCard(),
        ],

        if (match.result != null) ...[
          const SizedBox(height: 12),
          _ResultCard(
            match: match,
            viewerId: viewerId,
            isBusy: isBusy,
            onConfirm: () => onAction(() => repo.confirmResult(match.id)),
            onDispute: () async {
              final saved = await context.push<DriftMatch>(
                '/matches/${match.id}/enter-score',
                extra: (
                  match: match,
                  viewerId: viewerId,
                  mode: EnterScoreMode.dispute,
                ),
              );
              if (saved != null) {
                ref.invalidate(matchDetailProvider(match.id));
              }
            },
          ),
        ],

        if (match.latestProposal != null &&
            match.latestProposal!.isPending) ...[
          const SizedBox(height: 12),
          _ProposalCard(
            match: match,
            viewerId: viewerId,
            isBusy: isBusy,
            onAccept: (optionId) =>
                onAction(() => repo.acceptTime(match.id, optionId)),
          ),
        ],

        const SizedBox(height: 16),
        _Actions(
          match: match,
          viewerId: viewerId,
          isBusy: isBusy,
          onAction: onAction,
        ),
      ],
    );
  }
}

class _OpponentCard extends StatelessWidget {
  const _OpponentCard({required this.match, required this.viewerId});

  final DriftMatch match;
  final String viewerId;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final opponent = match.opponentFor(viewerId)?.player;

    return DriftSoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (opponent != null) ...[
                DriftPlayerAvatar(player: opponent, radius: 22),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      opponent?.displayName ?? 'Match',
                      style: type.title.copyWith(fontWeight: FontWeight.w700),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      match.isDoubles ? 'Doubles' : 'Singles',
                      style: type.caption.copyWith(color: colors.textSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              DriftPill(
                label: match.state.label,
                tone: _stateTone(match.state),
              ),
            ],
          ),
          if (match.confirmedTime != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.only(top: 10),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: colors.border)),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.calendar_today_outlined,
                    size: 14,
                    color: colors.textSecondary,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    formatMatchTime(match.confirmedTime!),
                    style: type.caption.copyWith(color: colors.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _ProposalCard extends StatelessWidget {
  const _ProposalCard({
    required this.match,
    required this.viewerId,
    required this.isBusy,
    required this.onAccept,
  });

  final DriftMatch match;
  final String viewerId;
  final bool isBusy;
  final void Function(String optionId) onAccept;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final proposal = match.latestProposal!;
    final isMine = proposal.proposedById == viewerId;

    return DriftSoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _cardLabel(context, isMine ? 'Your proposed times' : 'Pick a time'),
          const SizedBox(height: 4),
          Text(
            isMine
                ? 'Waiting for them to choose.'
                : 'Tap a time to confirm the match.',
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: 12),
          for (final option in proposal.options)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: isMine || isBusy
                      ? null
                      : () => onAccept(option.id),
                  child: Text(formatMatchTime(option.startsAt)),
                ),
              ),
            ),
          if (match.roundsRemaining == 0)
            Text(
              "You've used all your proposal rounds — sort the rest out in "
              "chat.",
              style: type.caption.copyWith(color: colors.warning),
            ),
        ],
      ),
    );
  }
}

/// Covers the three states a submitted result can be in: awaiting the other
/// side's reply, disputed, or settled.
class _ResultCard extends StatelessWidget {
  const _ResultCard({
    required this.match,
    required this.viewerId,
    required this.isBusy,
    required this.onConfirm,
    required this.onDispute,
  });

  final DriftMatch match;
  final String viewerId;
  final bool isBusy;
  final VoidCallback onConfirm;
  final VoidCallback onDispute;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final result = match.result!;
    final viewer = match.participants.firstWhere((p) => p.userId == viewerId);
    final submitter = match.participants.firstWhere(
      (p) => p.userId == result.submittedById,
    );
    final isSubmitter = viewer.side == submitter.side;

    Widget scoreOrOutcome() {
      if (result.outcome == ResultOutcome.score && result.sets != null) {
        return _Score(
          sets: result.sets!,
          viewerSide: viewer.side,
          opponentLabel:
              match.opponentFor(viewerId)?.player.displayName ?? 'Them',
        );
      }
      return Text(
        result.outcome == ResultOutcome.walkover ? 'Walkover' : 'Retirement',
        style: type.body,
      );
    }

    if (result.isDisputed) {
      return DriftSoftCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _cardLabel(context, 'Result'),
            const SizedBox(height: 8),
            Text(
              'Result disputed',
              style: type.h4.copyWith(color: colors.error),
            ),
            const SizedBox(height: 2),
            Text(
              'You and your opponent submitted different results.',
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
            const SizedBox(height: 12),
            DriftPrimaryButton(
              label: 'View dispute',
              onPressed: () => context.push(
                '/matches/${match.id}/dispute',
                extra: (match: match, viewerId: viewerId),
              ),
            ),
          ],
        ),
      );
    }

    if (result.isPendingConfirmation) {
      return DriftSoftCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _cardLabel(context, 'Result'),
            const SizedBox(height: 14),
            scoreOrOutcome(),
            const SizedBox(height: 16),
            if (isSubmitter)
              Text(
                'Waiting for them to confirm.',
                style: type.bodySmall.copyWith(color: colors.textSecondary),
              )
            else ...[
              DriftPrimaryButton(
                label: 'Confirm',
                onPressed: isBusy ? null : onConfirm,
              ),
              const SizedBox(height: 6),
              Center(
                child: DriftTextLink(
                  label: 'Dispute',
                  onPressed: isBusy ? null : onDispute,
                ),
              ),
            ],
          ],
        ),
      );
    }

    return DriftSoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _cardLabel(context, 'Result'),
          const SizedBox(height: 14),
          scoreOrOutcome(),
        ],
      ),
    );
  }
}

/// Viewer-aware set-by-set score with the prototype's large figures.
class _Score extends StatelessWidget {
  const _Score({
    required this.sets,
    required this.viewerSide,
    required this.opponentLabel,
  });

  final List<SetScore> sets;
  final String viewerSide;
  final String opponentLabel;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    int mine(SetScore s) => viewerSide == 'A' ? s.sideAGames : s.sideBGames;
    int theirs(SetScore s) => viewerSide == 'A' ? s.sideBGames : s.sideAGames;

    Widget row(String label, int Function(SetScore) games, bool isViewer) {
      return Row(
        children: [
          SizedBox(
            width: 72,
            child: Text(
              label,
              style: type.caption.copyWith(color: colors.textSecondary),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          for (final s in sets)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Text(
                '${games(s)}',
                style: type.statistics.copyWith(
                  fontSize: 30,
                  color: isViewer ? colors.textPrimary : colors.textSecondary,
                ),
              ),
            ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        row('You', mine, true),
        const SizedBox(height: 2),
        row(opponentLabel, theirs, false),
      ],
    );
  }
}

class _Actions extends ConsumerWidget {
  const _Actions({
    required this.match,
    required this.viewerId,
    required this.isBusy,
    required this.onAction,
  });

  final DriftMatch match;
  final String viewerId;
  final bool isBusy;
  final Future<void> Function(Future<void> Function()) onAction;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.read(matchesRepositoryProvider);
    final awaitingMe = match.viewerStatus == ParticipantStatus.invited;
    final canProposeTime =
        match.state == MatchState.scheduling ||
        match.state == MatchState.rescheduled;
    final proposalPending = match.latestProposal?.isPending ?? false;
    final isOver =
        match.state == MatchState.cancelled ||
        match.state == MatchState.expired;
    final isSettled =
        match.state == MatchState.completed ||
        match.state == MatchState.walkover ||
        match.state == MatchState.retired;
    final isDisputed = match.state == MatchState.disputed;

    if (isOver) return const SizedBox.shrink();

    if (isSettled) {
      final opponent = match.opponentFor(viewerId);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (opponent != null)
            DriftPrimaryButton(
              label: 'Rematch',
              onPressed: () =>
                  context.push('/challenge', extra: opponent.player),
            ),
          const SizedBox(height: 2),
          Center(
            child: DriftTextLink(
              label: 'How did it feel?',
              onPressed: () => context.push('/matches/${match.id}/reflection'),
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (awaitingMe) ...[
          DriftPrimaryButton(
            label: 'Accept',
            onPressed: isBusy ? null : () => _accept(context, ref, repo),
          ),
          const SizedBox(height: 2),
          Center(
            child: DriftTextLink(
              label: 'Decline',
              onPressed: isBusy
                  ? null
                  : () => onAction(() => repo.decline(match.id)),
            ),
          ),
        ],

        if (canProposeTime && !proposalPending && match.roundsRemaining > 0)
          DriftPrimaryButton(
            label: 'Propose Times',
            onPressed: isBusy
                ? null
                : () async {
                    final times = await showProposeTimeSheet(context);
                    if (times != null && times.isNotEmpty) {
                      await onAction(() => repo.proposeTimes(match.id, times));
                    }
                  },
          ),

        if (canProposeTime &&
            proposalPending &&
            match.latestProposal!.proposedById != viewerId &&
            match.roundsRemaining > 0) ...[
          const SizedBox(height: 2),
          Center(
            child: DriftTextLink(
              label: 'Suggest different times',
              onPressed: isBusy
                  ? null
                  : () async {
                      final times = await showProposeTimeSheet(context);
                      if (times != null && times.isNotEmpty) {
                        await onAction(
                          () => repo.proposeTimes(match.id, times),
                        );
                      }
                    },
            ),
          ),
        ],

        if (match.state == MatchState.scheduled && match.result == null) ...[
          DriftPrimaryButton(
            label: 'Enter Result',
            onPressed: isBusy
                ? null
                : () async {
                    final saved = await context.push<DriftMatch>(
                      '/matches/${match.id}/enter-score',
                      extra: (
                        match: match,
                        viewerId: viewerId,
                        mode: EnterScoreMode.submit,
                      ),
                    );
                    if (saved != null) {
                      ref.invalidate(matchDetailProvider(match.id));
                      ref.invalidate(matchListProvider(MatchSegment.active));
                    }
                  },
          ),
          const SizedBox(height: 2),
          Center(
            child: DriftTextLink(
              label: 'Reschedule',
              onPressed: isBusy
                  ? null
                  : () => onAction(() => repo.reschedule(match.id)),
            ),
          ),
        ] else if (match.state == MatchState.scheduled) ...[
          const SizedBox(height: 2),
          Center(
            child: DriftTextLink(
              label: 'Reschedule',
              onPressed: isBusy
                  ? null
                  : () => onAction(() => repo.reschedule(match.id)),
            ),
          ),
        ],

        if (!awaitingMe && !isDisputed && match.result == null) ...[
          const SizedBox(height: 2),
          Center(
            child: DriftTextLink(
              label: 'Suggest court',
              onPressed: isBusy
                  ? null
                  : () async {
                      final court = await _promptCourt(context);
                      if (court != null && court.isNotEmpty) {
                        await onAction(
                          () => repo.suggestCourt(match.id, courtName: court),
                        );
                      }
                    },
            ),
          ),
          Center(
            child: DriftTextLink(
              label: 'Cancel match',
              onPressed: isBusy
                  ? null
                  : () => onAction(() => repo.cancel(match.id)),
            ),
          ),
        ],
      ],
    );
  }

  /// Doubles opponents must name a partner as part of accepting.
  Future<void> _accept(
    BuildContext context,
    WidgetRef ref,
    MatchesRepository repo,
  ) async {
    final needsPartner =
        match.isDoubles &&
        match.viewerRole == 'OPPONENT' &&
        !match.participants.any(
          (p) =>
              p.role == 'PARTNER' &&
              p.side ==
                  match.participants
                      .firstWhere((x) => x.userId == viewerId)
                      .side,
        );

    if (!needsPartner) {
      await onAction(() => repo.accept(match.id));
      return;
    }

    final partnerId = await _promptPartner(context, ref);
    if (partnerId == null) return;
    await onAction(() => repo.accept(match.id, partnerId: partnerId));
  }

  Future<String?> _promptPartner(BuildContext context, WidgetRef ref) async {
    final connections = await ref.read(connectionsProvider.future);
    if (!context.mounted) return null;

    if (connections.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Connect with a player first to partner with them.'),
        ),
      );
      return null;
    }

    return showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Choose your partner'),
        children: [
          for (final c in connections)
            SimpleDialogOption(
              onPressed: () => Navigator.of(context).pop(c.player.id),
              child: Text(c.player.displayName),
            ),
        ],
      ),
    );
  }

  Future<String?> _promptCourt(BuildContext context) {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Suggest a court'),
        content: DriftTextField(label: 'Court name', controller: controller),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(controller.text.trim()),
            child: const Text('Suggest'),
          ),
        ],
      ),
    );
  }
}

/// League Round N banner — the prototype's blue pill with a trophy.
class _CompetitionBanner extends StatelessWidget {
  const _CompetitionBanner({required this.context});

  final MatchCompetitionContext context;

  @override
  Widget build(BuildContext buildContext) {
    final colors = Theme.of(buildContext).extension<DriftColors>()!;
    final type = Theme.of(buildContext).extension<DriftTypography>()!;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        color: colors.primaryLight,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(Icons.emoji_events_outlined, size: 14, color: colors.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Round ${context.roundIndex} · ${context.leagueName}',
              style: type.caption.copyWith(
                color: colors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A league fixture that never got played before its round's deadline.
class _UnplayedWalkoverCard extends StatelessWidget {
  const _UnplayedWalkoverCard();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftSoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _cardLabel(context, 'Unplayed — walkover'),
          const SizedBox(height: 6),
          Text(
            'The round deadline passed before this fixture was played. '
            "It's recorded as a walkover in favour of neither player.",
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
        ],
      ),
    );
  }
}
