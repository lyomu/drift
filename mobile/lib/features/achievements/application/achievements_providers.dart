import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/achievements_repository.dart';

// `.autoDispose` per the M9 convention — achievements are derived from match,
// practice and club activity, so the tally changes as the user uses the app
// and must not be pinned to whatever it was on first view.
final achievementsProvider = FutureProvider.autoDispose<AchievementsResponse>((
  ref,
) {
  return ref.watch(achievementsRepositoryProvider).list();
});
