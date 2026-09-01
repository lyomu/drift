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
  testWidgets('first run: intro carousel → Welcome → Sign Up', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          secureStorageProvider.overrideWithValue(const _FakeSecureStorage()),
        ],
        child: const DriftTennisApp(),
      ),
    );
    await tester.pumpAndSettle();

    // No stored session → the pre-auth intro carousel.
    expect(find.text('The Game\nNever Stops'), findsOneWidget);
    expect(find.text('Get Started'), findsOneWidget);

    await tester.tap(find.text('Get Started'));
    await tester.pumpAndSettle();

    // Join the Court — the post-intro auth entry point.
    expect(find.text('Join the Court'), findsOneWidget);

    await tester.tap(find.text('Continue with Email'));
    await tester.pumpAndSettle();

    // Heading + submit button both read "Create account".
    expect(find.text('Create account'), findsWidgets);
  });
}
