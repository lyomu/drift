import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:drift_tennis/core/network/dio_client.dart';
import 'package:drift_tennis/core/onboarding/onboarding_step.dart';
import 'package:drift_tennis/core/storage/secure_storage.dart';
import 'package:drift_tennis/features/onboarding/presentation/splash_screen.dart';
import 'package:drift_tennis/features/users/data/users_repository.dart';

import '../../../support/fixtures.dart';
import '../../../support/mocks.dart';
import '../../../support/pump.dart';

/// A stored-but-valid token whose /users/me reports a mid-onboarding step
/// must land the player exactly where they left off (Doc 4's interrupted
/// onboarding recovery), not back at Welcome and not at Home.
void main() {
  late MockUsersRepository usersRepo;
  late _TokenStorage storage;

  setUp(() {
    usersRepo = MockUsersRepository();
    when(
      () => usersRepo.getMe(),
    ).thenAnswer((_) async => userProfile(step: OnboardingStep.goals));
    storage = _TokenStorage();
  });

  testWidgets('resumes a mid-onboarding session at the saved step', (
    tester,
  ) async {
    await pumpRouted(
      tester,
      const SplashScreen(),
      extraRoutes: [
        GoRoute(
          path: '/onboarding/goals',
          pageBuilder: (_, __) => NoTransitionPage(
            child: Scaffold(
              appBar: AppBar(title: const Text('Goals')),
              body: const Center(child: Text('RESUMED-GOALS')),
            ),
          ),
        ),
        GoRoute(path: '/welcome', builder: (_, _) => const SizedBox.shrink()),
        GoRoute(path: '/home', builder: (_, _) => const SizedBox.shrink()),
      ],
      overrides: [
        secureStorageProvider.overrideWithValue(storage),
        usersRepositoryProvider.overrideWithValue(usersRepo),
      ],
    );
    await tester.pumpAndSettle();

    expect(find.text('RESUMED-GOALS'), findsOneWidget);
    verify(() => usersRepo.getMe()).called(1);
  });

  testWidgets('a stored-but-invalid token falls back to the intro carousel', (
    tester,
  ) async {
    when(() => usersRepo.getMe()).thenThrow(Exception('expired'));

    await pumpRouted(
      tester,
      const SplashScreen(),
      extraRoutes: [
        GoRoute(
          path: '/intro',
          builder: (_, _) => const Center(child: Text('BACK-TO-INTRO')),
        ),
        GoRoute(
          path: '/onboarding/goals',
          builder: (_, _) => const SizedBox.shrink(),
        ),
        GoRoute(path: '/home', builder: (_, _) => const SizedBox.shrink()),
      ],
      overrides: [
        secureStorageProvider.overrideWithValue(storage),
        usersRepositoryProvider.overrideWithValue(usersRepo),
      ],
    );
    await tester.pumpAndSettle();

    expect(find.text('BACK-TO-INTRO'), findsOneWidget);
    // The dead token must have been cleared, not left for the next launch.
    expect(storage.cleared, isTrue);
  });
}

class _TokenStorage extends SecureStorage {
  @override
  Future<String?> readAccessToken() async => 'stored-token';

  @override
  Future<String?> readRefreshToken() async => null;

  @override
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {}

  bool cleared = false;

  @override
  Future<void> clear() async {
    cleared = true;
  }
}
