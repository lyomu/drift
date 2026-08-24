import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/news/application/news_providers.dart';
import 'package:drift_tennis/features/news/data/news_repository.dart';
import 'package:drift_tennis/features/news/presentation/news_story_detail_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('NewsStoryDetailScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the story in $label', (tester) async {
        await pumpScreen(
          tester,
          const NewsStoryDetailScreen(storyId: 'n1'),
          brightness: brightness,
          overrides: [
            storyDetailProvider('n1').overrideWith(
              (ref) => Future.value(storyDetail()),
            ),
          ],
        );

        expect(find.text('Story'), findsOneWidget);
        expect(find.text('A big win at Richmond'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const NewsStoryDetailScreen(storyId: 'n1'),
        settle: false,
        overrides: [
          storyDetailProvider('n1').overrideWith(
            (ref) => pending<StoryDetail>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const NewsStoryDetailScreen(storyId: 'n1'),
        overrides: [
          storyDetailProvider('n1').overrideWith(
            (ref) => failing<StoryDetail>(),
          ),
        ],
      );

      expect(find.text('Story not available.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
