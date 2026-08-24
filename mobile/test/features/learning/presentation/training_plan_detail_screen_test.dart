import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/learning/application/learning_providers.dart';
import 'package:drift_tennis/features/learning/data/learning_repository.dart';
import 'package:drift_tennis/features/learning/presentation/training_plan_detail_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('TrainingPlanDetailScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the plan and its steps in $label', (tester) async {
        await pumpScreen(
          tester,
          const TrainingPlanDetailScreen(planId: 'c1'),
          brightness: brightness,
          overrides: [
            contentDetailProvider('c1').overrideWith(
              (ref) async => contentDetail(
                type: 'TRAINING_PLAN',
                title: 'Serve in three weeks',
                steps: [
                  contentSummary(id: 's1', title: 'Week 1: targets'),
                  contentSummary(id: 's2', title: 'Week 2: rhythm'),
                ],
              ),
            ),
          ],
        );

        expect(find.text('Serve in three weeks'), findsOneWidget);
        expect(find.text('Steps'), findsOneWidget);
        expect(find.text('Week 1: targets'), findsOneWidget);
        expect(find.text('Week 2: rhythm'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const TrainingPlanDetailScreen(planId: 'c1'),
        settle: false,
        overrides: [
          contentDetailProvider('c1').overrideWith(
            (ref) => pending<ContentDetail>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const TrainingPlanDetailScreen(planId: 'c1'),
        overrides: [
          contentDetailProvider('c1').overrideWith(
            (ref) => failing<ContentDetail>(),
          ),
        ],
      );

      expect(find.text('Plan not available.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
