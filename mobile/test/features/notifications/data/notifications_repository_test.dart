import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/notifications/data/notifications_repository.dart';

void main() {
  group('NotificationCategory.fromJson', () {
    test('maps every wire value the backend can send', () {
      expect(
        NotificationCategory.fromJson('CONNECTIONS'),
        NotificationCategory.connections,
      );
      expect(
        NotificationCategory.fromJson('MATCHES'),
        NotificationCategory.matches,
      );
      expect(
        NotificationCategory.fromJson('MESSAGES'),
        NotificationCategory.messages,
      );
      expect(
        NotificationCategory.fromJson('COMPETITIONS'),
        NotificationCategory.competitions,
      );
      expect(
        NotificationCategory.fromJson('LEARNING'),
        NotificationCategory.learning,
      );
      expect(NotificationCategory.fromJson('NEWS'), NotificationCategory.news);
      expect(
        NotificationCategory.fromJson('CLUBS'),
        NotificationCategory.clubs,
      );
    });

    // Regression: CLUBS was added backend-side in Wave 2 while this enum
    // still had six values, and `firstWhere` had no orElse. One club
    // notification threw StateError and failed the whole page parse,
    // breaking the entire Notification Centre.
    test('falls back to unknown instead of throwing on a new category', () {
      expect(
        NotificationCategory.fromJson('SOMETHING_NEW'),
        NotificationCategory.unknown,
      );
    });
  });

  group('DriftNotification.fromJson', () {
    Map<String, dynamic> json({
      String category = 'MATCHES',
      String? readAt,
      String? entityType = 'MATCH',
      String? entityId = 'm1',
    }) => {
      'id': 'n1',
      'category': category,
      'title': 'A player challenged you',
      'body': 'Review the challenge.',
      'relatedEntityType': entityType,
      'relatedEntityId': entityId,
      'readAt': readAt,
      'createdAt': '2026-08-23T10:00:00.000Z',
    };

    test('maps every field', () {
      final n = DriftNotification.fromJson(json());

      expect(n.id, 'n1');
      expect(n.category, NotificationCategory.matches);
      expect(n.title, 'A player challenged you');
      expect(n.body, 'Review the challenge.');
      expect(n.relatedEntityType, 'MATCH');
      expect(n.relatedEntityId, 'm1');
      expect(n.createdAt.isUtc, isFalse, reason: 'converted to local');
    });

    test('treats a null readAt as unread', () {
      expect(DriftNotification.fromJson(json()).isUnread, isTrue);
    });

    test('treats a present readAt as read', () {
      final n = DriftNotification.fromJson(
        json(readAt: '2026-08-23T11:00:00.000Z'),
      );
      expect(n.isUnread, isFalse);
      expect(n.readAt, isNotNull);
    });

    test('tolerates a notification with no deep-link target', () {
      final n = DriftNotification.fromJson(
        json(entityType: null, entityId: null),
      );
      expect(n.relatedEntityType, isNull);
      expect(n.relatedEntityId, isNull);
    });

    test('parses a CLUBS notification end to end', () {
      final n = DriftNotification.fromJson(
        json(
          category: 'CLUBS',
          entityType: 'CLUB_ANNOUNCEMENT',
          entityId: 'c1',
        ),
      );
      expect(n.category, NotificationCategory.clubs);
      expect(n.relatedEntityType, 'CLUB_ANNOUNCEMENT');
    });
  });

  group('NotificationsPage.fromJson', () {
    test('maps counts and rows', () {
      final page = NotificationsPage.fromJson({
        'total': 2,
        'unreadCount': 1,
        'notifications': [
          {
            'id': 'n1',
            'category': 'CLUBS',
            'title': 'Court closed',
            'body': 'Court 3 is shut.',
            'relatedEntityType': 'CLUB_ANNOUNCEMENT',
            'relatedEntityId': 'c1',
            'readAt': null,
            'createdAt': '2026-08-23T10:00:00.000Z',
          },
        ],
      });

      expect(page.total, 2);
      expect(page.unreadCount, 1);
      expect(page.notifications, hasLength(1));
    });

    test('handles an empty page', () {
      final page = NotificationsPage.fromJson({
        'total': 0,
        'unreadCount': 0,
        'notifications': <dynamic>[],
      });
      expect(page.notifications, isEmpty);
    });
  });

  group('NotificationPreferences', () {
    Map<String, dynamic> prefsJson({bool? clubs}) => {
      'connections': true,
      'matches': true,
      'messages': false,
      'competitions': true,
      'learning': true,
      'news': false,
      if (clubs != null) 'clubs': clubs,
    };

    test('maps every toggle', () {
      final p = NotificationPreferences.fromJson(prefsJson(clubs: true));

      expect(p.connections, isTrue);
      expect(p.messages, isFalse);
      expect(p.news, isFalse);
      expect(p.clubs, isTrue);
    });

    test('defaults clubs on when the backend predates the category', () {
      expect(NotificationPreferences.fromJson(prefsJson()).clubs, isTrue);
    });

    test('forCategory resolves every real category', () {
      final p = NotificationPreferences.fromJson(prefsJson(clubs: false));

      expect(p.forCategory(NotificationCategory.connections), isTrue);
      expect(p.forCategory(NotificationCategory.messages), isFalse);
      expect(p.forCategory(NotificationCategory.clubs), isFalse);
    });
  });
}
