import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/dio_client.dart';
import '../domain/swing_session.dart';
import '../swing_check_config.dart';
import 'native_pose_channel.dart';

/// What went wrong, so the screen can say something specific.
enum SwingCheckFailure {
  /// No network or a timeout.
  offline,

  /// The server has no coach provider configured, or it's switched off.
  coachUnavailable,

  /// Fewer than 3 measured swings: no feedback by design.
  tooFewSwings,

  /// Anything else.
  failed,
}

class SwingCheckException implements Exception {
  const SwingCheckException(this.failure, this.message);
  final SwingCheckFailure failure;
  final String message;
  @override
  String toString() => message;
}

/// Swing Check API. Sends the numbers the phone measured, never video or pose
/// landmarks.
class SwingCheckRepository {
  SwingCheckRepository(this._dio);

  final Dio _dio;

  Future<SwingSessionRecord> save(SwingSessionAnalysis analysis) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/swing-sessions',
        data: analysis.toCreateJson(
          poseModel: NativePoseChannel.poseModel,
          appVersion: kSwingCheckAppVersion,
        ),
      );
      return SwingSessionRecord.fromJson(response.data!);
    } on DioException catch (error) {
      throw _asException(error);
    }
  }

  Future<List<SwingSessionRecord>> list() async {
    try {
      final response = await _dio.get<List<dynamic>>('/swing-sessions');
      return (response.data ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(SwingSessionRecord.fromJson)
          .toList();
    } on DioException catch (error) {
      throw _asException(error);
    }
  }

  Future<SwingSessionRecord> fetch(String id) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/swing-sessions/$id');
      return SwingSessionRecord.fromJson(response.data!);
    } on DioException catch (error) {
      throw _asException(error);
    }
  }

  /// Coach feedback in the app's current language (sent as Accept-Language).
  Future<SwingSessionRecord> requestFeedback(String id) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/swing-sessions/$id/feedback',
        options: Options(receiveTimeout: const Duration(seconds: 90)),
      );
      return SwingSessionRecord.fromJson(response.data!);
    } on DioException catch (error) {
      throw _asException(error);
    }
  }

  SwingCheckException _asException(DioException error) {
    final l10n = l10nNow;
    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return SwingCheckException(SwingCheckFailure.offline, l10n.swingErrorOffline);
    }
    final data = error.response?.data;
    final code = data is Map<String, dynamic> ? data['code'] : null;
    if (code == 'COACH_UNAVAILABLE') {
      return SwingCheckException(
        SwingCheckFailure.coachUnavailable,
        l10n.swingCoachUnavailable,
      );
    }
    if (code == 'TOO_FEW_SWINGS') {
      return SwingCheckException(SwingCheckFailure.tooFewSwings, l10n.swingTooFew);
    }
    return SwingCheckException(SwingCheckFailure.failed, l10n.swingErrorGeneric);
  }
}

final swingCheckRepositoryProvider = Provider<SwingCheckRepository>((ref) {
  return SwingCheckRepository(ref.watch(dioClientProvider));
});
