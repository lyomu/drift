import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/learning/application/learning_providers.dart';
import 'package:drift_tennis/features/learning/data/learning_repository.dart';
import 'package:drift_tennis/features/learning/presentation/goal_detail_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('GoalDetailScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the goal with its milestones in $label', (
        tester,
      ) async {
        await pumpScreen(
          tester,
          const GoalDetailScreen(goalId: 'g1'),
          brightness: brightness,
          overrides: [
            goalDetailProvider('g1').overrideWith((ref) async => goal()),
          ],
        );

        expect(find.text('Serve'), findsOneWidget);
        expect(find.text('Baseline'), findsOneWidget);
        expect(find.text('Current'), findsOneWidget);
        expect(find.text('Target'), findsOneWidget);
        expect(find.text('Milestones'), findsOneWidget);
        expect(find.text('Reach 3.5'), findsOneWidget);
        expect(find.text('3.5/6'), findsOneWidget);
      });

      testWidgets('shows a spinner while loading in $label', (tester) async {
        await pumpScreen(
          tester,
          const GoalDetailScreen(goalId: 'g1'),
          brightness: brightness,
          settle: false,
          overrides: [
            goalDetailProvider('g1').overrideWith((ref) => pending<Goal>()),
          ],
        );

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      });
    }

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const GoalDetailScreen(goalId: 'g1'),
        overrides: [
          goalDetailProvider('g1').overrideWith((ref) => failing<Goal>()),
        ],
      );

      expect(find.text('Goal not available.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
