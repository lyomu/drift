import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:drift_tennis/core/network/dio_client.dart';
import 'package:drift_tennis/core/storage/secure_storage.dart';
import 'package:drift_tennis/features/auth/data/auth_repository.dart';
import 'package:drift_tennis/features/notifications/data/push_service.dart';
import 'package:drift_tennis/features/settings/presentation/account_security_screen.dart';

import '../../../support/mocks.dart';
import '../../../support/pump.dart';

/// Logging out must drop this device's push token, and must do it while the
/// session still exists.
///
/// Get this wrong and the next person to sign in on the handset receives the
/// previous account's notifications on their lock screen — a privacy failure
/// that no one would notice in testing, because it needs two accounts and one
/// device to reproduce.
void main() {
  /// Records the order of the calls that matter, so the test can assert
  /// deregistration happened *before* the tokens were thrown away.
  late List<String> calls;

  setUp(() => calls = []);

  testWidgets('deregisters the device before clearing the session', (
    tester,
  ) async {
    final push = MockPushService();
    final auth = MockAuthRepository();

    when(() => push.unregister()).thenAnswer((_) async {
      calls.add('unregister');
    });
    when(() => auth.logout(any())).thenAnswer((_) async {
      calls.add('logout');
    });

    await pumpRouted(
      tester,
      const AccountSecurityScreen(),
      overrides: [
        secureStorageProvider.overrideWithValue(
          _RecordingSecureStorage(onClear: () => calls.add('clear')),
        ),
        authRepositoryProvider.overrideWithValue(auth),
        pushServiceProvider.overrideWithValue(push),
      ],
      extraRoutes: [
        GoRoute(path: '/welcome', builder: (_, _) => const SizedBox()),
      ],
    );

    await tester.tap(find.text('Log out'));
    await tester.pumpAndSettle();

    expect(calls, ['unregister', 'logout', 'clear']);
  });

  testWidgets('still signs out when deregistration fails', (tester) async {
    final push = MockPushService();
    final auth = MockAuthRepository();

    // A Firebase or network failure must never trap someone in a session
    // they asked to leave.
    when(() => push.unregister()).thenThrow(Exception('network down'));
    when(() => auth.logout(any())).thenAnswer((_) async {});

    await pumpRouted(
      tester,
      const AccountSecurityScreen(),
      overrides: [
        secureStorageProvider.overrideWithValue(
          _RecordingSecureStorage(onClear: () => calls.add('clear')),
        ),
        authRepositoryProvider.overrideWithValue(auth),
        pushServiceProvider.overrideWithValue(push),
      ],
      extraRoutes: [
        GoRoute(path: '/welcome', builder: (_, _) => const SizedBox()),
      ],
    );

    await tester.tap(find.text('Log out'));
    await tester.pumpAndSettle();

    expect(calls, contains('clear'));
  });
}

class _RecordingSecureStorage extends SecureStorage {
  const _RecordingSecureStorage({required this.onClear});

  final void Function() onClear;

  @override
  Future<String?> readAccessToken() async => 'access-token';

  @override
  Future<String?> readRefreshToken() async => 'refresh-token';

  @override
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {}

  @override
  Future<void> clear() async => onClear();
}
