import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/onboarding/presentation/basic_profile_screen.dart';
import 'package:drift_tennis/features/users/application/current_user_provider.dart';
import 'package:drift_tennis/features/users/data/users_repository.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

/// Reads the text a `TextField` was seeded with, by the label above it.
String fieldText(WidgetTester tester, String label) {
  final field = tester.widget<TextField>(
    find.ancestor(
      of: find.text(label),
      matching: find.byType(TextField),
    ),
  );
  return field.controller?.text ?? '';
}

void main() {
  group('BasicProfileScreen', () {
    testWidgets('prefills the name a social sign-up already provided', (
      tester,
    ) async {
      // What a Google sign-up looks like on arrival: the provider's verified
      // name was persisted at account creation, so this step must not ask for
      // it again.
      await pumpScreen(
        tester,
        const BasicProfileScreen(),
        overrides: [
          currentUserProvider.overrideWith(
            (ref) async =>
                userProfile(firstName: 'Ada', lastName: 'Lovelace'),
          ),
        ],
      );

      expect(fieldText(tester, 'First name'), 'Ada');
      expect(fieldText(tester, 'Last name'), 'Lovelace');
    });

    testWidgets('leaves the name empty for an email sign-up', (tester) async {
      // Nothing is known yet on this path, so the fields start blank — the
      // same code path, not a branch on provider.
      await pumpScreen(
        tester,
        const BasicProfileScreen(),
        overrides: [
          currentUserProvider.overrideWith(
            (ref) async => userProfile(firstName: null, lastName: null),
          ),
        ],
      );

      expect(fieldText(tester, 'First name'), '');
      expect(fieldText(tester, 'Last name'), '');
    });

    testWidgets('prefills a phone number given at signup', (tester) async {
      await pumpScreen(
        tester,
        const BasicProfileScreen(),
        overrides: [
          currentUserProvider.overrideWith(
            (ref) async =>
                userProfile(phone: '+254700000000', phoneOnWhatsApp: true),
          ),
        ],
      );

      expect(fieldText(tester, 'Phone number (optional)'), '+254700000000');
      final checkbox = tester.widget<Checkbox>(find.byType(Checkbox));
      expect(checkbox.value, isTrue);
    });

    testWidgets('the WhatsApp box is inert until a number is typed', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const BasicProfileScreen(),
        overrides: [
          currentUserProvider.overrideWith((ref) async => userProfile()),
        ],
      );

      // No number on file — the flag describes nothing, so it can't be set.
      expect(tester.widget<Checkbox>(find.byType(Checkbox)).onChanged, isNull);

      await tester.enterText(
        find.ancestor(
          of: find.text('Phone number (optional)'),
          matching: find.byType(TextField),
        ),
        '+254700111222',
      );
      await tester.pump();

      expect(
        tester.widget<Checkbox>(find.byType(Checkbox)).onChanged,
        isNotNull,
      );
    });

    testWidgets('offers a retry when the user cannot be loaded', (
      tester,
    ) async {
      // Submitting blind would overwrite a social provider's name with blanks,
      // so the form must not render at all.
      await pumpScreen(
        tester,
        const BasicProfileScreen(),
        overrides: [
          currentUserProvider.overrideWith((ref) => failing<UserProfile>()),
        ],
      );

      expect(find.text('Retry'), findsOneWidget);
      expect(find.text('First name'), findsNothing);
      expect(tester.takeException(), isNull);
    });
  });
}
