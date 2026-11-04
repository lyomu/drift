import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';

/// One short, image-led tennis fact. Text arrives already in the app's
/// language (the server reads `Accept-Language`).
class TennisFact {
  const TennisFact({
    required this.id,
    required this.title,
    required this.body,
    required this.source,
    required this.imageUrl,
    required this.opened,
  });

  final String id;
  final String title;
  final String body;
  final String? source;

  /// Path relative to the API origin — resolve with `driftMediaUrl`.
  final String? imageUrl;

  /// Whether the viewer has opened today's fact yet. Drives the Home rail's
  /// "Today's fact" title and whether the fact card is shown at all.
  final bool opened;

  TennisFact copyWith({bool? opened}) => TennisFact(
    id: id,
    title: title,
    body: body,
    source: source,
    imageUrl: imageUrl,
    opened: opened ?? this.opened,
  );

  factory TennisFact.fromJson(Map<String, dynamic> json) => TennisFact(
    id: json['id'] as String,
    title: json['title'] as String,
    body: json['body'] as String,
    source: json['source'] as String?,
    imageUrl: json['imageUrl'] as String?,
    opened: json['opened'] as bool? ?? false,
  );
}

class TennisFactsRepository {
  TennisFactsRepository(this._dio);

  final Dio _dio;

  /// Today's fact, or null when no facts are published. The first call of
  /// the day also files the fact in the in-app notification list (server
  /// side, once per user per day).
  Future<TennisFact?> getToday() async {
    try {
      final response = await _dio.get('/tennis-facts/today');
      final data = response.data;
      if (data is! Map<String, dynamic> || data['fact'] == null) return null;
      return TennisFact.fromJson(data['fact'] as Map<String, dynamic>);
    } on DioException catch (e) {
      throw AuthException(_message(e));
    }
  }

  /// A specific fact — opened from its notification.
  Future<TennisFact> getById(String id) async {
    try {
      final response = await _dio.get('/tennis-facts/$id');
      return TennisFact.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw AuthException(_message(e));
    }
  }

  Future<void> markOpened(String id) async {
    try {
      await _dio.post('/tennis-facts/$id/open');
    } on DioException catch (e) {
      throw AuthException(_message(e));
    }
  }

  String _message(DioException e) {
    final body = e.response?.data;
    final message = body is Map ? body['message'] as Object? : null;
    final text = message is List ? message.join(' ') : message?.toString();
    return text ?? l10nNow.commonErrorGeneric;
  }
}

final tennisFactsRepositoryProvider = Provider<TennisFactsRepository>((ref) {
  return TennisFactsRepository(ref.watch(dioClientProvider));
});

/// Today's fact for the Home rail. A failure here must never break Home, so
/// errors resolve to null (no fact card) rather than surfacing.
final todayFactProvider = FutureProvider.autoDispose<TennisFact?>((ref) async {
  try {
    return await ref.watch(tennisFactsRepositoryProvider).getToday();
  } on AuthException {
    return null;
  }
});

/// Facts the viewer opened during this app session. Lets the Home rail drop
/// the fact card immediately on open, without waiting for a refetch.
final openedFactIdsProvider = StateProvider<Set<String>>((ref) => const {});
