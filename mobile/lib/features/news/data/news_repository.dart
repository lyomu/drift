import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
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
  NewsRepository(this._dio);

  final Dio _dio;

  Future<List<StorySummary>> browse({String? category}) async {
    final data = await _get(
      '/news',
      query: category != null ? {'category': category} : null,
    );
    return (data['stories'] as List<dynamic>)
        .map((s) => StorySummary.fromJson(s as Map<String, dynamic>))
        .toList();
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
  return NewsRepository(ref.watch(dioClientProvider));
});
