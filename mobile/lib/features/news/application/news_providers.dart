import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/news_repository.dart';

// `.autoDispose` throughout — the M9 convention (see PROGRESS.md).

final newsCategoryProvider = StateProvider<String?>((ref) => null);

final newsFeedProvider = FutureProvider.autoDispose<List<StorySummary>>((ref) {
  final category = ref.watch(newsCategoryProvider);
  return ref.watch(newsRepositoryProvider).browse(category: category);
});

final storyDetailProvider = FutureProvider.autoDispose
    .family<StoryDetail, String>((ref, id) {
      return ref.watch(newsRepositoryProvider).getStory(id);
    });

final savedStoriesProvider = FutureProvider.autoDispose<List<StorySummary>>((
  ref,
) {
  return ref.watch(newsRepositoryProvider).listSaved();
});
