import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/learning/application/learning_providers.dart';
import 'package:drift_tennis/features/learning/data/learning_repository.dart';
import 'package:drift_tennis/features/learning/presentation/skill_profile_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('SkillProfileScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the skill list in $label', (tester) async {
        await pumpScreen(
          tester,
          const SkillProfileScreen(),
          brightness: brightness,
          overrides: [
            skillProfileProvider.overrideWith((ref) async => skillProfile()),
          ],
        );

        expect(find.text('Skill Profile'), findsOneWidget);
        expect(find.text('Serve'), findsOneWidget);
        expect(find.text('Forehand'), findsOneWidget);
      });

      testWidgets('reports a skill with no data honestly in $label',
          (tester) async {
        await pumpScreen(
          tester,
          const SkillProfileScreen(),
          brightness: brightness,
          overrides: [
            skillProfileProvider.overrideWith(
              (ref) async => SkillProfile(
                skills: const [
                  SkillScoreEntry(skill: 'SERVE', score: null, maturity: null),
                ],
                weakestSkill: null,
                recommendations: const [],
              ),
            ),
          ],
        );

        expect(find.text('No data yet'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const SkillProfileScreen(),
        settle: false,
        overrides: [
          skillProfileProvider.overrideWith((ref) => pending<SkillProfile>()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const SkillProfileScreen(),
        overrides: [
          skillProfileProvider.overrideWith((ref) => failing<SkillProfile>()),
        ],
      );

      expect(find.text('Skill profile not available.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
