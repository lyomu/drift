import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_pill_tabs.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/global_search_providers.dart';
import '../data/global_search_repository.dart';

/// Global Search - `foundation/04-screen-inventory.md` A.3. Cross-entity
/// results are all real backend records, and each row carries its own deep
/// link into the matching detail screen.
class GlobalSearchScreen extends ConsumerStatefulWidget {
  const GlobalSearchScreen({super.key, this.initialFilter});

  final GlobalSearchFilter? initialFilter;

  @override
  ConsumerState<GlobalSearchScreen> createState() => _GlobalSearchScreenState();
}

class _GlobalSearchScreenState extends ConsumerState<GlobalSearchScreen> {
  late final TextEditingController _controller;
  late GlobalSearchFilter _filter;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
    _filter = widget.initialFilter ?? GlobalSearchFilter.all;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final trimmed = _query.trim();
    final results = trimmed.length < 2
        ? null
        : ref.watch(globalSearchProvider((query: trimmed, filter: _filter)));

    return DriftScaffold(
      title: 'Search',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          SearchBar(
            controller: _controller,
            leading: const Icon(Icons.search),
            hintText: 'Players, courts, clubs, competitions',
            onChanged: (value) => setState(() => _query = value),
            onSubmitted: (value) => setState(() => _query = value),
          ),
          const SizedBox(height: DriftSpacing.s3),
          DriftPillTabs(
            labels: [
              for (final filter in GlobalSearchFilter.values) filter.label,
            ],
            selected: GlobalSearchFilter.values.indexOf(_filter),
            onChanged: (i) =>
                setState(() => _filter = GlobalSearchFilter.values[i]),
          ),
          const SizedBox(height: DriftSpacing.s5),
          if (trimmed.length < 2)
            _SearchHint(colors: colors)
          else
            switch (results) {
              AsyncData(:final value) =>
                value.isEmpty
                    ? _EmptySearch(query: trimmed)
                    : Column(
                        children: [
                          for (final result in value) ...[
                            _SearchResultCard(result: result),
                            const SizedBox(height: DriftSpacing.s3),
                          ],
                        ],
                      ),
              AsyncError() => _SearchError(
                onRetry: () => ref.invalidate(
                  globalSearchProvider((query: trimmed, filter: _filter)),
                ),
              ),
              _ => const Center(child: CircularProgressIndicator()),
            },
        ],
      ),
    );
  }
}

class _SearchResultCard extends StatelessWidget {
  const _SearchResultCard({required this.result});

  final GlobalSearchResult result;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftCard(
      onTap: () => context.push(result.route),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: colors.primaryLight,
            child: Icon(_iconFor(result.type), color: colors.primaryDark),
          ),
          const SizedBox(width: DriftSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(result.title, style: type.title),
                const SizedBox(height: DriftSpacing.s1),
                Text(
                  result.subtitle ?? _labelFor(result.type),
                  style: type.bodySmall.copyWith(color: colors.textSecondary),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: colors.textSecondary),
        ],
      ),
    );
  }
}

class _SearchHint extends StatelessWidget {
  const _SearchHint({required this.colors});

  final DriftColors colors;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Padding(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      child: Text(
        'Type at least two characters to search across Drift.',
        style: type.body.copyWith(color: colors.textSecondary),
        textAlign: TextAlign.center,
      ),
    );
  }
}

class _EmptySearch extends StatelessWidget {
  const _EmptySearch({required this.query});

  final String query;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Padding(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      child: Column(
        children: [
          Icon(Icons.search_off, color: colors.textSecondary, size: 40),
          const SizedBox(height: DriftSpacing.s3),
          Text(
            "No results for '$query'. Try a broader search or another filter.",
            style: type.body.copyWith(color: colors.textSecondary),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _SearchError extends StatelessWidget {
  const _SearchError({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Padding(
      padding: const EdgeInsets.all(DriftSpacing.s6),
      child: Column(
        children: [
          Icon(Icons.error_outline, color: colors.error, size: 36),
          const SizedBox(height: DriftSpacing.s3),
          Text(
            "Couldn't load search results.",
            style: type.body.copyWith(color: colors.error),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: DriftSpacing.s3),
          TextButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}

IconData _iconFor(String type) => switch (type) {
  'PLAYER' => Icons.person_search_outlined,
  'COURT' => Icons.sports_tennis_outlined,
  'CLUB' => Icons.groups_outlined,
  'LEAGUE' || 'TOURNAMENT' || 'LADDER' => Icons.emoji_events_outlined,
  _ => Icons.search,
};

String _labelFor(String type) => switch (type) {
  'PLAYER' => 'Player',
  'COURT' => 'Court',
  'CLUB' => 'Club',
  'LEAGUE' => 'League',
  'TOURNAMENT' => 'Tournament',
  'LADDER' => 'Ladder',
  _ => 'Result',
};
