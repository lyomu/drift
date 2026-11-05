import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/news/application/news_providers.dart';
import 'package:drift_tennis/features/news/data/news_repository.dart';
import 'package:drift_tennis/features/news/presentation/news_article_reader.dart';
import 'package:drift_tennis/features/news/presentation/news_story_detail_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('NewsStoryDetailScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders a compact in-app reader in $label', (tester) async {
        final fake = _FakeReaderController();
        await pumpScreen(
          tester,
          NewsStoryDetailScreen(
            storyId: 'n1',
            readerControllerFactory: _factoryFor(fake),
          ),
          brightness: brightness,
          overrides: [
            storyDetailProvider(
              'n1',
            ).overrideWith((ref) => Future.value(storyDetail())),
          ],
        );

        expect(find.byKey(const Key('fake-reader')), findsOneWidget);
        final headline = tester.widget<Text>(
          find.text('A big win at Richmond'),
        );
        expect(headline.maxLines, 2);
        expect(headline.style?.fontSize, 18);
        expect(headline.style?.fontWeight, FontWeight.w700);
        final bookmark = tester.widget<Icon>(
          find.byIcon(Icons.bookmark_border),
        );
        expect(bookmark.size, 18);
      });
    }

    testWidgets('shows reader progress, failure, and retry', (tester) async {
      final fake = _FakeReaderController();
      late ValueChanged<int> progressCallback;
      late ValueChanged<String> pageErrorCallback;
      await pumpScreen(
        tester,
        NewsStoryDetailScreen(
          storyId: 'n1',
          readerControllerFactory:
              ({
                required initialUri,
                required onProgress,
                required onPageStarted,
                required onPageFinished,
                required onPageError,
                required onBlockedNavigation,
              }) {
                progressCallback = onProgress;
                pageErrorCallback = onPageError;
                Future<void>.microtask(onPageFinished);
                return fake;
              },
        ),
        overrides: [
          storyDetailProvider(
            'n1',
          ).overrideWith((ref) => Future.value(storyDetail())),
        ],
      );

      progressCallback(42);
      await tester.pump();
      final progress = tester.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator),
      );
      expect(progress.value, .42);

      pageErrorCallback('offline');
      await tester.pump();
      expect(find.text('Could not load this article'), findsOneWidget);
      await tester.tap(find.text('Try again'));
      await tester.pump();
      expect(fake.reloadCalls, 1);
    });

    testWidgets('uses WebView history before leaving the reader', (
      tester,
    ) async {
      final fake = _FakeReaderController()..canGoBackValue = true;
      await pumpScreen(
        tester,
        NewsStoryDetailScreen(
          storyId: 'n1',
          readerControllerFactory: _factoryFor(fake),
        ),
        overrides: [
          storyDetailProvider(
            'n1',
          ).overrideWith((ref) => Future.value(storyDetail())),
        ],
      );

      await tester.tap(find.byIcon(Icons.chevron_left));
      await tester.pump();
      expect(fake.goBackCalls, 1);
    });

    testWidgets('rejects an unsafe original URL before creating a reader', (
      tester,
    ) async {
      var factoryCalls = 0;
      await pumpScreen(
        tester,
        NewsStoryDetailScreen(
          storyId: 'n1',
          readerControllerFactory:
              ({
                required initialUri,
                required onProgress,
                required onPageStarted,
                required onPageFinished,
                required onPageError,
                required onBlockedNavigation,
              }) {
                factoryCalls++;
                return _FakeReaderController();
              },
        ),
        overrides: [
          storyDetailProvider('n1').overrideWith(
            (ref) => Future.value(
              storyDetail(originalUrl: 'http://publisher.example/story'),
            ),
          ),
        ],
      );

      expect(find.text('Source link unavailable'), findsOneWidget);
      expect(factoryCalls, 0);
    });

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const NewsStoryDetailScreen(storyId: 'n1'),
        settle: false,
        overrides: [
          storyDetailProvider(
            'n1',
          ).overrideWith((ref) => pending<StoryDetail>()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an API error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const NewsStoryDetailScreen(storyId: 'n1'),
        overrides: [
          storyDetailProvider(
            'n1',
          ).overrideWith((ref) => failing<StoryDetail>()),
        ],
      );

      expect(find.text('Story not available.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });

  group('isSafeArticleUri', () {
    test('allows only host-based HTTPS URLs without user info', () {
      expect(isSafeArticleUri(Uri.parse('https://example.test/story')), isTrue);
      expect(isSafeArticleUri(Uri.parse('http://example.test/story')), isFalse);
      expect(isSafeArticleUri(Uri.parse('https://user@example.test')), isFalse);
      expect(isSafeArticleUri(Uri.parse('mailto:hello@example.test')), isFalse);
    });
  });
}

ArticleReaderControllerFactory _factoryFor(_FakeReaderController fake) =>
    ({
      required initialUri,
      required onProgress,
      required onPageStarted,
      required onPageFinished,
      required onPageError,
      required onBlockedNavigation,
    }) {
      Future<void>.microtask(onPageFinished);
      return fake;
    };

class _FakeReaderController implements ArticleReaderController {
  bool canGoBackValue = false;
  int goBackCalls = 0;
  int reloadCalls = 0;

  @override
  Widget buildView() =>
      const ColoredBox(key: Key('fake-reader'), color: Colors.white);

  @override
  Future<bool> canGoBack() async => canGoBackValue;

  @override
  Future<void> goBack() async {
    goBackCalls++;
  }

  @override
  Future<void> reload() async {
    reloadCalls++;
  }
}
