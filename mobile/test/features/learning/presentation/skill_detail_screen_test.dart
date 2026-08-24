import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/learning/application/learning_providers.dart';
import 'package:drift_tennis/features/learning/data/learning_repository.dart';
import 'package:drift_tennis/features/learning/presentation/skill_detail_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('SkillDetailScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders a backed-up skill in $label', (tester) async {
        await pumpScreen(
          tester,
          const SkillDetailScreen(skill: 'SERVE'),
          brightness: brightness,
          overrides: [
            skillDetailProvider('SERVE').overrideWith(
              (ref) async => skillDetail(),
            ),
          ],
        );

        expect(find.text('Serve'), findsOneWidget);
        // 3.5 of 6, rounded — an established percentage.
        expect(find.text('58%'), findsOneWidget);
        expect(find.text('Set a Goal'), findsOneWidget);
      });

      testWidgets('explains a skill with nothing behind it in $label',
          (tester) async {
        await pumpScreen(
          tester,
          const SkillDetailScreen(skill: 'SERVE'),
          brightness: brightness,
          overrides: [
            skillDetailProvider('SERVE').overrideWith(
              (ref) async => SkillDetail(
                skill: 'SERVE',
                score: null,
                maturity: null,
                assessmentBaseline: null,
                practiceSessions: const [],
                recommendations: const [],
              ),
            ),
          ],
        );

        expect(
          find.text(
            'Not enough data yet — complete a few practice sessions or matches',
          ),
          findsOneWidget,
        );
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const SkillDetailScreen(skill: 'SERVE'),
        settle: false,
        overrides: [
          skillDetailProvider('SERVE').overrideWith(
            (ref) => pending<SkillDetail>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const SkillDetailScreen(skill: 'SERVE'),
        overrides: [
          skillDetailProvider('SERVE').overrideWith(
            (ref) => failing<SkillDetail>(),
          ),
        ],
      );

      expect(find.text('Not available.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
