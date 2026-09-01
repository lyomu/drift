import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/auth/data/auth_repository.dart';
import 'package:drift_tennis/features/connections/data/connections_repository.dart';
import 'package:drift_tennis/features/home/data/home_repository.dart';
import 'package:drift_tennis/features/messaging/data/messaging_repository.dart';
import 'package:drift_tennis/features/news/data/news_repository.dart';
import 'package:drift_tennis/features/safety/data/safety_repository.dart';

/// The one-or-two-mapper repositories, grouped rather than spread across
/// seven near-empty files.

Map<String, dynamic> _player(String id) => {
  'id': id,
  'firstName': 'Ana',
  'lastName': 'Diaz',
  'photoUrl': null,
  'level': 4.0,
  'levelLabel': '4.0',
  'generalLocation': null,
  'distanceBand': null,
  'preferredClubName': null,
  'formatPreference': null,
  'stylePreference': null,
  'availabilitySummary': null,
};

void main() {
  group('AuthTokens.fromJson', () {
    test('maps both tokens', () {
      final t = AuthTokens.fromJson({
        'accessToken': 'access',
        'refreshToken': 'refresh',
      });

      expect(t.accessToken, 'access');
      expect(t.refreshToken, 'refresh');
    });
  });

  group('HomeCard.fromJson', () {
    test('maps a priority-ranked card', () {
      final c = HomeCard.fromJson({
        'id': 'card-1',
        'type': 'UNCONFIRMED_RESULT',
        'priority': 10,
        'title': 'Confirm a result',
        'body': 'Ana submitted a score.',
      });

      expect(c.type, 'UNCONFIRMED_RESULT');
      expect(c.priority, 10);
      expect(c.title, 'Confirm a result');
    });
  });

  group('StorySummary / StoryDetail', () {
    Map<String, dynamic> json({
      Object? imageUrl = 'https://img',
      bool saved = false,
    }) => {
      'id': 'n1',
      'headline': 'A big win',
      'publisher': 'Drift Wire',
      'imageUrl': imageUrl,
      'highlight': 'A short highlight.',
      'publicationDate': '2026-08-23T08:00:00.000Z',
      'categories': <dynamic>['LATEST', 'PLAYERS'],
      'topics': <dynamic>['tennis'],
      'savedByViewer': saved,
      'originalUrl': 'https://example.test/story',
    };

    test('maps a story summary', () {
      final s = StorySummary.fromJson(json(saved: true));

      expect(s.headline, 'A big win');
      expect(s.publisher, 'Drift Wire');
      expect(s.categories, ['LATEST', 'PLAYERS']);
      expect(s.savedByViewer, isTrue);
      expect(s.publicationDate.isUtc, isFalse);
    });

    // Image rights vary by publisher — Doc 3 §11.5 permits metadata-only
    // stories, so a story with no image is ordinary.
    test('tolerates a story with no image', () {
      expect(StorySummary.fromJson(json(imageUrl: null)).imageUrl, isNull);
    });

    test('detail carries the publisher link alongside the summary', () {
      final d = StoryDetail.fromJson(json());

      expect(d.summary.headline, 'A big win');
      expect(d.originalUrl, 'https://example.test/story');
    });
  });

  group('ChatMessage.fromJson', () {
    Map<String, dynamic> json({
      Object? senderId = 'u1',
      String kind = 'TEXT',
      Object? systemEvent,
      Object? relatedMatchId,
    }) => {
      'id': 'm1',
      'conversationId': 'c1',
      'senderId': senderId,
      'kind': kind,
      'body': 'Hello',
      'systemEvent': systemEvent,
      'relatedMatchId': relatedMatchId,
      'createdAt': '2026-08-23T10:00:00.000Z',
    };

    test('maps a player message', () {
      final m = ChatMessage.fromJson(json());

      expect(m.senderId, 'u1');
      expect(m.kind, 'TEXT');
      expect(m.systemEvent, isNull);
      expect(m.createdAt.isUtc, isFalse);
    });

    // System messages are events, not speech — they have no author, which
    // is what the chat thread keys off to centre and de-attribute them.
    test('maps a system message with no sender', () {
      final m = ChatMessage.fromJson(
        json(
          senderId: null,
          kind: 'SYSTEM',
          systemEvent: 'result_submitted',
          relatedMatchId: 'match-1',
        ),
      );

      expect(m.senderId, isNull);
      expect(m.systemEvent, 'result_submitted');
      expect(m.relatedMatchId, 'match-1');
    });
  });

  group('Conversation.fromJson', () {
    Map<String, dynamic> json({
      Object? lastMessage,
      Object? unreadCount = 3,
      Object? lastMessageAt = '2026-08-23T10:00:00.000Z',
    }) => {
      'id': 'c1',
      'type': 'MATCH',
      'matchId': 'match-1',
      'unreadCount': unreadCount,
      'lastMessage': lastMessage,
      'participants': <dynamic>[_player('u1'), _player('u2')],
      'lastMessageAt': lastMessageAt,
    };

    test('maps a conversation and its participants', () {
      final c = Conversation.fromJson(json());

      expect(c.id, 'c1');
      expect(c.matchId, 'match-1');
      expect(c.unreadCount, 3);
      expect(c.participants, hasLength(2));
    });

    // A thread opens empty when a match is created — "Say hello" state.
    test('tolerates a conversation with nothing said yet', () {
      final c = Conversation.fromJson(
        json(lastMessage: null, lastMessageAt: null),
      );

      expect(c.lastMessage, isNull);
      expect(c.lastMessageAt, isNull);
    });

    test('defaults unreadCount to zero when the API omits it', () {
      expect(Conversation.fromJson(json(unreadCount: null)).unreadCount, 0);
    });
  });

  group('ConnectionEntry.fromJson', () {
    test('maps an accepted connection', () {
      final c = ConnectionEntry.fromJson({
        'connectionId': 'conn-1',
        'player': _player('u2'),
        'connectedAt': '2026-08-23T10:00:00.000Z',
        'requestedAt': '2026-08-22T10:00:00.000Z',
      });

      expect(c.connectionId, 'conn-1');
      expect(c.player.id, 'u2');
      expect(c.connectedAt, isNotNull);
    });

    // A pending request has been made but not accepted, so connectedAt is
    // absent — `tryParse` on a missing key must yield null, not throw.
    test('maps a pending request with no accepted date', () {
      final c = ConnectionEntry.fromJson({
        'connectionId': 'conn-1',
        'player': _player('u2'),
        'connectedAt': null,
        'requestedAt': '2026-08-22T10:00:00.000Z',
      });

      expect(c.connectedAt, isNull);
      expect(c.requestedAt, isNotNull);
    });
  });

  group('ReportReason', () {
    test('every reason has a distinct wire value and label', () {
      final wires = ReportReason.values.map((r) => r.wireValue).toList();
      final labels = ReportReason.values.map((r) => r.label).toList();

      expect(wires.toSet(), hasLength(wires.length));
      expect(labels.toSet(), hasLength(labels.length));
    });

    test('wire values are the backend SCREAMING_SNAKE form', () {
      expect(ReportReason.fakeProfile.wireValue, 'FAKE_PROFILE');
      expect(
        ReportReason.inappropriateContent.wireValue,
        'INAPPROPRIATE_CONTENT',
      );
    });
  });

  group('BlockedPlayer.fromJson', () {
    test('maps the blocked player and when', () {
      final b = BlockedPlayer.fromJson({
        'blockedAt': '2026-08-23T10:00:00.000Z',
        'player': _player('u2'),
      });

      expect(b.player.id, 'u2');
      expect(b.blockedAt.isUtc, isFalse);
    });
  });
}
