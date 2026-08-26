import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';

enum GlobalSearchFilter {
  all('ALL', 'All'),
  player('PLAYER', 'Players'),
  court('COURT', 'Courts'),
  club('CLUB', 'Clubs'),
  competition('COMPETITION', 'Competitions');

  const GlobalSearchFilter(this.wireValue, this.label);

  final String wireValue;
  final String label;
}

class GlobalSearchResult {
  const GlobalSearchResult({
    required this.id,
    required this.type,
    required this.title,
    required this.subtitle,
    required this.route,
  });

  final String id;
  final String type;
  final String title;
  final String? subtitle;
  final String route;

  factory GlobalSearchResult.fromJson(Map<String, dynamic> json) =>
      GlobalSearchResult(
        id: json['id'] as String,
        type: json['type'] as String,
        title: json['title'] as String,
        subtitle: json['subtitle'] as String?,
        route: json['route'] as String,
      );
}

class GlobalSearchRepository {
  GlobalSearchRepository(this._dio);

  final Dio _dio;

  Future<List<GlobalSearchResult>> search({
    required String query,
    required GlobalSearchFilter filter,
  }) async {
    try {
      final response = await _dio.get(
        '/search',
        queryParameters: {
          'query': query,
          if (filter != GlobalSearchFilter.all) 'type': filter.wireValue,
        },
      );
      final data = response.data as Map<String, dynamic>;
      return (data['results'] as List<dynamic>)
          .map((r) => GlobalSearchResult.fromJson(r as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      final body = e.response?.data;
      final message = body is Map ? body['message'] as Object? : null;
      final text = message is List ? message.join(' ') : message?.toString();
      throw AuthException(text ?? 'Search could not be loaded.');
    }
  }
}

final globalSearchRepositoryProvider = Provider<GlobalSearchRepository>((ref) {
  return GlobalSearchRepository(ref.watch(dioClientProvider));
});
