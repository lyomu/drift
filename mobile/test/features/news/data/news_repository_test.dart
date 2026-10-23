import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:drift_tennis/core/storage/secure_storage.dart';
import 'package:drift_tennis/features/news/data/news_repository.dart';

class _TokenStorage extends SecureStorage {
  const _TokenStorage();

  @override
  Future<String?> readAccessToken() async =>
      'header.${base64Url.encode(utf8.encode(jsonEncode({'sub': 'player-1'})))}.sig';
}

Map<String, dynamic> _story(String id) => {
  'id': id,
  'headline': 'Tennis news $id',
  'publisher': 'Licensed publisher',
  'imageUrl': null,
  'highlight': 'A short preview.',
  'publicationDate': '2026-10-22T10:00:00.000Z',
  'categories': ['LATEST'],
  'topics': <String>[],
  'savedByViewer': false,
};

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('sends the cursor and does not replace the cached first page', () async {
    final requests = <Map<String, dynamic>>[];
    final dio = Dio();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          requests.add(options.queryParameters);
          handler.resolve(
            Response(
              requestOptions: options,
              data: {
                'stories': [
                  _story(
                    options.queryParameters['cursor'] == null
                        ? 'first'
                        : 'second',
                  ),
                ],
                'nextCursor': options.queryParameters['cursor'] == null
                    ? 'cursor-2'
                    : null,
              },
            ),
          );
        },
      ),
    );
    final repository = NewsRepository(dio, const _TokenStorage());

    final first = await repository.browsePage(category: 'LATEST');
    final second = await repository.browsePage(
      category: 'LATEST',
      cursor: first.nextCursor,
    );

    expect(first.stories.single.id, 'first');
    expect(second.stories.single.id, 'second');
    expect(requests.last['cursor'], 'cursor-2');
    final prefs = await SharedPreferences.getInstance();
    final cached =
        jsonDecode(prefs.getString('drift.news.player-1.LATEST')!)
            as Map<String, dynamic>;
    expect((cached['stories'] as List).single['id'], 'first');
  });

  test('reads administrator-managed category labels from the API', () async {
    final dio = Dio();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          expect(options.path, '/news/categories');
          handler.resolve(
            Response(
              requestOptions: options,
              data: {
                'categories': [
                  {'slug': 'JUNIORS', 'label': 'Junior Tennis'},
                ],
              },
            ),
          );
        },
      ),
    );
    final categories = await NewsRepository(
      dio,
      const _TokenStorage(),
    ).listCategories();
    expect(categories.single.slug, 'JUNIORS');
    expect(categories.single.label, 'Junior Tennis');
  });

  test('uses a recent first page while offline', () async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      'drift.news.player-1.all',
      jsonEncode({
        'stories': [_story('cached')],
        'cachedAt': DateTime.now().toUtc().toIso8601String(),
      }),
    );
    final dio = Dio();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.reject(
            DioException(
              requestOptions: options,
              type: DioExceptionType.connectionError,
            ),
          );
        },
      ),
    );

    final page = await NewsRepository(dio, const _TokenStorage()).browsePage();
    expect(page.fromCache, isTrue);
    expect(page.nextCursor, isNull);
    expect(page.stories.single.id, 'cached');
  });

  test('does not show a stale offline page', () async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      'drift.news.player-1.all',
      jsonEncode({
        'stories': [_story('stale')],
        'cachedAt': DateTime.now()
            .subtract(const Duration(days: 2))
            .toUtc()
            .toIso8601String(),
      }),
    );
    final dio = Dio();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          handler.reject(
            DioException(
              requestOptions: options,
              type: DioExceptionType.connectionError,
            ),
          );
        },
      ),
    );

    await expectLater(
      NewsRepository(dio, const _TokenStorage()).browsePage(),
      throwsException,
    );
    expect(prefs.getString('drift.news.player-1.all'), isNull);
  });
}
