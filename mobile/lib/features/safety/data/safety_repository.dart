import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';
import '../../players/data/players_repository.dart';
import '../../../core/l10n/l10n.dart';

/// Mirrors the backend `ReportReason` enum.
enum ReportReason {
  harassment('HARASSMENT'),
  spam('SPAM'),
  fakeProfile('FAKE_PROFILE'),
  inappropriateContent('INAPPROPRIATE_CONTENT'),
  cheating('CHEATING'),
  other('OTHER');

  const ReportReason(this.wireValue);

  final String wireValue;

  String get label => switch (this) {
    ReportReason.harassment => l10nNow.reasonHarassment,
    ReportReason.spam => l10nNow.reasonSpam,
    ReportReason.fakeProfile => l10nNow.reasonFakeProfile,
    ReportReason.inappropriateContent => l10nNow.reportInappropriate,
    ReportReason.cheating => l10nNow.reasonCheating,
    ReportReason.other => l10nNow.reasonOther,
  };
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
      throw AuthException(text ?? l10nNow.commonErrorGeneric);
    }
  }

  Future<void> _send(Future<Response<dynamic>> Function() call) async {
    try {
      await call();
    } on DioException catch (e) {
      final body = e.response?.data;
      final message = body is Map ? body['message'] as Object? : null;
      final text = message is List ? message.join(' ') : message?.toString();
      throw AuthException(text ?? l10nNow.commonErrorGeneric);
    }
  }
}

final safetyRepositoryProvider = Provider<SafetyRepository>((ref) {
  return SafetyRepository(ref.watch(dioClientProvider));
});
