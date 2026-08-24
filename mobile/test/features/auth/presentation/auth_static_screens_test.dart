import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/auth/presentation/login_screen.dart';
import 'package:drift_tennis/features/auth/presentation/sign_up_screen.dart';
import 'package:drift_tennis/features/auth/presentation/verify_screen.dart';

import '../../../support/pump.dart';

void main() {
  final screens = <String, Widget Function()>{
    'LoginScreen': () => const LoginScreen(),
    'SignUpScreen': () => const SignUpScreen(),
    'VerifyScreen': () => const VerifyScreen(email: 'ana@test.com'),
  };

  for (final entry in screens.entries) {
    group(entry.key, () {
      for (final brightness in Brightness.values) {
        testWidgets('renders without throwing in ${brightness.name}',
            (tester) async {
          await pumpScreen(
            tester,
            Scaffold(body: entry.value()),
            brightness: brightness,
          );

          expect(tester.takeException(), isNull);
        });
      }
    });
  }
}
