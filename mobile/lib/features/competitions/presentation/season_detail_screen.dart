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

/// Season Detail — `foundation/04-screen-inventory.md` §A.5 (redesign
/// 2026-08). Registration window state, Register / Join Waitlist with an
/// inline confirm dialog, and entry points into Registered Players, Current
/// Round, and Standings.
class SeasonDetailScreen extends ConsumerStatefulWidget {
  const SeasonDetailScreen({super.key, required this.seasonId});

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
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const DriftBackHeader(title: 'Season'),
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
                      Text(
                        value.label,
                        style: type.h2.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        value.leagueName,
                        style: type.body.copyWith(
                          color: colors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      DriftPill(
                        label: value.state.label,
                        tone: _tone(value.state),
                      ),
                      const SizedBox(height: 16),

                      if (value.state == SeasonState.active ||
                          value.state == SeasonState.completed) ...[
                        DriftSoftCard(
                          child: DriftSeasonProgress(
                            currentRound:
                                currentRound.valueOrNull?.index ?? 0,
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
                          '/compete/seasons/${widget.seasonId}/players',
                        ),
                        child: const _LinkRow(label: 'Registered Players'),
                      ),
                      if (currentRound.valueOrNull != null) ...[
                        const SizedBox(height: 12),
                        DriftSoftCard(
                          onTap: () => context.push(
                            '/compete/seasons/${widget.seasonId}/rounds/'
                            '${currentRound.value!.id}',
                          ),
                          child: const _LinkRow(label: 'Current Round'),
                        ),
                      ],
                      const SizedBox(height: 12),
                      DriftSoftCard(
                        onTap: () => context.push(
                          '/compete/seasons/${widget.seasonId}/standings',
                        ),
                        child: const _LinkRow(label: 'Standings'),
                      ),
                    ],
                  ),
                  AsyncError() => const Center(
                    child: Text('Season not available.'),
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
              "You're registered",
              style: type.title.copyWith(fontWeight: FontWeight.w700),
            ),
            if (season.state == SeasonState.registrationOpen ||
                season.state == SeasonState.draft) ...[
              const SizedBox(height: 4),
              DriftTextLink(
                label: 'Withdraw',
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
              'On the waitlist',
              style: type.title.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 2),
            Text(
              "We'll move you in automatically if a spot opens up.",
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
            const SizedBox(height: 4),
            DriftTextLink(
              label: 'Leave waitlist',
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
              ? 'Registration opens soon.'
              : 'Registration is closed for this season.',
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
            'Registration open',
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
            label: isFull ? 'Join Waitlist' : 'Register',
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
          isFull ? 'Join the waitlist?' : 'Register for this season?',
        ),
        content: Text(
          isFull
              ? "You'll be added to the waitlist and enrolled automatically "
                    'if a spot opens up.'
              : "You'll be paired with other registered players once the "
                    'season starts.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(isFull ? 'Join Waitlist' : 'Register'),
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
        title: const Text('Withdraw from this season?'),
        content: const Text(
          'You can register again later, as long as registration is still '
          'open.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Withdraw'),
          ),
        ],
      ),
    );
    if (confirmed == true) onWithdraw();
  }
}
