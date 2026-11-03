import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';
import '../../players/data/players_repository.dart';
import '../../../core/l10n/l10n.dart';

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.kind,
    required this.body,
    required this.systemEvent,
    required this.relatedMatchId,
    required this.relatedLeagueId,
    required this.relatedLeagueName,
    required this.createdAt,
    this.senderName,
    this.senderPhotoUrl,
  });

  final String id;
  final String conversationId;

  /// Null for system messages — they have no author.
  final String? senderId;
  final String kind;
  final String body;
  final String? systemEvent;
  final String? relatedMatchId;
  final String? relatedLeagueId;
  final String? relatedLeagueName;
  final DateTime createdAt;

  /// Who wrote it, as the server resolved it. Group (community) chats need
  /// this: the sender isn't in a two-person participant list there.
  final String? senderName;
  final String? senderPhotoUrl;

  bool get isSystem => kind == 'SYSTEM';

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
    id: json['id'] as String,
    conversationId: json['conversationId'] as String,
    senderId: json['senderId'] as String?,
    kind: json['kind'] as String,
    body: json['body'] as String,
    systemEvent: json['systemEvent'] as String?,
    relatedMatchId: json['relatedMatchId'] as String?,
    relatedLeagueId: json['relatedLeagueId'] as String?,
    relatedLeagueName: json['relatedLeagueName'] as String?,
    createdAt: DateTime.parse(json['createdAt'] as String).toLocal(),
    senderName:
        (json['sender'] as Map<String, dynamic>?)?['displayName'] as String?,
    senderPhotoUrl:
        (json['sender'] as Map<String, dynamic>?)?['photoUrl'] as String?,
  );
}

/// The community a COMMUNITY conversation belongs to. Its participant list
/// comes back empty (it can be hundreds of people), so the community names
/// the thread instead.
class ConversationCommunity {
  const ConversationCommunity({
    required this.id,
    required this.name,
    this.photoUrl,
    required this.status,
  });

  final String id;
  final String name;
  final String? photoUrl;
  final String status;

  /// A suspended community's chat is read-only.
  bool get isReadOnly => status != 'APPROVED';

  factory ConversationCommunity.fromJson(Map<String, dynamic> json) =>
      ConversationCommunity(
        id: json['id'] as String,
        name: json['name'] as String,
        photoUrl: json['photoUrl'] as String?,
        status: json['status'] as String? ?? 'APPROVED',
      );
}

class Conversation {
  const Conversation({
    required this.id,
    required this.type,
    required this.matchId,
    required this.unreadCount,
    required this.lastMessage,
    required this.participants,
    required this.lastMessageAt,
    this.community,
  });

  final String id;
  final String type;
  final String? matchId;
  final int unreadCount;
  final ChatMessage? lastMessage;
  final List<PlayerSummary> participants;
  final DateTime? lastMessageAt;
  final ConversationCommunity? community;

  bool get isCommunity => type == 'COMMUNITY';

  String get title =>
      community?.name ??
      (participants.isEmpty
          ? l10nNow.messagingConversation
          : participants.map((p) => p.displayName).join(', '));

  factory Conversation.fromJson(Map<String, dynamic> json) => Conversation(
    id: json['id'] as String,
    type: json['type'] as String,
    matchId: json['matchId'] as String?,
    unreadCount: json['unreadCount'] as int? ?? 0,
    lastMessage: json['lastMessage'] == null
        ? null
        : ChatMessage.fromJson(json['lastMessage'] as Map<String, dynamic>),
    participants: (json['participants'] as List<dynamic>)
        .map((p) => PlayerSummary.fromJson(p as Map<String, dynamic>))
        .toList(),
    lastMessageAt: json['lastMessageAt'] == null
        ? null
        : DateTime.parse(json['lastMessageAt'] as String).toLocal(),
    community: json['community'] == null
        ? null
        : ConversationCommunity.fromJson(
            json['community'] as Map<String, dynamic>,
          ),
  );
}

class MessagingRepository {
  MessagingRepository(this._dio);

  final Dio _dio;

  /// The thread with another player: the match thread when a challenge is
  /// open, otherwise the direct thread for connected players. Returns its id.
  Future<String> openWith(String userId) async {
    final data = await _send(() => _dio.post('/conversations/with/$userId'));
    return data['id'] as String;
  }

  Future<List<Conversation>> listConversations() async {
    final data = await _send(() => _dio.get('/conversations'));
    return (data['conversations'] as List<dynamic>)
        .map((c) => Conversation.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  Future<List<ChatMessage>> getMessages(String conversationId) async {
    final data = await _send(
      () => _dio.get('/conversations/$conversationId/messages'),
    );
    return (data['messages'] as List<dynamic>)
        .map((m) => ChatMessage.fromJson(m as Map<String, dynamic>))
        .toList();
  }

  Future<ChatMessage> send(String conversationId, String body) async {
    final data = await _send(
      () => _dio.post(
        '/conversations/$conversationId/messages',
        data: {'body': body},
      ),
    );
    return ChatMessage.fromJson(data);
  }

  Future<void> markRead(String conversationId) =>
      _send(() => _dio.patch('/conversations/$conversationId/read'));

  Future<Map<String, dynamic>> _send(
    Future<Response<dynamic>> Function() call,
  ) async {
    try {
      final response = await call();
      final data = response.data;
      return data is Map<String, dynamic> ? data : <String, dynamic>{};
    } on DioException catch (e) {
      final body = e.response?.data;
      final message = body is Map ? body['message'] as Object? : null;
      final text = message is List ? message.join(' ') : message?.toString();
      throw AuthException(text ?? l10nNow.commonErrorGeneric);
    }
  }
}

final messagingRepositoryProvider = Provider<MessagingRepository>((ref) {
  return MessagingRepository(ref.watch(dioClientProvider));
});
