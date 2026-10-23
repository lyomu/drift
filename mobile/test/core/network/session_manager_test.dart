import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift_tennis/core/network/dio_client.dart';
import 'package:drift_tennis/core/network/session_manager.dart';
import 'package:drift_tennis/core/storage/secure_storage.dart';

class MemoryStorage extends SecureStorage {
  String? access = 'expired-access';
  String? refresh = 'valid-refresh';

  @override
  Future<String?> readAccessToken() async => access;
  @override
  Future<String?> readRefreshToken() async => refresh;
  @override
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    access = accessToken;
    refresh = refreshToken;
  }

  @override
  Future<void> clear() async {
    access = null;
    refresh = null;
  }
}

class ScriptedAdapter implements HttpClientAdapter {
  ScriptedAdapter(this.respond);
  final Future<ResponseBody> Function(RequestOptions) respond;
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) => respond(options);
  @override
  void close({bool force = false}) {}
}

void main() {
  test(
    'concurrent expired requests share one refresh and retain the new tokens',
    () async {
      final storage = MemoryStorage();
      final gate = Completer<void>();
      var calls = 0;
      var invalidations = 0;
      final dio = Dio();
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) async {
            calls++;
            await gate.future;
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {
                  'accessToken': 'new-access',
                  'refreshToken': 'new-refresh',
                },
              ),
            );
          },
        ),
      );
      final manager = SessionManager(storage, dio, () => invalidations++);
      final first = manager.refreshAfterUnauthorized('Bearer expired-access');
      final second = manager.refreshAfterUnauthorized('Bearer expired-access');
      await Future<void>.delayed(Duration.zero);
      gate.complete();
      expect(await Future.wait([first, second]), ['new-access', 'new-access']);
      expect(calls, 1);
      expect(storage.refresh, 'new-refresh');
      expect(invalidations, 0);
      expect(
        await manager.refreshAfterUnauthorized('Bearer expired-access'),
        'new-access',
      );
      expect(calls, 1);
    },
  );

  test(
    'temporary refresh failure keeps credentials for a later retry',
    () async {
      final storage = MemoryStorage();
      var invalidations = 0;
      final dio = Dio();
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            handler.reject(
              DioException(
                requestOptions: options,
                response: Response(requestOptions: options, statusCode: 503),
                type: DioExceptionType.badResponse,
              ),
            );
          },
        ),
      );
      final manager = SessionManager(storage, dio, () => invalidations++);
      await expectLater(
        manager.refreshAfterUnauthorized('Bearer expired-access'),
        throwsA(isA<DioException>()),
      );
      expect(storage.access, 'expired-access');
      expect(storage.refresh, 'valid-refresh');
      expect(invalidations, 0);
    },
  );

  test(
    'confirmed invalid refresh clears credentials and signals sign-in',
    () async {
      final storage = MemoryStorage();
      var invalidations = 0;
      final dio = Dio();
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            handler.reject(
              DioException(
                requestOptions: options,
                response: Response(requestOptions: options, statusCode: 401),
                type: DioExceptionType.badResponse,
              ),
            );
          },
        ),
      );
      final manager = SessionManager(storage, dio, () => invalidations++);
      await expectLater(
        manager.refreshAfterUnauthorized('Bearer expired-access'),
        throwsA(isA<DioException>()),
      );
      expect(storage.access, isNull);
      expect(storage.refresh, isNull);
      expect(invalidations, 1);
    },
  );

  test('authenticated Dio retries concurrent 401s with one rotation', () async {
    final storage = MemoryStorage();
    var refreshCalls = 0;
    final refreshDio = Dio();
    refreshDio.httpClientAdapter = ScriptedAdapter((options) async {
      refreshCalls++;
      return ResponseBody.fromString(
        jsonEncode({
          'accessToken': 'new-access',
          'refreshToken': 'new-refresh',
        }),
        200,
        headers: {
          Headers.contentTypeHeader: ['application/json'],
        },
      );
    });
    final container = ProviderContainer(
      overrides: [
        secureStorageProvider.overrideWithValue(storage),
        baseDioProvider.overrideWithValue(refreshDio),
      ],
    );
    addTearDown(container.dispose);
    final dio = container.read(dioClientProvider);
    dio.httpClientAdapter = ScriptedAdapter((options) async {
      if (options.headers['Authorization'] == 'Bearer expired-access') {
        return ResponseBody.fromString('', 401);
      }
      return ResponseBody.fromString(
        jsonEncode({'ok': true}),
        200,
        headers: {
          Headers.contentTypeHeader: ['application/json'],
        },
      );
    });
    final responses = await Future.wait([
      dio.get('/players'),
      dio.get('/challenges'),
    ]);
    expect(responses.map((response) => response.statusCode), [200, 200]);
    expect(refreshCalls, 1);
    expect(storage.refresh, 'new-refresh');
  });
}
