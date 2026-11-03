import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/drift_player_results.dart';
import '../application/players_providers.dart';
import '../data/players_repository.dart';
import 'player_filters_sheet.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/l10n/l10n.dart';


/// Player Search / Discovery — `foundation/04-screen-inventory.md` §A.4
/// (redesign 2026-10). Results are ranked server-side (proximity + level
/// compatibility); the search box filters the loaded page by name or
/// location, since the API has no text query.
///
/// Discover → Find players (2026-11 restructure): this absorbed the old
/// Play → Find tab, which was the same list with a Challenge button. The
/// card's action is now Challenge; tapping the card itself still opens the
/// profile, where Connect lives.
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
              AsyncError() => _message(context.l10n.playLoadPlayersFailed),
              _ => Center(child: CircularProgressIndicator()),
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
            ? context.l10n.playerNoMatchFilters
            : context.l10n.playNoPlayersFound,
      );
    }
    return ListView.separated(
      padding: EdgeInsets.fromLTRB(16, 12, 16, 24),
      itemCount: players.length,
      separatorBuilder: (_, _) => SizedBox(height: 10),
      itemBuilder: (context, i) => DriftPlayerResultCard(
        player: players[i],
        action: DriftPlayerActionButton(
          label: context.l10n.matchChallenge,
          // Opens the composer with this player pre-filled; the challenge is
          // not sent until it is submitted there.
          onTap: () => context.push('/challenge', extra: players[i]),
        ),
      ),
    );
  }

  Widget _message(String text) {
    return ListView(
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(24, 64, 24, 24),
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, height: 1.4, color: Theme.of(context).extension<DriftColors>()!.textSecondary),
          ),
        ),
      ],
    );
  }
}

/// Name-or-location match over the loaded page.
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
