import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../matches/data/matches_repository.dart';
import '../../matches/data/player_stats.dart';
import '../data/padel_repository.dart';

// `.autoDispose` throughout — the M9 convention (see PROGRESS.md).

/// `null` means Padel hasn't been added yet — see [PadelRepository.getProfile].
final padelProfileProvider = FutureProvider.autoDispose<PadelProfile?>((ref) {
  return ref.watch(padelRepositoryProvider).getProfile();
});

/// Padel Match History & Stats (M13) — reuses `MatchesRepository`/
/// `PlayerStats` as-is, sport-scoped, rather than a parallel data layer.
final padelMatchHistoryProvider = FutureProvider.autoDispose((ref) {
  return ref
      .watch(matchesRepositoryProvider)
      .list(segment: 'history', sport: 'PADEL');
});

final padelStatsProvider = FutureProvider.autoDispose<PlayerStats>((ref) {
  return ref.watch(matchesRepositoryProvider).getMyStats(sport: 'PADEL');
});
