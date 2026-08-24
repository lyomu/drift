import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/core/network/dio_client.dart';
import 'package:drift_tennis/core/storage/secure_storage.dart';
import 'package:drift_tennis/main.dart';

/// Avoids the `flutter_secure_storage` platform channel, which isn't
/// available in widget tests — always reports "no session".
class _FakeSecureStorage extends SecureStorage {
  const _FakeSecureStorage();

  @override
  Future<String?> readAccessToken() async => null;

  @override
  Future<String?> readRefreshToken() async => null;
}

void main() {
  testWidgets('Splash routes to Welcome, and Get Started opens Sign Up', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [secureStorageProvider.overrideWithValue(const _FakeSecureStorage())],
        child: const DriftTennisApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Find your next match.'), findsOneWidget);
    expect(find.text('Get Started'), findsOneWidget);

    await tester.tap(find.text('Get Started'));
    await tester.pumpAndSettle();

    expect(find.widgetWithText(AppBar, 'Create Account'), findsOneWidget);
  });
}
