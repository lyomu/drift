import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../application/players_providers.dart';
import '../data/players_repository.dart';
import 'player_filters_sheet.dart';

/// Player Search / Discovery — `foundation/04-screen-inventory.md` §A.4.
/// Results are ranked server-side (proximity + level compatibility).
///
/// The IA lists this under both Discover and Play → Find Players, so it
/// renders standalone (own title and SafeArea) or [embedded] as a Play Hub
/// segment, where the hub already supplies both.
class PlayerSearchScreen extends ConsumerWidget {
  const PlayerSearchScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final results = ref.watch(playerSearchProvider);
    final filters = ref.watch(playerFiltersProvider);

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!embedded)
          Padding(
            padding: const EdgeInsets.fromLTRB(
              DriftSpacing.s4,
              DriftSpacing.s4,
              DriftSpacing.s4,
              DriftSpacing.s2,
            ),
            child: Row(
              children: [
                Expanded(child: Text('Players', style: type.display)),
                IconButton(
                  onPressed: () => context.push('/connections'),
                  icon: const Icon(Icons.people_outline),
                  tooltip: 'Connections',
                ),
                _FilterButton(
                  isActive: !filters.isEmpty,
                  onPressed: () => showPlayerFiltersSheet(context, ref),
                ),
              ],
            ),
          )
        else
          Align(
            alignment: Alignment.centerRight,
            child: Padding(
              padding: const EdgeInsets.only(right: DriftSpacing.s2),
              child: _FilterButton(
                isActive: !filters.isEmpty,
                onPressed: () => showPlayerFiltersSheet(context, ref),
              ),
            ),
          ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => ref.refresh(playerSearchProvider.future),
            child: switch (results) {
              AsyncData(:final value) =>
                value.isEmpty
                    ? const _EmptyResults()
                    : _ResultsList(players: value),
              AsyncError() => _SearchError(
                onRetry: () => ref.invalidate(playerSearchProvider),
              ),
              _ => const Center(child: CircularProgressIndicator()),
            },
          ),
        ),
      ],
    );

    // Play Hub already provides the SafeArea; nesting a second one would
    // double the top inset.
    return embedded ? content : SafeArea(child: content);
  }
}

class _FilterButton extends StatelessWidget {
  const _FilterButton({required this.isActive, required this.onPressed});

  final bool isActive;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return IconButton(
      onPressed: onPressed,
      tooltip: 'Filters',
      icon: Icon(
        isActive ? Icons.filter_alt : Icons.filter_alt_outlined,
        color: isActive ? colors.primary : null,
      ),
    );
  }
}

class _ResultsList extends StatelessWidget {
  const _ResultsList({required this.players});

  final List<PlayerSummary> players;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(
        DriftSpacing.s4,
        0,
        DriftSpacing.s4,
        DriftSpacing.s4,
      ),
      itemCount: players.length,
      separatorBuilder: (_, _) => const SizedBox(height: DriftSpacing.s3),
      itemBuilder: (context, index) {
        final player = players[index];
        return DriftPlayerCard(
          player: player,
          onTap: () => context.push('/players/${player.id}'),
        );
      },
    );
  }
}

class _EmptyResults extends StatelessWidget {
  const _EmptyResults();

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
              Icon(Icons.search_off, size: 40, color: colors.textSecondary),
              const SizedBox(height: DriftSpacing.s3),
              Text(
                'No players match these filters — try widening distance or '
                'level range',
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

class _SearchError extends StatelessWidget {
  const _SearchError({required this.onRetry});

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
                "Couldn't load players. Please try again.",
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
