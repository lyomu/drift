import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/home_repository.dart';

// Every provider here is `.autoDispose`, per the convention set in M9 (see
// the note at the top of `competitions/application/competitions_providers.dart`).
// Home is the screen most affected by a session-lifetime cache: a challenge
// arriving, a round opening, a result being confirmed are all things that
// happen *while the user is elsewhere in the app*, and a cached feed can
// never show them.

final homeFeedProvider = FutureProvider.autoDispose<List<HomeCard>>((ref) {
  return ref.watch(homeRepositoryProvider).getFeed();
});

final homeSummaryProvider = FutureProvider.autoDispose<HomeSummary>((ref) {
  return ref.watch(homeRepositoryProvider).getSummary();
});
