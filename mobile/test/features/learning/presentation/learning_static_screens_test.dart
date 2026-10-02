import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/learning/presentation/add_practice_session_screen.dart';
import 'package:drift_tennis/features/learning/presentation/create_goal_screen.dart';
import 'package:drift_tennis/features/learning/application/learning_providers.dart';
import 'package:drift_tennis/features/learning/data/learning_repository.dart';
import 'package:drift_tennis/features/learning/presentation/learning_home_screen.dart';

import '../../../support/pump.dart';

void main() {
  final screens = <String, Widget Function()>{
    'LearningHomeScreen': () => const LearningHomeScreen(),
    'CreateGoalScreen': () => const CreateGoalScreen(),
    'AddPracticeSessionScreen': () => const AddPracticeSessionScreen(),
  };

  // LearningHomeScreen watches contentBrowseProvider. Left alone it reaches
  // for the network: the spinner animates forever so pumpAndSettle never
  // returns, and the request's own timeout outlives the test ("A Timer is
  // still pending after the widget tree was disposed"). Resolving it to an
  // empty list fixes both and renders the empty state, which is a real branch
  // rather than a spinner.
  final overrides = [
    contentBrowseProvider(
      (type: null, targetSkill: null),
    ).overrideWith((ref) async => <ContentSummary>[]),
  ];

  for (final entry in screens.entries) {
    group(entry.key, () {
      for (final brightness in Brightness.values) {
        testWidgets('renders without throwing in ${brightness.name}', (
          tester,
        ) async {
          // Routed rather than bare: LearningHomeScreen holds `context.go`
          // callbacks and asserts "No GoRouter found in context" at build
          // time, before anything is tapped. The other two do not need a
          // router, but render identically under one, so they share it
          // rather than earning a special case.
          await pumpRouted(
            tester,
            Scaffold(body: entry.value()),
            brightness: brightness,
            overrides: overrides,
          );

          expect(tester.takeException(), isNull);
        });
      }
    });
  }
}
