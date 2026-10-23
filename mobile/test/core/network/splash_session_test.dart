import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:drift_tennis/core/network/dio_client.dart';
import 'package:drift_tennis/features/onboarding/presentation/splash_screen.dart';
import 'package:drift_tennis/features/users/data/users_repository.dart';

import '../../support/pump.dart';
import 'session_manager_test.dart' show MemoryStorage;

class FailingUsersRepository extends UsersRepository {
  FailingUsersRepository() : super(Dio());
  int calls = 0;
  @override
  Future<UserProfile> getMe() async {
    calls++;
    throw DioException(
      requestOptions: RequestOptions(path: '/users/me'),
      type: DioExceptionType.connectionError,
    );
  }
}

void main() {
  testWidgets('splash retains a saved session on temporary network failure', (
    tester,
  ) async {
    final storage = MemoryStorage();
    final users = FailingUsersRepository();
    await pumpRouted(
      tester,
      const SplashScreen(),
      overrides: [
        secureStorageProvider.overrideWithValue(storage),
        usersRepositoryProvider.overrideWithValue(users),
      ],
      extraRoutes: [
        GoRoute(
          path: '/intro',
          builder: (_, _) => const Scaffold(body: Text('Intro')),
        ),
        GoRoute(
          path: '/login',
          builder: (_, _) => const Scaffold(body: Text('Login')),
        ),
      ],
    );
    expect(
      find.text('Could not connect. Your session is still saved.'),
      findsOneWidget,
    );
    expect(storage.refresh, 'valid-refresh');
    await tester.tap(find.text('Try again'));
    await tester.pumpAndSettle();
    expect(users.calls, 2);
    expect(storage.refresh, 'valid-refresh');
  });
}
