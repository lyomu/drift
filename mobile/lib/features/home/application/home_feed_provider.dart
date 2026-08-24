import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/home_repository.dart';

final homeFeedProvider = FutureProvider<List<HomeCard>>((ref) {
  return ref.watch(homeRepositoryProvider).getFeed();
});
