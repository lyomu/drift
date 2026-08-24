import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/learning_repository.dart';

// `.autoDispose` throughout — the M9 convention (see PROGRESS.md).

final skillProfileProvider = FutureProvider.autoDispose<SkillProfile>((ref) {
  return ref.watch(learningRepositoryProvider).getSkillProfile();
});

final skillDetailProvider = FutureProvider.autoDispose
    .family<SkillDetail, String>((ref, skill) {
      return ref.watch(learningRepositoryProvider).getSkillDetail(skill);
    });

final progressReportProvider = FutureProvider.autoDispose<ProgressReport>((
  ref,
) {
  return ref.watch(learningRepositoryProvider).getProgressReport();
});

final contentBrowseProvider = FutureProvider.autoDispose
    .family<List<ContentSummary>, ({String? type, String? targetSkill})>((
      ref,
      params,
    ) {
      return ref
          .watch(learningRepositoryProvider)
          .browseContent(type: params.type, targetSkill: params.targetSkill);
    });

final contentDetailProvider = FutureProvider.autoDispose
    .family<ContentDetail, String>((ref, id) {
      return ref.watch(learningRepositoryProvider).getContent(id);
    });

final practiceSessionsProvider =
    FutureProvider.autoDispose<List<PracticeSessionEntry>>((ref) {
      return ref.watch(learningRepositoryProvider).listPracticeSessions();
    });

final goalsProvider = FutureProvider.autoDispose<List<Goal>>((ref) {
  return ref.watch(learningRepositoryProvider).listGoals();
});

final goalDetailProvider = FutureProvider.autoDispose.family<Goal, String>((
  ref,
  id,
) {
  return ref.watch(learningRepositoryProvider).getGoal(id);
});
