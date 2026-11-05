import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';
import '../../../core/l10n/l10n.dart';

enum GlobalSearchFilter {
  all('ALL'),
  player('PLAYER'),
  court('COURT'),
  club('CLUB'),
  competition('COMPETITION');

  const GlobalSearchFilter(this.wireValue);

  final String wireValue;

  String get label => switch (this) {
    GlobalSearchFilter.all => l10nNow.searchAll,
    GlobalSearchFilter.player => l10nNow.matchPlayers,
    GlobalSearchFilter.court => l10nNow.discoverCourts,
    GlobalSearchFilter.club => l10nNow.discoverClubs,
    GlobalSearchFilter.competition => l10nNow.searchCompetitions,
  };
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
      throw AuthException(text ?? l10nNow.searchLoadFailed);
    }
  }
}

final globalSearchRepositoryProvider = Provider<GlobalSearchRepository>((ref) {
  return GlobalSearchRepository(ref.watch(dioClientProvider));
});
