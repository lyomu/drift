import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/learning/presentation/add_practice_session_screen.dart';
import 'package:drift_tennis/features/learning/presentation/create_goal_screen.dart';
import 'package:drift_tennis/features/learning/presentation/learning_home_screen.dart';

import '../../../support/pump.dart';

void main() {
  final screens = <String, Widget Function()>{
    'LearningHomeScreen': () => const LearningHomeScreen(),
    'CreateGoalScreen': () => const CreateGoalScreen(),
    'AddPracticeSessionScreen': () => const AddPracticeSessionScreen(),
  };

  for (final entry in screens.entries) {
    group(entry.key, () {
      for (final brightness in Brightness.values) {
        testWidgets('renders without throwing in ${brightness.name}', (
          tester,
        ) async {
          await pumpScreen(
            tester,
            Scaffold(body: entry.value()),
            brightness: brightness,
          );

          expect(tester.takeException(), isNull);
        });
      }
    });
  }
}
