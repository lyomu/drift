import 'dart:io' show Platform;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/secure_storage.dart';
import 'session_manager.dart';

/// Build-time API override, for builds that can't reach the host through
/// the usual loopback aliases — chiefly a debug APK on a physical phone,
/// which needs the dev machine's LAN address, or any release APK pointed
/// at the deployed staging API (runbook: `docs/DEPLOYMENT.md`):
///
///   flutter build apk --dart-define=DRIFT_API_BASE_URL=http://192.168.1.x:3009   # dev, real device
///   flutter build apk --release --dart-define=DRIFT_API_BASE_URL=https://api.driftsports.app
const _apiBaseUrlOverride = String.fromEnvironment('DRIFT_API_BASE_URL');

/// `10.0.2.2` is the Android emulator's alias for the host machine's
/// `localhost`; iOS simulators and desktop can reach `localhost` directly.
/// Neither works from a real device — pass [_apiBaseUrlOverride] there.
/// Public because the socket.io client ([SocketClient]) must connect to the
/// exact same origin as the REST calls — one source of truth for where the
/// API lives.
String apiBaseUrl() {
  if (_apiBaseUrlOverride.isNotEmpty) {
    return _apiBaseUrlOverride;
  }
  if (!kIsWeb && Platform.isAndroid) {
    return 'http://10.0.2.2:3009';
  }
  return 'http://localhost:3009';
}

final secureStorageProvider = Provider<SecureStorage>(
  (ref) => const SecureStorage(),
);

/// Unauthenticated Dio instance — used for endpoints that don't require a
/// token (signup/login/verify/refresh) and internally by [dioClientProvider]
/// to perform the refresh call itself without recursing through its own
/// 401 interceptor.
final baseDioProvider = Provider<Dio>((ref) {
  return Dio(BaseOptions(baseUrl: apiBaseUrl()));
});

/// Invalidated only when the server confirms that the refresh credential is
/// unusable. Root navigation and auth state watch this signal.
final sessionInvalidationProvider = StateProvider<int>((ref) => 0);

final sessionManagerProvider = Provider<SessionManager>((ref) {
  return SessionManager(
    ref.watch(secureStorageProvider),
    ref.watch(baseDioProvider),
    () => ref.read(sessionInvalidationProvider.notifier).state++,
  );
});

/// Authenticated Dio instance — attaches the stored access token to every
/// request and transparently refreshes + retries once on a 401.
final dioClientProvider = Provider<Dio>((ref) {
  final storage = ref.watch(secureStorageProvider);
  final sessions = ref.watch(sessionManagerProvider);
  final dio = Dio(BaseOptions(baseUrl: apiBaseUrl()));

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storage.readAccessToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        } else {
          options.headers.remove('Authorization');
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final isUnauthorized = error.response?.statusCode == 401;
        if (!isUnauthorized ||
            error.requestOptions.extra['authRetried'] == true) {
          handler.next(error);
          return;
        }

        String newAccessToken;
        try {
          newAccessToken = await sessions.refreshAfterUnauthorized(
            error.requestOptions.headers['Authorization'] as String?,
          );
        } on DioException catch (refreshError) {
          handler.next(refreshError);
          return;
        } catch (_) {
          handler.next(error);
          return;
        }
        try {
          final retryRequest = error.requestOptions;
          retryRequest.headers['Authorization'] = 'Bearer $newAccessToken';
          retryRequest.extra['authRetried'] = true;
          final retryResponse = await dio.fetch(retryRequest);
          handler.resolve(retryResponse);
        } on DioException catch (retryError) {
          handler.next(retryError);
        } catch (_) {
          handler.next(error);
        }
      },
    ),
  );

  return dio;
});
