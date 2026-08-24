import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:drift_tennis/features/assessment/data/assessment_repository.dart';
import 'package:drift_tennis/features/padel/presentation/add_padel_screen.dart';
import 'package:drift_tennis/features/padel/presentation/padel_assessment_question_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/mocks.dart';
import '../../../support/pump.dart';

void main() {
  late MockAssessmentRepository assessmentRepo;

  setUp(() {
    assessmentRepo = MockAssessmentRepository();
    when(() => assessmentRepo.startOrResumeSession())
        .thenAnswer((_) async => assessmentSession());
  });

  final screens = <String, Widget Function()>{
    'AddPadelScreen': () => const AddPadelScreen(),
    // The question screen starts a real session on mount through the padel
    // repository provider; pin it to the mock so no Dio timer outlives the
    // test, and pump once because its spinner never settles in fake async.
    'PadelAssessmentQuestionScreen': () => const PadelAssessmentQuestionScreen(),
  };

  for (final entry in screens.entries) {
    group(entry.key, () {
      for (final brightness in Brightness.values) {
        testWidgets('renders without throwing in ${brightness.name}',
            (tester) async {
          await pumpScreen(
            tester,
            Scaffold(body: entry.value()),
            settle: false,
            brightness: brightness,
            overrides: [
              padelAssessmentRepositoryProvider.overrideWithValue(
                assessmentRepo,
              ),
            ],
          );
          await tester.pump();

          expect(tester.takeException(), isNull);
        });
      }
    });
  }
}
