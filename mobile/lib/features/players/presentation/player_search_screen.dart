import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/drift_player_results.dart';
import '../application/players_providers.dart';
import '../data/players_repository.dart';
import 'player_filters_sheet.dart';

const _muted = Color(0xFF94A3B8);

/// Player Search / Discovery — `foundation/04-screen-inventory.md` §A.4
/// (redesign 2026-10). Results are ranked server-side (proximity + level
/// compatibility); the search box filters the loaded page by name or
/// location, since the API has no text query.
///
/// The list furniture is [DriftPlayerResultCard] / [DriftPlayerSearchBar],
/// shared with Play → Find — the two surfaces show the same card and differ
/// only in the card's action.
///
/// Renders [embedded] inside the Discover Hub, which already supplies the
/// title and SafeArea.
class PlayerSearchScreen extends ConsumerStatefulWidget {
  const PlayerSearchScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  ConsumerState<PlayerSearchScreen> createState() => _PlayerSearchScreenState();
}

class _PlayerSearchScreenState extends ConsumerState<PlayerSearchScreen> {
  final _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final results = ref.watch(playerSearchProvider);
    final filtersActive = !ref.watch(playerFiltersProvider).isEmpty;

    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DriftPlayerSearchBar(
          controller: _controller,
          onChanged: (v) => setState(() => _query = v),
          filtersActive: filtersActive,
          onFilters: () => showPlayerFiltersSheet(context, ref),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => ref.refresh(playerSearchProvider.future),
            child: switch (results) {
              AsyncData(:final value) => _list(filterPlayers(value, _query)),
              AsyncError() => _message("Couldn't load players. Pull to retry."),
              _ => const Center(child: CircularProgressIndicator()),
            },
          ),
        ),
      ],
    );

    return widget.embedded ? content : SafeArea(child: content);
  }

  Widget _list(List<PlayerSummary> players) {
    if (players.isEmpty) {
      return _message(
        _query.trim().isEmpty
            ? 'No players match these filters. Try widening distance or level '
                  'range.'
            : 'No players found.',
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      itemCount: players.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, i) => DriftPlayerResultCard(
        player: players[i],
        action: DriftPlayerActionButton(
          label: 'Connect',
          // The connect action itself lives on the profile, which is also
          // where the current relationship state is known.
          onTap: () => context.push('/players/${players[i].id}'),
        ),
      ),
    );
  }

  Widget _message(String text) {
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 64, 24, 24),
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14, height: 1.4, color: _muted),
          ),
        ),
      ],
    );
  }
}

/// Name-or-location match over the loaded page. Shared by both result
/// surfaces so "no results" means the same thing on each.
List<PlayerSummary> filterPlayers(List<PlayerSummary> players, String query) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return players;
  return players
      .where(
        (p) =>
            p.displayName.toLowerCase().contains(q) ||
            (p.generalLocation?.toLowerCase().contains(q) ?? false),
      )
      .toList();
}
