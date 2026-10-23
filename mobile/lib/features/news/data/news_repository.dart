import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage.dart';
import '../../auth/data/auth_repository.dart';

class StorySummary {
  const StorySummary({
    required this.id,
    required this.headline,
    required this.publisher,
    required this.imageUrl,
    required this.highlight,
    required this.publicationDate,
    required this.categories,
    required this.topics,
    required this.savedByViewer,
  });

  final String id;
  final String headline;
  final String publisher;
  final String? imageUrl;
  final String highlight;
  final DateTime publicationDate;
  final List<String> categories;
  final List<String> topics;
  final bool savedByViewer;

  factory StorySummary.fromJson(Map<String, dynamic> json) => StorySummary(
    id: json['id'] as String,
    headline: json['headline'] as String,
    publisher: json['publisher'] as String,
    imageUrl: json['imageUrl'] as String?,
    highlight: json['highlight'] as String,
    publicationDate: DateTime.parse(
      json['publicationDate'] as String,
    ).toLocal(),
    categories: (json['categories'] as List<dynamic>).cast<String>(),
    topics: (json['topics'] as List<dynamic>).cast<String>(),
    savedByViewer: json['savedByViewer'] as bool,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'headline': headline,
    'publisher': publisher,
    'imageUrl': imageUrl,
    'highlight': highlight,
    'publicationDate': publicationDate.toUtc().toIso8601String(),
    'categories': categories,
    'topics': topics,
    'savedByViewer': savedByViewer,
  };
}

class NewsPage {
  const NewsPage({
    required this.stories,
    required this.nextCursor,
    required this.cachedAt,
    this.fromCache = false,
  });
  final List<StorySummary> stories;
  final String? nextCursor;
  final DateTime cachedAt;
  final bool fromCache;
}

class NewsCategoryOption {
  const NewsCategoryOption({required this.slug, required this.label});
  final String slug;
  final String label;

  factory NewsCategoryOption.fromJson(Map<String, dynamic> json) =>
      NewsCategoryOption(
        slug: json['slug'] as String,
        label: json['label'] as String,
      );
}

class StoryDetail {
  const StoryDetail({required this.summary, required this.originalUrl});

  final StorySummary summary;
  final String originalUrl;

  factory StoryDetail.fromJson(Map<String, dynamic> json) => StoryDetail(
    summary: StorySummary.fromJson(json),
    originalUrl: json['originalUrl'] as String,
  );
}

class NewsRepository {
  NewsRepository(this._dio, this._storage);

  static const _offlineCacheLifetime = Duration(hours: 24);

  final Dio _dio;
  final SecureStorage _storage;

  Future<List<StorySummary>> browse({String? category}) async =>
      (await browsePage(category: category)).stories;

  Future<List<NewsCategoryOption>> listCategories() async {
    final data = await _get('/news/categories');
    return (data['categories'] as List<dynamic>)
        .map(
          (item) => NewsCategoryOption.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  Future<NewsPage> browsePage({String? category, String? cursor}) async {
    final key = cursor == null ? await _cacheKey(category) : null;
    try {
      final response = await _dio.get(
        '/news',
        queryParameters: {
          'take': 20,
          if (category != null) 'category': category,
          if (cursor != null) 'cursor': cursor,
        },
      );
      final data = response.data as Map<String, dynamic>;
      final stories = (data['stories'] as List<dynamic>)
          .map((s) => StorySummary.fromJson(s as Map<String, dynamic>))
          .toList();
      final page = NewsPage(
        stories: stories,
        nextCursor: data['nextCursor'] as String?,
        cachedAt: DateTime.now(),
      );
      if (key != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(
          key,
          jsonEncode({
            'stories': stories.map((s) => s.toJson()).toList(),
            'cachedAt': page.cachedAt.toUtc().toIso8601String(),
          }),
        );
      }
      return page;
    } on DioException catch (e) {
      if (key != null &&
          (e.response == null || (e.response!.statusCode ?? 0) >= 500)) {
        final prefs = await SharedPreferences.getInstance();
        final raw = prefs.getString(key);
        if (raw != null) {
          try {
            final data = jsonDecode(raw) as Map<String, dynamic>;
            final cachedAt = DateTime.parse(data['cachedAt'] as String);
            if (DateTime.now().difference(cachedAt) > _offlineCacheLifetime) {
              await prefs.remove(key);
            } else {
              return NewsPage(
                stories: (data['stories'] as List<dynamic>)
                    .map(
                      (s) => StorySummary.fromJson(s as Map<String, dynamic>),
                    )
                    .toList(),
                nextCursor: null,
                cachedAt: cachedAt,
                fromCache: true,
              );
            }
          } catch (_) {
            await prefs.remove(key);
          }
        }
      }
      throw _toAuthException(e);
    }
  }

  Future<String?> _cacheKey(String? category) async {
    final token = await _storage.readAccessToken();
    if (token == null) return null;
    try {
      final payload =
          jsonDecode(
                utf8.decode(
                  base64Url.decode(base64Url.normalize(token.split('.')[1])),
                ),
              )
              as Map<String, dynamic>;
      final userId = payload['sub'] as String?;
      if (userId == null || userId.isEmpty) return null;
      return 'drift.news.$userId.${category ?? 'all'}';
    } catch (_) {
      return null;
    }
  }

  Future<StoryDetail> getStory(String id) async {
    final data = await _get('/news/$id');
    return StoryDetail.fromJson(data);
  }

  Future<List<StorySummary>> listSaved() async {
    final data = await _get('/news/saved');
    return (data['stories'] as List<dynamic>)
        .map((s) => StorySummary.fromJson(s as Map<String, dynamic>))
        .toList();
  }

  Future<void> save(String id) => _send(() => _dio.post('/news/$id/save'));

  Future<void> unsave(String id) => _send(() => _dio.delete('/news/$id/save'));

  Future<Map<String, dynamic>> _get(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: query);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw _toAuthException(e);
    }
  }

  Future<void> _send(Future<Response<dynamic>> Function() call) async {
    try {
      await call();
    } on DioException catch (e) {
      throw _toAuthException(e);
    }
  }

  AuthException _toAuthException(DioException e) {
    final body = e.response?.data;
    final message = body is Map ? body['message'] as Object? : null;
    final text = message is List ? message.join(' ') : message?.toString();
    return AuthException(text ?? 'Something went wrong. Please try again.');
  }
}

final newsRepositoryProvider = Provider<NewsRepository>((ref) {
  return NewsRepository(
    ref.watch(dioClientProvider),
    ref.watch(secureStorageProvider),
  );
});
