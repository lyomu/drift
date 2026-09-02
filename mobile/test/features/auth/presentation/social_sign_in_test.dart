import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:drift_tennis/core/network/dio_client.dart';
import 'package:drift_tennis/core/onboarding/onboarding_step.dart';
import 'package:drift_tennis/features/auth/data/auth_repository.dart';
import 'package:drift_tennis/features/auth/data/social_auth_service.dart';
import 'package:drift_tennis/features/auth/presentation/widgets/social_auth_buttons.dart';
import 'package:drift_tennis/features/users/data/users_repository.dart';

import '../../../support/mocks.dart';
import '../../../support/pump.dart';

/// Covers the flow behind the Google/Apple buttons — chiefly the account
/// linking path, which is the part a person can actually get stuck in and the
/// part no device test would reach without two colliding accounts.
void main() {
  late MockAuthRepository auth;
  late MockUsersRepository users;
  late MockSocialAuthService social;

  const googleCredential = SocialCredential(
    provider: SocialProvider.google,
    idToken: 'stub-id-token',
    nonce: 'stub-nonce',
    email: 'ada@test.com',
  );

  const tokens = AuthTokens(
    accessToken: 'access',
    refreshToken: 'refresh',
  );

  const freshUser = UserProfile(
    id: 'user-1',
    email: 'ada@test.com',
    firstName: null,
    lastName: null,
    photoUrl: null,
    bio: null,
    onboardingStep: OnboardingStep.basicProfile,
  );

  setUpAll(() {
    registerFallbackValue(googleCredential);
  });

  setUp(() {
    auth = MockAuthRepository();
    users = MockUsersRepository();
    social = MockSocialAuthService();

    when(() => social.google()).thenAnswer((_) async => googleCredential);
    when(() => users.getMe()).thenAnswer((_) async => freshUser);
  });

  List<Override> overrides() => [
    secureStorageProvider.overrideWithValue(const FakeSecureStorage()),
    authRepositoryProvider.overrideWithValue(auth),
    usersRepositoryProvider.overrideWithValue(users),
    socialAuthServiceProvider.overrideWithValue(social),
  ];

  /// The buttons navigate on success, so they need a real router.
  Future<void> pumpButtons(WidgetTester tester) {
    return pumpRouted(
      tester,
      const Scaffold(body: SocialAuthButtons()),
      overrides: overrides(),
      extraRoutes: [
        GoRoute(
          path: '/onboarding/basic-profile',
          builder: (_, _) => const Scaffold(body: Text('Basic Profile')),
        ),
      ],
    );
  }

  testWidgets('signs in and routes to wherever onboarding resumes', (
    tester,
  ) async {
    when(
      () => auth.oauthGoogle(
        idToken: any(named: 'idToken'),
        nonce: any(named: 'nonce'),
      ),
    ).thenAnswer((_) async => tokens);

    await pumpButtons(tester);
    await tester.tap(find.text('Continue with Google'));
    await tester.pumpAndSettle();

    // A fresh social user has no tennis profile, so landing anywhere but
    // onboarding would be a dead end.
    expect(find.text('Basic Profile'), findsOneWidget);
  });

  testWidgets('says nothing at all when the person backs out', (tester) async {
    when(() => social.google()).thenThrow(const SocialSignInCancelled());

    await pumpButtons(tester);
    await tester.tap(find.text('Continue with Google'));
    await tester.pumpAndSettle();

    // Reporting a failure after a deliberate cancel is the most common way
    // this flow feels broken.
    expect(find.textContaining('could not'), findsNothing);
    expect(find.textContaining('failed'), findsNothing);
    verifyNever(
      () => auth.oauthGoogle(
        idToken: any(named: 'idToken'),
        nonce: any(named: 'nonce'),
      ),
    );
  });

  testWidgets('prompts for the password on 409 and completes the link', (
    tester,
  ) async {
    when(
      () => auth.oauthGoogle(
        idToken: any(named: 'idToken'),
        nonce: any(named: 'nonce'),
      ),
    ).thenThrow(
      const EmailLinkRequiredException('already exists', 'ada@test.com'),
    );
    when(
      () => auth.oauthLink(
        provider: any(named: 'provider'),
        idToken: any(named: 'idToken'),
        email: any(named: 'email'),
        password: any(named: 'password'),
        nonce: any(named: 'nonce'),
        firstName: any(named: 'firstName'),
        lastName: any(named: 'lastName'),
      ),
    ).thenAnswer((_) async => tokens);

    await pumpButtons(tester);
    await tester.tap(find.text('Continue with Google'));
    await tester.pumpAndSettle();

    expect(find.text('Link your account'), findsOneWidget);
    // The address comes from the server's 409, not from the client.
    expect(find.textContaining('ada@test.com'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'correct-password');
    await tester.tap(find.text('Link'));
    await tester.pumpAndSettle();

    final linked = verify(
      () => auth.oauthLink(
        provider: captureAny(named: 'provider'),
        idToken: any(named: 'idToken'),
        email: captureAny(named: 'email'),
        password: captureAny(named: 'password'),
        nonce: any(named: 'nonce'),
        firstName: any(named: 'firstName'),
        lastName: any(named: 'lastName'),
      ),
    ).captured;
    expect(linked, ['GOOGLE', 'ada@test.com', 'correct-password']);
    expect(find.text('Basic Profile'), findsOneWidget);
  });

  testWidgets('dismissing the link prompt leaves no session and no error', (
    tester,
  ) async {
    when(
      () => auth.oauthGoogle(
        idToken: any(named: 'idToken'),
        nonce: any(named: 'nonce'),
      ),
    ).thenThrow(
      const EmailLinkRequiredException('already exists', 'ada@test.com'),
    );

    await pumpButtons(tester);
    await tester.tap(find.text('Continue with Google'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();

    expect(find.text('Link your account'), findsNothing);
    expect(find.text('Basic Profile'), findsNothing);
    verifyNever(
      () => auth.oauthLink(
        provider: any(named: 'provider'),
        idToken: any(named: 'idToken'),
        email: any(named: 'email'),
        password: any(named: 'password'),
        nonce: any(named: 'nonce'),
        firstName: any(named: 'firstName'),
        lastName: any(named: 'lastName'),
      ),
    );
  });

  testWidgets('surfaces an unconfigured build instead of failing silently', (
    tester,
  ) async {
    when(() => social.google()).thenThrow(
      const SocialSignInUnavailable('Google sign-in isn\'t configured yet.'),
    );

    await pumpButtons(tester);
    await tester.tap(find.text('Continue with Google'));
    await tester.pumpAndSettle();

    expect(find.text('Google sign-in isn\'t configured yet.'), findsOneWidget);
  });
}
