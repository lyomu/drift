import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:drift_tennis/features/news/application/news_providers.dart';
import 'package:drift_tennis/features/news/data/news_repository.dart';
import 'package:drift_tennis/features/news/presentation/news_feed_screen.dart';
import 'package:drift_tennis/shared/widgets/drift_scaffold.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('NewsFeedScreen', () {
    testWidgets('keeps the story readable at large system text size', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await pumpScreen(
        tester,
        const NewsFeedScreen(),
        textScaler: const TextScaler.linear(2),
        overrides: [
          newsCategoriesProvider.overrideWith(
            (ref) => Future.value(const [
              NewsCategoryOption(slug: 'LATEST', label: 'Latest'),
            ]),
          ),
          newsPageProvider.overrideWith(
            (ref) => Future.value(
              NewsPage(
                stories: [storySummary()],
                nextCursor: null,
                cachedAt: DateTime(2026),
              ),
            ),
          ),
        ],
      );
      expect(find.text('A big win at Richmond'), findsOneWidget);
    });
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders stories in $label', (tester) async {
        await pumpScreen(
          tester,
          const NewsFeedScreen(),
          brightness: brightness,
          overrides: [
            newsCategoriesProvider.overrideWith(
              (ref) => Future.value(const [
                NewsCategoryOption(slug: 'LATEST', label: 'Latest'),
              ]),
            ),
            newsPageProvider.overrideWith(
              (ref) => Future.value(
                NewsPage(
                  stories: [storySummary()],
                  nextCursor: null,
                  cachedAt: DateTime(2026),
                ),
              ),
            ),
          ],
        );

        expect(find.text('News'), findsOneWidget);
        expect(find.text('A big win at Richmond'), findsOneWidget);
        expect(find.byType(DriftScaffold), findsOneWidget);
        expect(find.byTooltip('Saved stories'), findsOneWidget);
        expect(find.text('Home'), findsNothing);
      });

      testWidgets("explains an empty category in $label", (tester) async {
        await pumpScreen(
          tester,
          const NewsFeedScreen(),
          brightness: brightness,
          overrides: [
            newsCategoriesProvider.overrideWith(
              (ref) => Future.value(const [
                NewsCategoryOption(slug: 'LATEST', label: 'Latest'),
              ]),
            ),
            newsPageProvider.overrideWith(
              (ref) => Future.value(
                NewsPage(
                  stories: <StorySummary>[],
                  nextCursor: null,
                  cachedAt: DateTime(2026),
                ),
              ),
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
          newsCategoriesProvider.overrideWith(
            (ref) => Future.value(const [
              NewsCategoryOption(slug: 'LATEST', label: 'Latest'),
            ]),
          ),
          newsPageProvider.overrideWith((ref) => pending<NewsPage>()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('opens Saved stories from the shared header', (tester) async {
      await pumpRouted(
        tester,
        const NewsFeedScreen(),
        extraRoutes: [
          GoRoute(
            path: '/news/saved',
            builder: (context, state) =>
                const Scaffold(body: Text('Saved destination')),
          ),
        ],
        overrides: [
          newsCategoriesProvider.overrideWith(
            (ref) async => const [
              NewsCategoryOption(slug: 'LATEST', label: 'Latest'),
            ],
          ),
          newsPageProvider.overrideWith(
            (ref) async => NewsPage(
              stories: [storySummary()],
              nextCursor: null,
              cachedAt: DateTime(2026),
            ),
          ),
        ],
      );

      await tester.tap(find.byTooltip('Saved stories'));
      await tester.pumpAndSettle();
      expect(find.text('Saved destination'), findsOneWidget);
    });

    testWidgets('uses categories supplied by the backend', (tester) async {
      await pumpScreen(
        tester,
        const NewsFeedScreen(),
        overrides: [
          newsCategoriesProvider.overrideWith(
            (ref) => Future.value(const [
              NewsCategoryOption(slug: 'LATEST', label: 'Latest'),
              NewsCategoryOption(slug: 'JUNIORS', label: 'Junior Tennis'),
            ]),
          ),
          newsPageProvider.overrideWith(
            (ref) => Future.value(
              NewsPage(
                stories: [storySummary()],
                nextCursor: null,
                cachedAt: DateTime(2026),
              ),
            ),
          ),
        ],
      );
      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();
      expect(find.text('Junior Tennis'), findsOneWidget);
    });

    testWidgets('offers a retry after an error', (tester) async {
      await pumpScreen(
        tester,
        const NewsFeedScreen(),
        overrides: [
          newsCategoriesProvider.overrideWith(
            (ref) => Future.value(const [
              NewsCategoryOption(slug: 'LATEST', label: 'Latest'),
            ]),
          ),
          newsPageProvider.overrideWith((ref) => failing<NewsPage>()),
        ],
      );

      expect(find.text("Couldn't load news. Pull to retry."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
