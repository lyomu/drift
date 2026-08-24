import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';

class AuthTokens {
  const AuthTokens({required this.accessToken, required this.refreshToken});

  final String accessToken;
  final String refreshToken;

  factory AuthTokens.fromJson(Map<String, dynamic> json) => AuthTokens(
    accessToken: json['accessToken'] as String,
    refreshToken: json['refreshToken'] as String,
  );
}

/// Thrown with a message already safe to show inline on a form field.
class AuthException implements Exception {
  const AuthException(this.message);

  final String message;

  @override
  String toString() => message;
}

class AuthRepository {
  AuthRepository(this._dio, this._authedDio);

  final Dio _dio;

  /// Only `changePassword` needs this — it's the one `/auth/*` route behind
  /// `JwtAuthGuard`, so it must go through the token-attaching client
  /// rather than the plain one every other method here uses.
  final Dio _authedDio;

  /// Returns the created user id. In dev, the response also carries a
  /// `devVerificationCode` since no real email provider is wired up yet.
  Future<({String userId, String? devVerificationCode})> signUp({
    required String email,
    required String password,
  }) async {
    final data = await _post('/auth/signup', {
      'email': email,
      'password': password,
    });
    return (
      userId: data['userId'] as String,
      devVerificationCode: data['devVerificationCode'] as String?,
    );
  }

  Future<AuthTokens> verify({
    required String email,
    required String code,
  }) async {
    final data = await _post('/auth/verify', {'email': email, 'code': code});
    return AuthTokens.fromJson(data);
  }

  Future<String?> resendCode({required String email}) async {
    final data = await _post('/auth/resend-code', {'email': email});
    return data['devVerificationCode'] as String?;
  }

  Future<AuthTokens> login({
    required String email,
    required String password,
  }) async {
    final data = await _post('/auth/login', {
      'email': email,
      'password': password,
    });
    return AuthTokens.fromJson(data);
  }

  Future<void> logout(String refreshToken) async {
    try {
      await _dio.post('/auth/logout', data: {'refreshToken': refreshToken});
    } on DioException {
      // Best-effort — the local session is cleared regardless (see
      // AccountSecurityScreen), so a failed server-side revoke shouldn't
      // block the user from signing out.
    }
  }

  /// Non-enumerating by design — the API answers 200 whether or not the
  /// address has an account, so a null return means "no code was issued",
  /// never "no such user". The UI must not distinguish the two. In dev the
  /// code comes back in the response, same as sign-up.
  Future<String?> forgotPassword({required String email}) async {
    final data = await _post('/auth/forgot-password', {'email': email});
    return data['devVerificationCode'] as String?;
  }

  /// Answers 204 with an empty body, so this can't go through [_post] —
  /// that helper casts `response.data` to a Map and would throw on null.
  ///
  /// Every refresh token is revoked server-side and no new ones are issued,
  /// so the caller must send the user back to Login rather than trying to
  /// resume a session.
  Future<void> resetPassword({
    required String email,
    required String code,
    required String newPassword,
  }) async {
    try {
      await _dio.post(
        '/auth/reset-password',
        data: {'email': email, 'code': code, 'newPassword': newPassword},
      );
    } on DioException catch (e) {
      throw AuthException(_messageFrom(e));
    }
  }

  /// Also revokes every other refresh token server-side — the caller must
  /// still persist the returned tokens locally (this device's session
  /// continues under them).
  Future<AuthTokens> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      final response = await _authedDio.patch(
        '/auth/change-password',
        data: {'currentPassword': currentPassword, 'newPassword': newPassword},
      );
      return AuthTokens.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw AuthException(_messageFrom(e));
    }
  }

  Future<Map<String, dynamic>> _post(
    String path,
    Map<String, dynamic> body,
  ) async {
    try {
      final response = await _dio.post(path, data: body);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw AuthException(_messageFrom(e));
    }
  }

  /// Nest sends `message` as either a string or a list of validation
  /// failures; both need to land as one line of inline form error text.
  String _messageFrom(DioException e) {
    final message = e.response?.data is Map
        ? (e.response?.data['message'] as Object?)
        : null;
    final text = message is List ? message.join(' ') : message?.toString();
    return text ?? 'Something went wrong. Please try again.';
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(baseDioProvider),
    ref.watch(dioClientProvider),
  );
});
