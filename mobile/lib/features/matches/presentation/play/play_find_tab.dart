import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/widgets/drift_player_results.dart';
import '../../../players/application/players_providers.dart';
import '../../../players/data/players_repository.dart';
import '../../../players/presentation/player_filters_sheet.dart';
import '../../../players/presentation/player_search_screen.dart';
import '../../../../core/theme/drift_colors.dart';


/// Play → Find (redesign 2026-10). Ranked player search with a "Challenge"
/// shortcut on each card.
///
/// Structurally the same surface as Discover → Players: same provider, same
/// filters sheet, same [DriftPlayerResultCard]. Only the card's action
/// differs, so this file holds the Challenge wiring and nothing else. The
/// Play header also carries a filter button (declared in [AppShell]), which
/// opens the same sheet as the one beside the search box.
class PlayFindTab extends ConsumerStatefulWidget {
  const PlayFindTab({super.key});

  @override
  ConsumerState<PlayFindTab> createState() => _PlayFindTabState();
}

class _PlayFindTabState extends ConsumerState<PlayFindTab> {
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

    return Column(
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
              _ => Center(child: CircularProgressIndicator()),
            },
          ),
        ),
      ],
    );
  }

  Widget _list(List<PlayerSummary> players) {
    if (players.isEmpty) {
      return _message(
        _query.trim().isEmpty
            ? 'No players match. Try widening your filters.'
            : 'No players found.',
      );
    }
    return ListView.separated(
      padding: EdgeInsets.fromLTRB(16, 12, 16, 24),
      itemCount: players.length,
      separatorBuilder: (_, _) => SizedBox(height: 10),
      itemBuilder: (context, i) => DriftPlayerResultCard(
        player: players[i],
        action: DriftPlayerActionButton(
          label: 'Challenge',
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
