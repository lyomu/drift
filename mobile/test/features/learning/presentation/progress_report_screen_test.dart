import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/learning/application/learning_providers.dart';
import 'package:drift_tennis/features/learning/data/learning_repository.dart';
import 'package:drift_tennis/features/learning/presentation/progress_report_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('ProgressReportScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders scored skills in $label', (tester) async {
        await pumpScreen(
          tester,
          const ProgressReportScreen(),
          brightness: brightness,
          overrides: [
            progressReportProvider.overrideWith(
              (ref) async => progressReport(),
            ),
          ],
        );

        expect(find.text('Progress Report'), findsOneWidget);
        expect(find.text('Serve'), findsOneWidget);
        expect(find.text('Assessment History'), findsOneWidget);
      });

      testWidgets('explains an empty report in $label', (tester) async {
        await pumpScreen(
          tester,
          const ProgressReportScreen(),
          brightness: brightness,
          overrides: [
            progressReportProvider.overrideWith(
              (ref) async => ProgressReport(
                skills: const [
                  SkillScoreEntry(skill: 'SERVE', score: null, maturity: null),
                ],
                assessmentHistory: const [],
              ),
            ),
          ],
        );

        expect(
          find.text('Your progress report builds up as you play and practice'),
          findsOneWidget,
        );
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const ProgressReportScreen(),
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
        const ProgressReportScreen(),
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
