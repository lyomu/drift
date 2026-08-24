import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/news/application/news_providers.dart';
import 'package:drift_tennis/features/news/data/news_repository.dart';
import 'package:drift_tennis/features/news/presentation/saved_stories_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('SavedStoriesScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders saved stories in $label', (tester) async {
        await pumpScreen(
          tester,
          const SavedStoriesScreen(),
          brightness: brightness,
          overrides: [
            savedStoriesProvider.overrideWith(
              (ref) => Future.value([storySummary(saved: true)]),
            ),
          ],
        );

        expect(find.text('Saved Stories'), findsOneWidget);
        expect(find.text('A big win at Richmond'), findsOneWidget);
      });

      testWidgets('renders its empty state in $label', (tester) async {
        await pumpScreen(
          tester,
          const SavedStoriesScreen(),
          brightness: brightness,
          overrides: [
            savedStoriesProvider.overrideWith(
              (ref) => Future.value(<StorySummary>[]),
            ),
          ],
        );

        expect(find.text('Save stories to read later'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const SavedStoriesScreen(),
        settle: false,
        overrides: [
          savedStoriesProvider.overrideWith(
            (ref) => pending<List<StorySummary>>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const SavedStoriesScreen(),
        overrides: [
          savedStoriesProvider.overrideWith(
            (ref) => failing<List<StorySummary>>(),
          ),
        ],
      );

      expect(find.text("Couldn't load saved stories."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
