import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/coaches_repository.dart';

final coachFiltersProvider = StateProvider.autoDispose<CoachFilters>(
  (ref) => const CoachFilters(),
);

final coachSearchProvider = FutureProvider.autoDispose<List<CoachSummary>>((
  ref,
) {
  final filters = ref.watch(coachFiltersProvider);
  return ref.watch(coachesRepositoryProvider).search(filters);
});

final coachProfileProvider =
    FutureProvider.autoDispose.family<CoachProfile, String>((ref, coachId) {
      return ref.watch(coachesRepositoryProvider).findOne(coachId);
    });
