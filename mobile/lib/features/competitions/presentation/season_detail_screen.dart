import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_season_progress.dart';
import '../../../shared/widgets/drift_status_badge.dart';
import '../../auth/data/auth_repository.dart';
import '../application/competitions_providers.dart';
import '../data/competitions_repository.dart';

/// Season Detail — `foundation/04-screen-inventory.md` §A.5. Registration
/// window state, Register/Join Waitlist with an inline confirm dialog
/// (rather than a separate Registration/Waitlist screen — same fold-in
/// discipline M6 used for time-proposal review), and entry points into
/// Registered Players, Current Round, and Standings.
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

    return Scaffold(
      appBar: AppBar(title: const Text('Season')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(seasonDetailProvider(widget.seasonId));
            ref.invalidate(currentRoundProvider(widget.seasonId));
            await ref.read(seasonDetailProvider(widget.seasonId).future);
          },
          child: switch (season) {
            AsyncData(:final value) => ListView(
              padding: const EdgeInsets.all(DriftSpacing.s5),
              children: [
                Text(
                  value.label,
                  style: Theme.of(context).extension<DriftTypography>()!.h1,
                ),
                const SizedBox(height: DriftSpacing.s1),
                Text(
                  value.leagueName,
                  style: Theme.of(context)
                      .extension<DriftTypography>()!
                      .bodySmall
                      .copyWith(
                        color: Theme.of(
                          context,
                        ).extension<DriftColors>()!.textSecondary,
                      ),
                ),
                const SizedBox(height: DriftSpacing.s3),
                _StateBadge(state: value.state),
                const SizedBox(height: DriftSpacing.s4),

                if (value.state == SeasonState.active ||
                    value.state == SeasonState.completed)
                  DriftCard(
                    child: DriftSeasonProgress(
                      currentRound: currentRound.valueOrNull?.index ?? 0,
                      roundCount: value.roundCount,
                    ),
                  ),

                const SizedBox(height: DriftSpacing.s4),
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

                const SizedBox(height: DriftSpacing.s4),
                DriftCard(
                  onTap: () => context.push(
                    '/compete/seasons/${widget.seasonId}/players',
                  ),
                  child: _LinkRow(label: 'Registered Players'),
                ),
                const SizedBox(height: DriftSpacing.s3),
                if (currentRound.valueOrNull != null)
                  DriftCard(
                    onTap: () => context.push(
                      '/compete/seasons/${widget.seasonId}/rounds/${currentRound.value!.id}',
                    ),
                    child: _LinkRow(label: 'Current Round'),
                  ),
                if (currentRound.valueOrNull != null)
                  const SizedBox(height: DriftSpacing.s3),
                DriftCard(
                  onTap: () => context.push(
                    '/compete/seasons/${widget.seasonId}/standings',
                  ),
                  child: _LinkRow(label: 'Standings'),
                ),
              ],
            ),
            AsyncError() => const Center(child: Text('Season not available.')),
            _ => const Center(child: CircularProgressIndicator()),
          },
        ),
      ),
    );
  }
}

class _LinkRow extends StatelessWidget {
  const _LinkRow({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: Theme.of(context).extension<DriftTypography>()!.title,
          ),
        ),
        Icon(
          Icons.chevron_right,
          color: Theme.of(context).extension<DriftColors>()!.textSecondary,
        ),
      ],
    );
  }
}

class _StateBadge extends StatelessWidget {
  const _StateBadge({required this.state});

  final SeasonState state;

  @override
  Widget build(BuildContext context) {
    final (tone, icon) = switch (state) {
      SeasonState.draft => (DriftStatusTone.neutral, Icons.hourglass_empty),
      SeasonState.registrationOpen => (
        DriftStatusTone.success,
        Icons.how_to_reg,
      ),
      SeasonState.scheduled => (DriftStatusTone.info, Icons.event),
      SeasonState.active => (DriftStatusTone.success, Icons.sports_tennis),
      SeasonState.completed => (
        DriftStatusTone.neutral,
        Icons.check_circle_outline,
      ),
      SeasonState.cancelled => (DriftStatusTone.error, Icons.cancel_outlined),
    };
    return DriftStatusBadge(label: state.label, tone: tone, icon: icon);
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
      return DriftCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("You're registered", style: type.h4),
            const SizedBox(height: DriftSpacing.s3),
            if (season.state == SeasonState.registrationOpen ||
                season.state == SeasonState.draft)
              DriftButton(
                label: 'Withdraw',
                variant: DriftButtonVariant.text,
                onPressed: isBusy
                    ? null
                    : () => _confirmWithdraw(context, onWithdraw),
              ),
          ],
        ),
      );
    }

    if (season.viewerRegistrationStatus ==
        SeasonRegistrationStatus.waitlisted) {
      return DriftCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('On the waitlist', style: type.h4),
            const SizedBox(height: DriftSpacing.s1),
            Text(
              "We'll move you in automatically if a spot opens up.",
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
            const SizedBox(height: DriftSpacing.s3),
            DriftButton(
              label: 'Leave Waitlist',
              variant: DriftButtonVariant.text,
              onPressed: isBusy
                  ? null
                  : () => _confirmWithdraw(context, onWithdraw),
            ),
          ],
        ),
      );
    }

    if (season.state != SeasonState.registrationOpen) {
      return DriftCard(
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

    return DriftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Registration open', style: type.h4),
          const SizedBox(height: DriftSpacing.s1),
          Text(
            season.capacity != null
                ? '${season.enrolledCount} of ${season.capacity} spots filled'
                : '${season.enrolledCount} registered',
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: DriftSpacing.s3),
          DriftButton(
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
              ? "You'll be added to the waitlist and enrolled automatically if a spot opens up."
              : "You'll be paired with other registered players once the season starts.",
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
          "You can register again later, as long as registration is still open.",
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
