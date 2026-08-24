import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../assessment/data/assessment_repository.dart';
import '../../assessment/presentation/assessment_question_screen.dart';
import '../application/padel_providers.dart';

/// Add Padel — Assessment — `foundation/04-screen-inventory.md` §A.10.
/// A thin wrapper around the shared adaptive-question loop
/// ([AssessmentQuestionScreen]), pointed at the Padel endpoints and Padel's
/// own completion hand-off (Padel Profile, not onboarding's level-review).
class PadelAssessmentQuestionScreen extends ConsumerWidget {
  const PadelAssessmentQuestionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AssessmentQuestionScreen(
      title: 'Padel Assessment',
      repositoryProvider: padelAssessmentRepositoryProvider,
      onComplete: (context, result) {
        ref.invalidate(padelProfileProvider);
        context.pushReplacement('/profile/padel');
      },
    );
  }
}
