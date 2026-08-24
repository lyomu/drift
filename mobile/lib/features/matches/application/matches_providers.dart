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

final matchListProvider = FutureProvider.family<List<DriftMatch>, MatchSegment>(
  (ref, segment) {
    // Any match update pushed over the socket invalidates the list, so the
    // Play Hub reflects a challenge that arrived while it was open.
    ref.listen(socketMatchUpdatesProvider, (_, _) {
      ref.invalidateSelf();
    });
    return ref
        .watch(matchesRepositoryProvider)
        .list(segment: segment.wireValue);
  },
);

final matchDetailProvider = FutureProvider.family<DriftMatch, String>((
  ref,
  matchId,
) {
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
final myStatsProvider = FutureProvider<PlayerStats>((ref) {
  return ref.watch(matchesRepositoryProvider).getMyStats();
});
