import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_match_card.dart';
import '../../../shared/widgets/drift_recent_form.dart';
import '../../players/presentation/player_search_screen.dart';
import '../../users/application/current_user_provider.dart';
import '../application/matches_providers.dart';
import '../data/player_stats.dart';

/// Play Hub — `foundation/04-screen-inventory.md` §A.4. Segmented
/// Find / Challenges / Active / History.
class PlayHubScreen extends ConsumerStatefulWidget {
  const PlayHubScreen({super.key});

  @override
  ConsumerState<PlayHubScreen> createState() => _PlayHubScreenState();
}

class _PlayHubScreenState extends ConsumerState<PlayHubScreen> {
  int _segment = 0;

  static const _labels = ['Find', 'Challenges', 'Active', 'History'];

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              DriftSpacing.s4,
              DriftSpacing.s4,
              DriftSpacing.s4,
              DriftSpacing.s3,
            ),
            child: Row(
              children: [
                Expanded(child: Text('Play', style: type.display)),
                IconButton(
                  onPressed: () => context.push('/messages'),
                  icon: const Icon(Icons.chat_bubble_outline),
                  tooltip: 'Messages',
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: DriftSpacing.s4),
            child: SegmentedButton<int>(
              segments: [
                for (var i = 0; i < _labels.length; i++)
                  ButtonSegment(value: i, label: Text(_labels[i])),
              ],
              selected: {_segment},
              showSelectedIcon: false,
              onSelectionChanged: (s) => setState(() => _segment = s.first),
            ),
          ),
          const SizedBox(height: DriftSpacing.s3),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _body() {
    return switch (_segment) {
      0 => const PlayerSearchScreen(embedded: true),
      1 => const _MatchList(segment: MatchSegment.challenges),
      2 => const _MatchList(segment: MatchSegment.active),
      _ => const _HistoryTab(),
    };
  }
}

/// Match History List with a "Your stats" header — the pragmatic stand-in
/// for a first-party stats entry point until Own Profile (M12) exists.
class _HistoryTab extends ConsumerWidget {
  const _HistoryTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(myStatsProvider);

    return _MatchList(
      segment: MatchSegment.history,
      header: stats.valueOrNull == null
          ? null
          : _StatsHeader(stats: stats.value!),
    );
  }
}

class _StatsHeader extends StatelessWidget {
  const _StatsHeader({required this.stats});

  final PlayerStats stats;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftCard(
      onTap: () =>
          context.push('/stats', extra: (title: 'Your Stats', stats: stats)),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Your stats', style: type.h4),
                const SizedBox(height: DriftSpacing.s2),
                DriftRecentForm(results: stats.recentForm),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: colors.textSecondary),
        ],
      ),
    );
  }
}

class _MatchList extends ConsumerWidget {
  const _MatchList({required this.segment, this.header});

  final MatchSegment segment;

  /// An optional header rendered above the list — kept as part of the same
  /// scrollable rather than a separate outer ListView (Flutter doesn't
  /// allow nesting two unbounded ListViews).
  final Widget? header;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matches = ref.watch(matchListProvider(segment));
    final viewer = ref.watch(currentUserProvider).valueOrNull;

    return RefreshIndicator(
      onRefresh: () => ref.refresh(matchListProvider(segment).future),
      child: switch (matches) {
        AsyncData(:final value) => ListView(
          padding: const EdgeInsets.all(DriftSpacing.s4),
          children: [
            if (header != null) ...[
              header!,
              const SizedBox(height: DriftSpacing.s4),
            ],
            if (value.isEmpty)
              _EmptyState(segment: segment)
            else
              for (var i = 0; i < value.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: DriftSpacing.s3),
                  child: DriftMatchCard(
                    match: value[i],
                    viewerId: viewer?.id ?? '',
                    onTap: () => context.push('/matches/${value[i].id}'),
                  ),
                ),
          ],
        ),
        AsyncError() => const Center(
          child: Text("Couldn't load your matches."),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.segment});

  final MatchSegment segment;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    // Copy taken verbatim from foundation/04-screen-inventory.md §A.4.
    final message = switch (segment) {
      MatchSegment.active =>
        'No upcoming matches — challenge someone to get started',
      MatchSegment.history => 'Play your first match to start building history',
      MatchSegment.challenges =>
        'No open challenges — find a player and send one',
    };

    return Padding(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      child: Column(
        children: [
          const SizedBox(height: DriftSpacing.s12),
          Icon(
            segment == MatchSegment.history
                ? Icons.history
                : Icons.sports_tennis_outlined,
            size: 40,
            color: colors.textSecondary,
          ),
          const SizedBox(height: DriftSpacing.s3),
          Text(
            message,
            style: type.body.copyWith(color: colors.textSecondary),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
