import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/learning/application/learning_providers.dart';
import 'package:drift_tennis/features/learning/data/learning_repository.dart';
import 'package:drift_tennis/features/learning/presentation/assessment_history_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('AssessmentHistoryScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders past assessments in $label', (tester) async {
        await pumpScreen(
          tester,
          const AssessmentHistoryScreen(),
          brightness: brightness,
          overrides: [
            progressReportProvider.overrideWith(
              (ref) async => progressReport(withHistory: true),
            ),
          ],
        );

        expect(find.text('Assessment History'), findsOneWidget);
        expect(find.text('20/8/2026'), findsOneWidget);
        expect(find.text('Level 4.0'), findsOneWidget);
      });

      testWidgets("says so when there's no second assessment yet in $label", (
        tester,
      ) async {
        await pumpScreen(
          tester,
          const AssessmentHistoryScreen(),
          brightness: brightness,
          overrides: [
            progressReportProvider.overrideWith(
              (ref) async => progressReport(withHistory: false),
            ),
          ],
        );

        expect(find.text('Only one assessment so far'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const AssessmentHistoryScreen(),
        settle: false,
        overrides: [
          progressReportProvider.overrideWith(
            (ref) => pending<ProgressReport>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const AssessmentHistoryScreen(),
        overrides: [
          progressReportProvider.overrideWith(
            (ref) => failing<ProgressReport>(),
          ),
        ],
      );

      expect(find.text('Not available.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
