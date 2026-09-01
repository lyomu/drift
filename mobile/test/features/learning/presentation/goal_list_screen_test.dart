import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/learning/application/learning_providers.dart';
import 'package:drift_tennis/features/learning/data/learning_repository.dart';
import 'package:drift_tennis/features/learning/presentation/goal_list_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('GoalListScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders goals in $label', (tester) async {
        await pumpScreen(
          tester,
          const GoalListScreen(),
          brightness: brightness,
          overrides: [
            goalsProvider.overrideWith((ref) async => [goal()]),
          ],
        );

        expect(find.text('Goals'), findsOneWidget);
        expect(find.text('Serve'), findsOneWidget);
        expect(find.text('Target 4.5/6'), findsOneWidget);
      });

      testWidgets('renders its empty state in $label', (tester) async {
        await pumpScreen(
          tester,
          const GoalListScreen(),
          brightness: brightness,
          overrides: [goalsProvider.overrideWith((ref) async => <Goal>[])],
        );

        expect(find.text('Set your first development goal'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const GoalListScreen(),
        settle: false,
        overrides: [goalsProvider.overrideWith((ref) => pending<List<Goal>>())],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const GoalListScreen(),
        overrides: [goalsProvider.overrideWith((ref) => failing<List<Goal>>())],
      );

      expect(find.text("Couldn't load goals."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
