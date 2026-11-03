import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_primary_button.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_pill.dart';
import '../../../shared/widgets/drift_season_progress.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../../auth/data/auth_repository.dart';
import '../application/competitions_providers.dart';
import '../data/competitions_repository.dart';
import '../../../core/l10n/l10n.dart';

/// League Competition Detail — `foundation/04-screen-inventory.md` §A.5
/// (redesign 2026-08). Since M15 a league *is* the competition: registration
/// window state, Register / Join Waitlist with an inline confirm dialog, and
/// entry points into Rules, Registered Players, Current Round, and Standings.
class SeasonDetailScreen extends ConsumerStatefulWidget {
  const SeasonDetailScreen({super.key, required this.seasonId});

  /// The league id (route key). Named `seasonId` for continuity with the
  /// providers that key off it.
  final String seasonId;

  @override
  ConsumerState<SeasonDetailScreen> createState() => _SeasonDetailScreenState();
}

class _SeasonDetailScreenState extends ConsumerState<SeasonDetailScreen> {
  bool _isBusy = false;

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _isBusy = true);
    try {
      await action();
      ref.invalidate(seasonDetailProvider(widget.seasonId));
      ref.invalidate(mySeasonsProvider);
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
    final season = ref.watch(seasonDetailProvider(widget.seasonId));
    final currentRound = ref.watch(currentRoundProvider(widget.seasonId));
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DriftBackHeader(title: context.l10n.competeLeague),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(seasonDetailProvider(widget.seasonId));
                  ref.invalidate(currentRoundProvider(widget.seasonId));
                  await ref.read(seasonDetailProvider(widget.seasonId).future);
                },
                child: switch (season) {
                  AsyncData(:final value) => ListView(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                    children: [
                      Text(value.leagueName, style: type.h2),
                      const SizedBox(height: 12),
                      // Format and level sit beside the state so the three
                      // things a player weighs before registering are in one
                      // row. The level band is guidance, not a gate.
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          DriftPill(
                            label: value.state.label,
                            tone: _tone(value.state),
                          ),
                          DriftPill(
                            label: value.formatLabel,
                            tone: DriftPillTone.neutral,
                          ),
                          DriftPill(
                            label: value.levelBandLabel,
                            tone: DriftPillTone.neutral,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      if (value.state == SeasonState.active ||
                          value.state == SeasonState.completed) ...[
                        DriftSoftCard(
                          child: DriftSeasonProgress(
                            currentRound: currentRound.valueOrNull?.index ?? 0,
                            roundCount: value.roundCount,
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],

                      _RegistrationCard(
                        season: value,
                        isBusy: _isBusy,
                        onRegister: () => _run(
                          () => ref
                              .read(competitionsRepositoryProvider)
                              .register(widget.seasonId),
                        ),
                        onWithdraw: () => _run(
                          () => ref
                              .read(competitionsRepositoryProvider)
                              .withdraw(widget.seasonId),
                        ),
                      ),
                      const SizedBox(height: 12),

                      DriftSoftCard(
                        onTap: () => context.push(
                          '/compete/leagues/${widget.seasonId}/rules',
                        ),
                        child: _LinkRow(label: context.l10n.competeRules),
                      ),
                      const SizedBox(height: 12),
                      DriftSoftCard(
                        onTap: () => context.push(
                          '/compete/leagues/${widget.seasonId}/players',
                        ),
                        child: _LinkRow(label: context.l10n.competeRegisteredPlayers),
                      ),
                      if (currentRound.valueOrNull != null) ...[
                        const SizedBox(height: 12),
                        DriftSoftCard(
                          onTap: () => context.push(
                            '/compete/leagues/${widget.seasonId}/rounds/'
                            '${currentRound.value!.id}',
                          ),
                          child: _LinkRow(label: context.l10n.competeCurrentRound),
                        ),
                      ],
                      const SizedBox(height: 12),
                      DriftSoftCard(
                        onTap: () => context.push(
                          '/compete/leagues/${widget.seasonId}/standings',
                        ),
                        child: _LinkRow(label: context.l10n.competeStandings),
                      ),
                    ],
                  ),
                  AsyncError() => Center(
                    child: Text(context.l10n.competeLeagueUnavailable),
                  ),
                  _ => const Center(child: CircularProgressIndicator()),
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  DriftPillTone _tone(SeasonState state) => switch (state) {
    SeasonState.registrationOpen || SeasonState.active => DriftPillTone.success,
    SeasonState.scheduled => DriftPillTone.info,
    SeasonState.cancelled => DriftPillTone.error,
    _ => DriftPillTone.neutral,
  };
}

class _LinkRow extends StatelessWidget {
  const _LinkRow({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: type.body.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
        Icon(Icons.chevron_right, color: colors.textSecondary),
      ],
    );
  }
}

class _RegistrationCard extends StatelessWidget {
  const _RegistrationCard({
    required this.season,
    required this.isBusy,
    required this.onRegister,
    required this.onWithdraw,
  });

  final SeasonDetail season;
  final bool isBusy;
  final VoidCallback onRegister;
  final VoidCallback onWithdraw;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    if (season.viewerRegistrationStatus == SeasonRegistrationStatus.enrolled) {
      return DriftSoftCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.l10n.competeYoureRegistered,
              style: type.title.copyWith(fontWeight: FontWeight.w700),
            ),
            if (season.state == SeasonState.registrationOpen ||
                season.state == SeasonState.draft) ...[
              const SizedBox(height: 4),
              DriftTextLink(
                label: context.l10n.competeWithdraw,
                onPressed: isBusy
                    ? null
                    : () => _confirmWithdraw(context, onWithdraw),
              ),
            ],
          ],
        ),
      );
    }

    if (season.viewerRegistrationStatus ==
        SeasonRegistrationStatus.waitlisted) {
      return DriftSoftCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.l10n.competeOnWaitlist,
              style: type.title.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 2),
            Text(
              context.l10n.competeWaitlistBody,
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
            const SizedBox(height: 4),
            DriftTextLink(
              label: context.l10n.competeLeaveWaitlist,
              onPressed: isBusy
                  ? null
                  : () => _confirmWithdraw(context, onWithdraw),
            ),
          ],
        ),
      );
    }

    if (season.state != SeasonState.registrationOpen) {
      return DriftSoftCard(
        child: Text(
          season.state == SeasonState.draft
              ? context.l10n.competeRegistrationOpensSoon
              : context.l10n.competeRegistrationClosed,
          style: type.body.copyWith(color: colors.textSecondary),
        ),
      );
    }

    final isFull =
        season.capacity != null && season.enrolledCount >= season.capacity!;

    return DriftSoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            context.l10n.seasonRegistrationOpen,
            style: type.title.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 2),
          Text(
            season.capacity != null
                ? '${season.enrolledCount} of ${season.capacity} spots filled'
                : '${season.enrolledCount} registered',
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: 12),
          DriftPrimaryButton(
            label: isFull
                ? context.l10n.competeJoinWaitlist
                : context.l10n.competeRegister,
            onPressed: isBusy
                ? null
                : () => _confirmRegister(context, isFull, onRegister),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmRegister(
    BuildContext context,
    bool isFull,
    VoidCallback onRegister,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          isFull
              ? context.l10n.competeJoinWaitlistQ
              : context.l10n.competeRegisterQ,
        ),
        content: Text(
          isFull
              ? context.l10n.competeJoinWaitlistBody
              : context.l10n.competeRegisterBody,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(context.l10n.commonCancel),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(
              isFull
                  ? context.l10n.competeJoinWaitlist
                  : context.l10n.competeRegister,
            ),
          ),
        ],
      ),
    );
    if (confirmed == true) onRegister();
  }

  Future<void> _confirmWithdraw(
    BuildContext context,
    VoidCallback onWithdraw,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(context.l10n.competeWithdrawQ),
        content: Text(
          context.l10n.competeWithdrawBody,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(context.l10n.commonCancel),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(context.l10n.competeWithdraw),
          ),
        ],
      ),
    );
    if (confirmed == true) onWithdraw();
  }
}
