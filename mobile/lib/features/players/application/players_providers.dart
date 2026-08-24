import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/players_repository.dart';

/// Current discovery filters. The search provider watches this, so changing
/// a filter refetches without any manual invalidation.
final playerFiltersProvider = StateProvider<PlayerFilters>(
  (ref) => const PlayerFilters(),
);

final playerSearchProvider = FutureProvider<List<PlayerSummary>>((ref) {
  final filters = ref.watch(playerFiltersProvider);
  return ref.watch(playersRepositoryProvider).search(filters);
});

final playerProfileProvider = FutureProvider.family<PlayerProfile, String>((
  ref,
  playerId,
) {
  return ref.watch(playersRepositoryProvider).findOne(playerId);
});
