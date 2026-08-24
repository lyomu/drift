import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_match_card.dart';
import '../../../shared/widgets/drift_match_score_display.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../../shared/widgets/drift_text_field.dart';
import '../../auth/data/auth_repository.dart';
import '../../connections/application/connections_providers.dart';
import '../../users/application/current_user_provider.dart';
import '../application/matches_providers.dart';
import '../data/matches_repository.dart';
import 'enter_score_screen.dart';
import 'propose_time_sheet.dart';

/// Challenge Status / Match Detail — `foundation/04-screen-inventory.md`
/// §A.4. One screen covers the whole lifecycle; which actions appear is
/// driven entirely by match state plus the viewer's own participant status.
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Match'),
        actions: [
          if (match.valueOrNull?.conversationId != null)
            IconButton(
              onPressed: () =>
                  context.push('/messages/${match.value!.conversationId}'),
              icon: const Icon(Icons.chat_bubble_outline),
              tooltip: 'Message',
            ),
        ],
      ),
      body: SafeArea(
        child: switch (match) {
          AsyncData(:final value) => _Body(
            match: value,
            viewerId: viewer?.id ?? '',
            isBusy: _isBusy,
            onAction: _run,
          ),
          AsyncError() => const Center(child: Text('Match not available.')),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

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
      padding: const EdgeInsets.all(DriftSpacing.s5),
      children: [
        if (match.competitionContext != null) ...[
          _CompetitionBanner(context: match.competitionContext!),
          const SizedBox(height: DriftSpacing.s4),
        ],
        DriftMatchCard(match: match, viewerId: viewerId),
        const SizedBox(height: DriftSpacing.s4),

        DriftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Players', style: type.h4),
              const SizedBox(height: DriftSpacing.s3),
              for (final p in match.participants)
                Padding(
                  padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
                  child: Row(
                    children: [
                      DriftPlayerAvatar(player: p.player, radius: 16),
                      const SizedBox(width: DriftSpacing.s3),
                      Expanded(
                        child: Text(
                          '${p.player.displayName}${p.userId == viewerId ? ' (you)' : ''}',
                          style: type.body,
                        ),
                      ),
                      Text(
                        switch (p.status) {
                          ParticipantStatus.accepted => 'In',
                          ParticipantStatus.declined => 'Declined',
                          ParticipantStatus.invited => 'Invited',
                        },
                        style: type.caption.copyWith(
                          color: p.status == ParticipantStatus.accepted
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
          const SizedBox(height: DriftSpacing.s4),
          DriftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Court', style: type.h4),
                const SizedBox(height: DriftSpacing.s1),
                Text(match.courtName!, style: type.body),
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
          const SizedBox(height: DriftSpacing.s4),
          const _UnplayedWalkoverCard(),
        ],

        if (match.result != null) ...[
          const SizedBox(height: DriftSpacing.s4),
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
          const SizedBox(height: DriftSpacing.s4),
          _ProposalCard(
            match: match,
            viewerId: viewerId,
            isBusy: isBusy,
            onAccept: (optionId) =>
                onAction(() => repo.acceptTime(match.id, optionId)),
          ),
        ],

        const SizedBox(height: DriftSpacing.s5),
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

    return DriftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(isMine ? 'Your proposed times' : 'Pick a time', style: type.h4),
          const SizedBox(height: DriftSpacing.s1),
          Text(
            isMine
                ? 'Waiting for them to choose.'
                : 'Tap a time to confirm the match.',
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: DriftSpacing.s3),
          for (final option in proposal.options)
            Padding(
              padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
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
              "You've used all your proposal rounds — sort the rest out in chat.",
              style: type.caption.copyWith(color: colors.warning),
            ),
        ],
      ),
    );
  }
}

/// Covers all three moments a submitted result can be in: awaiting the
/// other side's reply, disputed (both versions shown, link to Dispute
/// Detail), or settled (final score + Rematch + reflection prompt).
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
        final opponent = match.opponentFor(viewerId);
        return DriftMatchScoreDisplay(
          sets: result.sets!,
          sideBLabel: opponent?.player.displayName ?? 'Them',
        );
      }
      return Text(
        result.outcome == ResultOutcome.walkover ? 'Walkover' : 'Retirement',
        style: type.body,
      );
    }

    if (result.isDisputed) {
      return DriftCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Result disputed',
              style: type.h4.copyWith(color: colors.error),
            ),
            const SizedBox(height: DriftSpacing.s1),
            Text(
              "You and your opponent submitted different results.",
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
            const SizedBox(height: DriftSpacing.s3),
            DriftButton(
              label: 'View Dispute',
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
      return DriftCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Result', style: type.h4),
            const SizedBox(height: DriftSpacing.s3),
            scoreOrOutcome(),
            const SizedBox(height: DriftSpacing.s3),
            if (isSubmitter)
              Text(
                'Waiting for them to confirm.',
                style: type.bodySmall.copyWith(color: colors.textSecondary),
              )
            else ...[
              DriftButton(
                label: 'Confirm',
                onPressed: isBusy ? null : onConfirm,
              ),
              const SizedBox(height: DriftSpacing.s2),
              DriftButton(
                label: 'Dispute',
                variant: DriftButtonVariant.text,
                onPressed: isBusy ? null : onDispute,
              ),
            ],
          ],
        ),
      );
    }

    // CONFIRMED — settled.
    return DriftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Result', style: type.h4),
          const SizedBox(height: DriftSpacing.s3),
          scoreOrOutcome(),
        ],
      ),
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
            DriftButton(
              label: 'Rematch',
              onPressed: () =>
                  context.push('/challenge', extra: opponent.player),
            ),
          const SizedBox(height: DriftSpacing.s2),
          DriftButton(
            label: 'How did it feel?',
            variant: DriftButtonVariant.text,
            onPressed: () => context.push('/matches/${match.id}/reflection'),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (awaitingMe) ...[
          DriftButton(
            label: 'Accept',
            onPressed: isBusy ? null : () => _accept(context, ref, repo),
          ),
          const SizedBox(height: DriftSpacing.s2),
          DriftButton(
            label: 'Decline',
            variant: DriftButtonVariant.text,
            onPressed: isBusy
                ? null
                : () => onAction(() => repo.decline(match.id)),
          ),
        ],

        if (canProposeTime && !proposalPending && match.roundsRemaining > 0)
          DriftButton(
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
          const SizedBox(height: DriftSpacing.s2),
          DriftButton(
            label: 'Suggest Different Times',
            variant: DriftButtonVariant.text,
            onPressed: isBusy
                ? null
                : () async {
                    final times = await showProposeTimeSheet(context);
                    if (times != null && times.isNotEmpty) {
                      await onAction(() => repo.proposeTimes(match.id, times));
                    }
                  },
          ),
        ],

        if (match.state == MatchState.scheduled && match.result == null) ...[
          const SizedBox(height: DriftSpacing.s2),
          DriftButton(
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
          const SizedBox(height: DriftSpacing.s2),
          DriftButton(
            label: 'Reschedule',
            variant: DriftButtonVariant.text,
            onPressed: isBusy
                ? null
                : () => onAction(() => repo.reschedule(match.id)),
          ),
        ] else if (match.state == MatchState.scheduled) ...[
          const SizedBox(height: DriftSpacing.s2),
          DriftButton(
            label: 'Reschedule',
            variant: DriftButtonVariant.text,
            onPressed: isBusy
                ? null
                : () => onAction(() => repo.reschedule(match.id)),
          ),
        ],

        if (!awaitingMe && !isDisputed && match.result == null) ...[
          const SizedBox(height: DriftSpacing.s2),
          DriftButton(
            label: 'Suggest Court',
            variant: DriftButtonVariant.text,
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
          const SizedBox(height: DriftSpacing.s2),
          DriftButton(
            label: 'Cancel Match',
            variant: DriftButtonVariant.text,
            onPressed: isBusy
                ? null
                : () => onAction(() => repo.cancel(match.id)),
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

/// League Round N banner — Doc 6 §1's `competitionContext` made visible.
class _CompetitionBanner extends StatelessWidget {
  const _CompetitionBanner({required this.context});

  final MatchCompetitionContext context;

  @override
  Widget build(BuildContext buildContext) {
    final colors = Theme.of(buildContext).extension<DriftColors>()!;
    final type = Theme.of(buildContext).extension<DriftTypography>()!;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: DriftSpacing.s3,
        vertical: DriftSpacing.s2,
      ),
      decoration: BoxDecoration(
        color: colors.primaryLight,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(
            Icons.emoji_events_outlined,
            size: 16,
            color: colors.primaryDark,
          ),
          const SizedBox(width: DriftSpacing.s2),
          Expanded(
            child: Text(
              'Round ${context.roundIndex} · ${context.leagueName}',
              style: type.bodySmall.copyWith(color: colors.primaryDark),
            ),
          ),
        ],
      ),
    );
  }
}

/// A league fixture that never got played before its round's deadline —
/// system-applied WALKOVER with no `MatchResult` row (see
/// competitions.service.ts's closeRoundAndAdvance), distinct from a player
/// voluntarily declaring a walkover.
class _UnplayedWalkoverCard extends StatelessWidget {
  const _UnplayedWalkoverCard();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Unplayed — walkover', style: type.h4),
          const SizedBox(height: DriftSpacing.s1),
          Text(
            "The round deadline passed before this fixture was played. "
            "It's recorded as a walkover in favour of neither player.",
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
        ],
      ),
    );
  }
}
