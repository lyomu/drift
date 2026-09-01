import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:drift_tennis/features/assessment/data/assessment_repository.dart';
import 'package:drift_tennis/features/assessment/presentation/assessment_question_screen.dart';
import 'package:drift_tennis/features/auth/data/auth_repository.dart';

import '../../../support/fixtures.dart';
import '../../../support/mocks.dart';
import '../../../support/pump.dart';

void main() {
  late MockAssessmentRepository assessmentRepo;

  setUp(() {
    assessmentRepo = MockAssessmentRepository();
    when(
      () => assessmentRepo.startOrResumeSession(),
    ).thenAnswer((_) async => assessmentSession());
  });

  group('AssessmentQuestionScreen', () {
    for (final brightness in Brightness.values) {
      testWidgets('renders the question in ${brightness.name}', (tester) async {
        await pumpScreen(
          tester,
          Scaffold(
            body: AssessmentQuestionScreen(
              repositoryProvider: Provider<AssessmentRepository>(
                (ref) => assessmentRepo,
              ),
            ),
          ),
          brightness: brightness,
          overrides: [
            // The screen reads the repo through this provider when the
            // constructor override isn't supplied; pin both paths.
            assessmentRepositoryProvider.overrideWithValue(assessmentRepo),
          ],
        );

        expect(tester.takeException(), isNull);
      });
    }

    testWidgets("survives a failed session start without throwing", (
      tester,
    ) async {
      when(
        () => assessmentRepo.startOrResumeSession(),
      ).thenThrow(AuthException('Something went wrong. Please try again.'));

      await pumpScreen(
        tester,
        Scaffold(body: const AssessmentQuestionScreen()),
        overrides: [
          assessmentRepositoryProvider.overrideWithValue(assessmentRepo),
        ],
      );

      expect(tester.takeException(), isNull);
    });
  });
}
