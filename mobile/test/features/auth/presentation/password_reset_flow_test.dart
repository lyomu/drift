import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:drift_tennis/core/network/dio_client.dart';
import 'package:drift_tennis/features/auth/data/auth_repository.dart';
import 'package:drift_tennis/features/auth/presentation/forgot_password_screen.dart';
import 'package:drift_tennis/features/auth/presentation/reset_password_screen.dart';

import '../../../support/mocks.dart';
import '../../../support/pump.dart';

/// Password reset shipped in Wave 1.1 and has never been run on a device.
/// These are the first thing to actually drive it.
void main() {
  late MockAuthRepository auth;

  setUp(() {
    auth = MockAuthRepository();
  });

  List<Override> overrides() => [
    secureStorageProvider.overrideWithValue(const FakeSecureStorage()),
    authRepositoryProvider.overrideWithValue(auth),
  ];

  group('ForgotPasswordScreen', () {
    testWidgets('renders the form', (tester) async {
      await pumpScreen(
        tester,
        const ForgotPasswordScreen(),
        overrides: overrides(),
      );

      expect(find.text('Forgot Password'), findsOneWidget);
      expect(find.text('Send Code'), findsOneWidget);
      expect(find.text('Back to Log In'), findsOneWidget);
    });

    testWidgets('requests a code for the address entered', (tester) async {
      when(
        () => auth.forgotPassword(email: any(named: 'email')),
      ).thenAnswer((_) async => '123456');

      await pumpRouted(
        tester,
        const ForgotPasswordScreen(),
        overrides: overrides(),
        extraRoutes: [
          GoRoute(
            path: '/reset-password',
            builder: (_, _) => const Scaffold(body: Text('reset screen')),
          ),
        ],
      );

      await tester.enterText(find.byType(TextField), 'player@test.com');
      await tester.tap(find.text('Send Code'));
      await tester.pumpAndSettle();

      verify(() => auth.forgotPassword(email: 'player@test.com')).called(1);
    });

    testWidgets('continues to Reset Password after requesting', (tester) async {
      when(
        () => auth.forgotPassword(email: any(named: 'email')),
      ).thenAnswer((_) async => '123456');

      await pumpRouted(
        tester,
        const ForgotPasswordScreen(),
        overrides: overrides(),
        extraRoutes: [
          GoRoute(
            path: '/reset-password',
            builder: (_, _) => const Scaffold(body: Text('reset screen')),
          ),
        ],
      );

      await tester.enterText(find.byType(TextField), 'player@test.com');
      await tester.tap(find.text('Send Code'));
      await tester.pumpAndSettle();

      expect(find.text('reset screen'), findsOneWidget);
    });

    // The endpoint is deliberately non-enumerating — an address with no
    // account answers 200 exactly like one that has. The UI must not leak
    // the difference by behaving differently.
    testWidgets('moves on identically when no code was issued', (tester) async {
      when(
        () => auth.forgotPassword(email: any(named: 'email')),
      ).thenAnswer((_) async => null);

      await pumpRouted(
        tester,
        const ForgotPasswordScreen(),
        overrides: overrides(),
        extraRoutes: [
          GoRoute(
            path: '/reset-password',
            builder: (_, _) => const Scaffold(body: Text('reset screen')),
          ),
        ],
      );

      await tester.enterText(find.byType(TextField), 'nobody@test.com');
      await tester.tap(find.text('Send Code'));
      await tester.pumpAndSettle();

      expect(find.text('reset screen'), findsOneWidget);
    });

    testWidgets('shows a malformed-address error inline', (tester) async {
      when(
        () => auth.forgotPassword(email: any(named: 'email')),
      ).thenThrow(const AuthException('email must be an email'));

      await pumpScreen(
        tester,
        const ForgotPasswordScreen(),
        overrides: overrides(),
      );

      await tester.enterText(find.byType(TextField), 'not-an-email');
      await tester.tap(find.text('Send Code'));
      await tester.pumpAndSettle();

      expect(find.text('email must be an email'), findsOneWidget);
    });
  });

  group('ResetPasswordScreen', () {
    const email = 'player@test.com';

    Future<void> pumpReset(WidgetTester tester) => pumpRouted(
      tester,
      const ResetPasswordScreen(email: email),
      overrides: overrides(),
      extraRoutes: [
        GoRoute(
          path: '/login',
          builder: (_, _) => const Scaffold(body: Text('login screen')),
        ),
      ],
    );

    testWidgets('names the address the code went to', (tester) async {
      await pumpReset(tester);

      expect(find.textContaining(email), findsOneWidget);
      expect(find.text('Set New Password'), findsOneWidget);
    });

    testWidgets('starts the resend button on cooldown', (tester) async {
      await pumpReset(tester);

      // A code was just sent on the way in, so resend opens cold.
      expect(find.textContaining('Resend code in'), findsOneWidget);
    });

    testWidgets('refuses mismatched passwords without calling the API', (
      tester,
    ) async {
      await pumpReset(tester);

      final fields = find.byType(TextField);
      await tester.enterText(fields.at(0), '123456');
      await tester.enterText(fields.at(1), 'new-password-1');
      await tester.enterText(fields.at(2), 'different-password');
      await tester.tap(find.text('Set New Password'));
      await tester.pumpAndSettle();

      expect(find.text('Those passwords don’t match.'), findsOneWidget);
      verifyNever(
        () => auth.resetPassword(
          email: any(named: 'email'),
          code: any(named: 'code'),
          newPassword: any(named: 'newPassword'),
        ),
      );
    });

    testWidgets('submits the code and the new password', (tester) async {
      when(
        () => auth.resetPassword(
          email: any(named: 'email'),
          code: any(named: 'code'),
          newPassword: any(named: 'newPassword'),
        ),
      ).thenAnswer((_) async {});

      await pumpReset(tester);

      final fields = find.byType(TextField);
      await tester.enterText(fields.at(0), '123456');
      await tester.enterText(fields.at(1), 'new-password-1');
      await tester.enterText(fields.at(2), 'new-password-1');
      await tester.tap(find.text('Set New Password'));
      await tester.pumpAndSettle();

      verify(
        () => auth.resetPassword(
          email: email,
          code: '123456',
          newPassword: 'new-password-1',
        ),
      ).called(1);
    });

    // No tokens come back from reset — Doc 4 §A.1 sends the user to Login
    // to sign in with the password they just set.
    testWidgets('lands on Login after a successful reset', (tester) async {
      when(
        () => auth.resetPassword(
          email: any(named: 'email'),
          code: any(named: 'code'),
          newPassword: any(named: 'newPassword'),
        ),
      ).thenAnswer((_) async {});

      await pumpReset(tester);

      final fields = find.byType(TextField);
      await tester.enterText(fields.at(0), '123456');
      await tester.enterText(fields.at(1), 'new-password-1');
      await tester.enterText(fields.at(2), 'new-password-1');
      await tester.tap(find.text('Set New Password'));
      await tester.pumpAndSettle();

      expect(find.text('login screen'), findsOneWidget);
    });

    testWidgets('shows a bad-code error inline and stays put', (tester) async {
      when(
        () => auth.resetPassword(
          email: any(named: 'email'),
          code: any(named: 'code'),
          newPassword: any(named: 'newPassword'),
        ),
      ).thenThrow(const AuthException('Invalid or expired code.'));

      await pumpReset(tester);

      final fields = find.byType(TextField);
      await tester.enterText(fields.at(0), '999999');
      await tester.enterText(fields.at(1), 'new-password-1');
      await tester.enterText(fields.at(2), 'new-password-1');
      await tester.tap(find.text('Set New Password'));
      await tester.pumpAndSettle();

      expect(find.text('Invalid or expired code.'), findsOneWidget);
      expect(find.text('login screen'), findsNothing);
    });
  });
}
