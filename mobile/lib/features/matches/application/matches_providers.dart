import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/realtime/socket_client.dart';
import '../data/matches_repository.dart';
import '../data/player_stats.dart';

/// Play Hub segments that map to a server-side filter.
enum MatchSegment {
  challenges('challenges'),
  active('active'),
  history('history');

  const MatchSegment(this.wireValue);

  final String wireValue;
}

// `.autoDispose` throughout — the M9 convention (see the note at the top of
// `competitions/application/competitions_providers.dart`). These providers
// predate that convention and were missed when it was applied: without it a
// match viewed once stays cached for the app's lifetime, so Play Hub and
// Match Detail can show a stale state after navigating away and back unless
// a socket event happens to arrive.

final matchListProvider = FutureProvider.autoDispose
    .family<List<DriftMatch>, MatchSegment>((ref, segment) {
      // Any match update pushed over the socket invalidates the list, so the
      // Play Hub reflects a challenge that arrived while it was open.
      ref.listen(socketMatchUpdatesProvider, (_, _) {
        ref.invalidateSelf();
      });
      return ref
          .watch(matchesRepositoryProvider)
          .list(segment: segment.wireValue);
    });

final matchDetailProvider = FutureProvider.autoDispose
    .family<DriftMatch, String>((ref, matchId) {
      ref.listen(socketMatchUpdatesProvider, (_, next) {
        final updated = next.valueOrNull;
        if (updated != null && updated['matchId'] == matchId) {
          ref.invalidateSelf();
        }
      });
      return ref.watch(matchesRepositoryProvider).findOne(matchId);
    });

/// The signed-in player's own rating/W-L/recent form — Match History List's
/// "Your stats" header, the pragmatic stand-in until Own Profile (M12)
/// exists.
final myStatsProvider = FutureProvider.autoDispose<PlayerStats>((ref) {
  return ref.watch(matchesRepositoryProvider).getMyStats();
});
