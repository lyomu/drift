import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:drift_tennis/features/auth/data/auth_repository.dart';
import 'package:drift_tennis/features/settings/presentation/account_security_screen.dart';

import '../../../support/mocks.dart';
import '../../../support/pump.dart';

void main() {
  late MockAuthRepository auth;

  setUp(() {
    auth = MockAuthRepository();
  });

  testWidgets('requires matching new passwords before changing a password', (
    tester,
  ) async {
    await pumpScreen(
      tester,
      const AccountSecurityScreen(),
      overrides: [authRepositoryProvider.overrideWithValue(auth)],
    );

    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), 'current-password');
    await tester.enterText(fields.at(1), 'new-password-one');
    await tester.enterText(fields.at(2), 'new-password-two');
    await tester.tap(find.text('Update password'));
    await tester.pumpAndSettle();

    expect(find.text('Confirm new password'), findsOneWidget);
    expect(find.text('Those passwords don’t match.'), findsOneWidget);
    verifyNever(
      () => auth.changePassword(
        currentPassword: any(named: 'currentPassword'),
        newPassword: any(named: 'newPassword'),
      ),
    );
  });
}
