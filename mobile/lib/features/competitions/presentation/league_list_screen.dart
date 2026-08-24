import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_league_card.dart';
import '../application/competitions_providers.dart';

/// League Discovery / List — `foundation/04-screen-inventory.md` §A.5.
class LeagueListScreen extends ConsumerWidget {
  const LeagueListScreen({super.key, this.embedded = false});

  /// Rendered inside Compete Hub's Leagues segment when true, which already
  /// supplies the title and SafeArea.
  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leagues = ref.watch(leaguesProvider);

    final content = RefreshIndicator(
      onRefresh: () => ref.refresh(leaguesProvider.future),
      child: switch (leagues) {
        AsyncData(:final value) =>
          value.isEmpty
              ? const _EmptyState()
              : ListView.separated(
                  padding: const EdgeInsets.all(DriftSpacing.s4),
                  itemCount: value.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(height: DriftSpacing.s3),
                  itemBuilder: (context, index) => DriftLeagueCard(
                    league: value[index],
                    onTap: () =>
                        context.push('/compete/leagues/${value[index].id}'),
                  ),
                ),
        AsyncError() => _ErrorState(
          onRetry: () => ref.invalidate(leaguesProvider),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );

    if (embedded) return content;

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(DriftSpacing.s4),
            child: Text(
              'Leagues',
              style: Theme.of(context).extension<DriftTypography>()!.display,
            ),
          ),
          Expanded(child: content),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            children: [
              const SizedBox(height: DriftSpacing.s12),
              Icon(
                Icons.emoji_events_outlined,
                size: 40,
                color: colors.textSecondary,
              ),
              const SizedBox(height: DriftSpacing.s3),
              Text(
                'No leagues near you yet — try widening your search',
                style: type.body.copyWith(color: colors.textSecondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            children: [
              const SizedBox(height: DriftSpacing.s12),
              Text(
                "Couldn't load leagues. Please try again.",
                style: type.body,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: DriftSpacing.s4),
              DriftButton(
                label: 'Retry',
                variant: DriftButtonVariant.text,
                onPressed: onRetry,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
