import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';

/// Mirrors the backend `NotificationCategory` enum.
enum NotificationCategory {
  connections('CONNECTIONS'),
  matches('MATCHES'),
  messages('MESSAGES'),
  competitions('COMPETITIONS'),
  learning('LEARNING'),
  news('NEWS'),
  clubs('CLUBS'),

  /// Anything this build doesn't recognise. A newer backend adding a
  /// category must not break the whole Notification Centre — before this
  /// existed, `firstWhere` threw and one unknown row failed the entire
  /// page parse.
  unknown('');

  const NotificationCategory(this.wireValue);

  final String wireValue;

  static NotificationCategory fromJson(String value) =>
      NotificationCategory.values.firstWhere(
        (c) => c.wireValue == value,
        orElse: () => NotificationCategory.unknown,
      );
}

class DriftNotification {
  const DriftNotification({
    required this.id,
    required this.category,
    required this.title,
    required this.body,
    required this.relatedEntityType,
    required this.relatedEntityId,
    required this.readAt,
    required this.createdAt,
  });

  final String id;
  final NotificationCategory category;
  final String title;
  final String body;
  final String? relatedEntityType;
  final String? relatedEntityId;
  final DateTime? readAt;
  final DateTime createdAt;

  bool get isUnread => readAt == null;

  factory DriftNotification.fromJson(Map<String, dynamic> json) =>
      DriftNotification(
        id: json['id'] as String,
        category: NotificationCategory.fromJson(json['category'] as String),
        title: json['title'] as String,
        body: json['body'] as String,
        relatedEntityType: json['relatedEntityType'] as String?,
        relatedEntityId: json['relatedEntityId'] as String?,
        readAt: json['readAt'] == null
            ? null
            : DateTime.parse(json['readAt'] as String).toLocal(),
        createdAt: DateTime.parse(json['createdAt'] as String).toLocal(),
      );
}

class NotificationsPage {
  const NotificationsPage({
    required this.total,
    required this.unreadCount,
    required this.notifications,
  });

  final int total;
  final int unreadCount;
  final List<DriftNotification> notifications;

  factory NotificationsPage.fromJson(Map<String, dynamic> json) =>
      NotificationsPage(
        total: json['total'] as int,
        unreadCount: json['unreadCount'] as int,
        notifications: (json['notifications'] as List<dynamic>)
            .map((n) => DriftNotification.fromJson(n as Map<String, dynamic>))
            .toList(),
      );
}

class NotificationPreferences {
  const NotificationPreferences({
    required this.connections,
    required this.matches,
    required this.messages,
    required this.competitions,
    required this.learning,
    required this.news,
    required this.clubs,
  });

  final bool connections;
  final bool matches;
  final bool messages;
  final bool competitions;
  final bool learning;
  final bool news;
  final bool clubs;

  bool forCategory(NotificationCategory category) => switch (category) {
    NotificationCategory.connections => connections,
    NotificationCategory.matches => matches,
    NotificationCategory.messages => messages,
    NotificationCategory.competitions => competitions,
    NotificationCategory.learning => learning,
    NotificationCategory.news => news,
    NotificationCategory.clubs => clubs,
    // Not a real preference — nothing renders a toggle for it.
    NotificationCategory.unknown => true,
  };

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) =>
      NotificationPreferences(
        connections: json['connections'] as bool,
        matches: json['matches'] as bool,
        messages: json['messages'] as bool,
        competitions: json['competitions'] as bool,
        learning: json['learning'] as bool,
        news: json['news'] as bool,
        // Tolerates a backend that predates the CLUBS category.
        clubs: json['clubs'] as bool? ?? true,
      );
}

class NotificationsRepository {
  NotificationsRepository(this._dio);

  final Dio _dio;

  Future<NotificationsPage> list() async {
    final data = await _get('/notifications');
    return NotificationsPage.fromJson(data);
  }

  Future<void> markRead(String id) =>
      _send(() => _dio.patch('/notifications/$id/read'));

  Future<void> markAllRead() =>
      _send(() => _dio.patch('/notifications/read-all'));

  /// Claims this installation's FCM token for the signed-in user. Idempotent:
  /// called on every launch and on token refresh.
  Future<void> registerDevice({
    required String token,
    required String platform,
  }) => _send(
    () => _dio.post(
      '/notifications/devices',
      data: {'token': token, 'platform': platform},
    ),
  );

  /// Called on logout. The token goes in the body, not the path, because a URL
  /// would land in the server's access log.
  Future<void> removeDevice({
    required String token,
    required String platform,
  }) => _send(
    () => _dio.delete(
      '/notifications/devices',
      data: {'token': token, 'platform': platform},
    ),
  );

  Future<NotificationPreferences> getPreferences() async {
    final data = await _get('/notifications/preferences');
    return NotificationPreferences.fromJson(data);
  }

  Future<NotificationPreferences> updatePreferences(
    Map<NotificationCategory, bool> changes,
  ) async {
    final data = await _patch('/notifications/preferences', {
      for (final entry in changes.entries) _fieldName(entry.key): entry.value,
    });
    return NotificationPreferences.fromJson(data);
  }

  String _fieldName(NotificationCategory category) => switch (category) {
    NotificationCategory.connections => 'connections',
    NotificationCategory.matches => 'matches',
    NotificationCategory.messages => 'messages',
    NotificationCategory.competitions => 'competitions',
    NotificationCategory.learning => 'learning',
    NotificationCategory.news => 'news',
    NotificationCategory.clubs => 'clubs',
    NotificationCategory.unknown => 'unknown',
  };

  Future<Map<String, dynamic>> _get(String path) async {
    try {
      final response = await _dio.get(path);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw _toAuthException(e);
    }
  }

  Future<Map<String, dynamic>> _patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    try {
      final response = await _dio.patch(path, data: body);
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

final notificationsRepositoryProvider = Provider<NotificationsRepository>((
  ref,
) {
  return NotificationsRepository(ref.watch(dioClientProvider));
});
