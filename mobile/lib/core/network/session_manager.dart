import 'package:dio/dio.dart';

import '../storage/secure_storage.dart';

/// Coordinates rotating refresh tokens across all authenticated requests.
/// A failed network call never destroys a usable session.
class SessionManager {
  SessionManager(this._storage, this._refreshDio, this._onInvalidated);

  final SecureStorage _storage;
  final Dio _refreshDio;
  final void Function() _onInvalidated;
  Future<String>? _refreshInFlight;

  Future<String> refreshAfterUnauthorized(String? failedAuthorization) async {
    final currentAccess = await _storage.readAccessToken();
    if (currentAccess != null &&
        failedAuthorization != null &&
        failedAuthorization != 'Bearer $currentAccess') {
      // A concurrent request has already rotated the token.
      return currentAccess;
    }

    final active = _refreshInFlight;
    if (active != null) return active;
    final future = _rotate();
    _refreshInFlight = future;
    try {
      return await future;
    } finally {
      if (identical(_refreshInFlight, future)) _refreshInFlight = null;
    }
  }

  Future<String> _rotate() async {
    final refreshToken = await _storage.readRefreshToken();
    if (refreshToken == null) {
      await _invalidateIfCurrent(null);
      throw StateError('No refresh token is available.');
    }
    try {
      final response = await _refreshDio.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final data = response.data;
      final access = data?['accessToken'];
      final nextRefresh = data?['refreshToken'];
      if (access is! String ||
          access.isEmpty ||
          nextRefresh is! String ||
          nextRefresh.isEmpty) {
        throw const FormatException('Invalid refresh response.');
      }
      await _storage.saveTokens(accessToken: access, refreshToken: nextRefresh);
      return access;
    } on DioException catch (error) {
      if (error.response?.statusCode == 401 ||
          error.response?.statusCode == 403) {
        await _invalidateIfCurrent(refreshToken);
      }
      rethrow;
    }
  }

  Future<void> _invalidateIfCurrent(String? attemptedRefreshToken) async {
    final current = await _storage.readRefreshToken();
    if (current != attemptedRefreshToken) return;
    await _storage.clear();
    _onInvalidated();
  }
}
