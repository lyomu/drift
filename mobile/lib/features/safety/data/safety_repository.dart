import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';
import '../../players/data/players_repository.dart';

/// Mirrors the backend `ReportReason` enum.
enum ReportReason {
  harassment('HARASSMENT', 'Harassment or abuse'),
  spam('SPAM', 'Spam'),
  fakeProfile('FAKE_PROFILE', 'Fake profile'),
  inappropriateContent('INAPPROPRIATE_CONTENT', 'Inappropriate content'),
  cheating('CHEATING', 'Cheating'),
  other('OTHER', 'Something else');

  const ReportReason(this.wireValue, this.label);

  final String wireValue;
  final String label;
}

class BlockedPlayer {
  const BlockedPlayer({required this.blockedAt, required this.player});

  final DateTime blockedAt;
  final PlayerSummary player;

  factory BlockedPlayer.fromJson(Map<String, dynamic> json) => BlockedPlayer(
    blockedAt: DateTime.parse(json['blockedAt'] as String).toLocal(),
    player: PlayerSummary.fromJson(json['player'] as Map<String, dynamic>),
  );
}

class SafetyRepository {
  SafetyRepository(this._dio);

  final Dio _dio;

  Future<void> block(String blockedId) =>
      _send(() => _dio.post('/safety/blocks', data: {'blockedId': blockedId}));

  Future<void> unblock(String blockedId) =>
      _send(() => _dio.delete('/safety/blocks/$blockedId'));

  Future<List<BlockedPlayer>> listBlocks() async {
    final data = await _get('/safety/blocks');
    return (data['blocks'] as List<dynamic>)
        .map((b) => BlockedPlayer.fromJson(b as Map<String, dynamic>))
        .toList();
  }

  Future<void> report({
    required String reportedUserId,
    required ReportReason reason,
    String? notes,
  }) => _send(
    () => _dio.post(
      '/safety/reports',
      data: {
        'reportedUserId': reportedUserId,
        'reason': reason.wireValue,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
    ),
  );

  Future<void> reportMessage({
    required String messageId,
    required ReportReason reason,
    String? notes,
  }) => _send(
    () => _dio.post(
      '/safety/message-reports',
      data: {
        'messageId': messageId,
        'reason': reason.wireValue,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
    ),
  );

  Future<Map<String, dynamic>> _get(String path) async {
    try {
      final response = await _dio.get(path);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      final body = e.response?.data;
      final message = body is Map ? body['message'] as Object? : null;
      final text = message is List ? message.join(' ') : message?.toString();
      throw AuthException(text ?? 'Something went wrong. Please try again.');
    }
  }

  Future<void> _send(Future<Response<dynamic>> Function() call) async {
    try {
      await call();
    } on DioException catch (e) {
      final body = e.response?.data;
      final message = body is Map ? body['message'] as Object? : null;
      final text = message is List ? message.join(' ') : message?.toString();
      throw AuthException(text ?? 'Something went wrong. Please try again.');
    }
  }
}

final safetyRepositoryProvider = Provider<SafetyRepository>((ref) {
  return SafetyRepository(ref.watch(dioClientProvider));
});
