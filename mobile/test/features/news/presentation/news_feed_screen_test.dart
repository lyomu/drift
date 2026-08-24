import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/news/application/news_providers.dart';
import 'package:drift_tennis/features/news/data/news_repository.dart';
import 'package:drift_tennis/features/news/presentation/news_feed_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('NewsFeedScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders stories in $label', (tester) async {
        await pumpScreen(
          tester,
          const NewsFeedScreen(),
          brightness: brightness,
          overrides: [
            newsFeedProvider.overrideWith(
              (ref) => Future.value([storySummary()]),
            ),
          ],
        );

        expect(find.text('News'), findsOneWidget);
        expect(find.text('A big win at Richmond'), findsOneWidget);
      });

      testWidgets("explains an empty category in $label", (tester) async {
        await pumpScreen(
          tester,
          const NewsFeedScreen(),
          brightness: brightness,
          overrides: [
            newsFeedProvider.overrideWith(
              (ref) => Future.value(<StorySummary>[]),
            ),
          ],
        );

        expect(find.text('No stories in this category yet'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const NewsFeedScreen(),
        settle: false,
        overrides: [
          newsFeedProvider.overrideWith((ref) => pending<List<StorySummary>>()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('offers a retry after an error', (tester) async {
      await pumpScreen(
        tester,
        const NewsFeedScreen(),
        overrides: [
          newsFeedProvider.overrideWith((ref) => failing<List<StorySummary>>()),
        ],
      );

      expect(find.text("Couldn't load news."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
