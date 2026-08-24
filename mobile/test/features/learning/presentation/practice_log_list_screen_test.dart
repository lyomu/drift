import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/learning/application/learning_providers.dart';
import 'package:drift_tennis/features/learning/data/learning_repository.dart';
import 'package:drift_tennis/features/learning/presentation/practice_log_list_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('PracticeLogListScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders logged sessions in $label', (tester) async {
        await pumpScreen(
          tester,
          const PracticeLogListScreen(),
          brightness: brightness,
          overrides: [
            practiceSessionsProvider.overrideWith(
              (ref) async => [practiceSession()],
            ),
          ],
        );

        expect(find.text('Practice Log'), findsOneWidget);
        expect(find.text('Serve'), findsOneWidget);
        expect(find.textContaining('45 min'), findsOneWidget);
      });

      testWidgets('renders its empty state in $label', (tester) async {
        await pumpScreen(
          tester,
          const PracticeLogListScreen(),
          brightness: brightness,
          overrides: [
            practiceSessionsProvider.overrideWith(
              (ref) async => <PracticeSessionEntry>[],
            ),
          ],
        );

        expect(find.text('Log your first practice session'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const PracticeLogListScreen(),
        settle: false,
        overrides: [
          practiceSessionsProvider.overrideWith(
            (ref) => pending<List<PracticeSessionEntry>>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const PracticeLogListScreen(),
        overrides: [
          practiceSessionsProvider.overrideWith(
            (ref) => failing<List<PracticeSessionEntry>>(),
          ),
        ],
      );

      expect(find.text("Couldn't load your practice log."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
