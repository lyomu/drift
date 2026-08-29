import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/players_repository.dart';

// Fetches are `.autoDispose` per the M9 convention; the filter `StateProvider`
// deliberately is not, so filters survive navigating into a profile and back
// — the same split `courts/application/courts_providers.dart` uses.

/// Current discovery filters. The search provider watches this, so changing
/// a filter refetches without any manual invalidation.
final playerFiltersProvider = StateProvider<PlayerFilters>(
  (ref) => const PlayerFilters(),
);

final playerSearchProvider = FutureProvider.autoDispose<List<PlayerSummary>>((
  ref,
) {
  final filters = ref.watch(playerFiltersProvider);
  return ref.watch(playersRepositoryProvider).search(filters);
});

final playerProfileProvider = FutureProvider.autoDispose
    .family<PlayerProfile, String>((ref, playerId) {
      return ref.watch(playersRepositoryProvider).findOne(playerId);
    });
