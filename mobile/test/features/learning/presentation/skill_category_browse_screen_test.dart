import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/learning/application/learning_providers.dart';
import 'package:drift_tennis/features/learning/data/learning_repository.dart';
import 'package:drift_tennis/features/learning/presentation/skill_category_browse_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('SkillCategoryBrowseScreen', () {
    const params = (type: null, targetSkill: 'SERVE');

    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders matching content in $label', (tester) async {
        await pumpScreen(
          tester,
          const SkillCategoryBrowseScreen(skill: 'SERVE'),
          brightness: brightness,
          overrides: [
            contentBrowseProvider(params).overrideWith(
              (ref) async => [contentSummary()],
            ),
          ],
        );

        expect(find.text('Serve'), findsOneWidget);
        expect(find.text('Serve placement ladder'), findsOneWidget);
      });

      testWidgets('renders its empty state in $label', (tester) async {
        await pumpScreen(
          tester,
          const SkillCategoryBrowseScreen(skill: 'SERVE'),
          brightness: brightness,
          overrides: [
            contentBrowseProvider(params).overrideWith(
              (ref) async => <ContentSummary>[],
            ),
          ],
        );

        expect(find.text('No content yet for this filter'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const SkillCategoryBrowseScreen(skill: 'SERVE'),
        settle: false,
        overrides: [
          contentBrowseProvider(params).overrideWith(
            (ref) => pending<List<ContentSummary>>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const SkillCategoryBrowseScreen(skill: 'SERVE'),
        overrides: [
          contentBrowseProvider(params).overrideWith(
            (ref) => failing<List<ContentSummary>>(),
          ),
        ],
      );

      expect(find.text("Couldn't load content."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
