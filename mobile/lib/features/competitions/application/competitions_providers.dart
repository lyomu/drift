import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/competitions_repository.dart';

// Every provider here is `.autoDispose` — M8's manual QA pass found that
// plain `FutureProvider`s cached season/round/standings reads for the
// app's entire session, so a screen revisited after server-side state
// genuinely changed (registration closing, a round opening) kept showing
// stale data until a full app restart. `.autoDispose` disposes the cache
// once nothing is watching, and each screen's `RefreshIndicator` covers
// the case where the same screen is still on-screen when state changes.
// This is the house convention from here on — see PROGRESS.md's M9 entry.

final leaguesProvider = FutureProvider.autoDispose<List<League>>((ref) {
  return ref.watch(competitionsRepositoryProvider).listLeagues();
});

final leagueDetailProvider = FutureProvider.autoDispose.family<League, String>((
  ref,
  leagueId,
) {
  return ref.watch(competitionsRepositoryProvider).getLeague(leagueId);
});

final seasonDetailProvider = FutureProvider.autoDispose
    .family<SeasonDetail, String>((ref, seasonId) {
      return ref.watch(competitionsRepositoryProvider).getSeason(seasonId);
    });

final registeredPlayersProvider = FutureProvider.autoDispose
    .family<List<RegisteredPlayer>, String>((ref, seasonId) {
      return ref
          .watch(competitionsRepositoryProvider)
          .getRegisteredPlayers(seasonId);
    });

final mySeasonsProvider = FutureProvider.autoDispose<List<MySeasonSummary>>((
  ref,
) {
  return ref.watch(competitionsRepositoryProvider).getMySeasons();
});

final currentRoundProvider = FutureProvider.autoDispose
    .family<CompetitionRound?, String>((ref, seasonId) {
      return ref
          .watch(competitionsRepositoryProvider)
          .getCurrentRound(seasonId);
    });

final roundProvider = FutureProvider.autoDispose
    .family<CompetitionRound, ({String seasonId, String roundId})>((
      ref,
      params,
    ) {
      return ref
          .watch(competitionsRepositoryProvider)
          .getRound(params.seasonId, params.roundId);
    });

final standingsProvider = FutureProvider.autoDispose
    .family<List<StandingRow>, String>((ref, seasonId) {
      return ref.watch(competitionsRepositoryProvider).getStandings(seasonId);
    });
