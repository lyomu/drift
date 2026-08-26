import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';
import '../../players/data/players_repository.dart';

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
  });

  final String id;
  final String type;
  final String? matchId;
  final int unreadCount;
  final ChatMessage? lastMessage;
  final List<PlayerSummary> participants;
  final DateTime? lastMessageAt;

  String get title => participants.isEmpty
      ? 'Conversation'
      : participants.map((p) => p.displayName).join(', ');

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
  );
}

class MessagingRepository {
  MessagingRepository(this._dio);

  final Dio _dio;

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
      throw AuthException(text ?? 'Something went wrong. Please try again.');
    }
  }
}

final messagingRepositoryProvider = Provider<MessagingRepository>((ref) {
  return MessagingRepository(ref.watch(dioClientProvider));
});
