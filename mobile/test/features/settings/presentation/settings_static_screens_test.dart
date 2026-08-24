import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/settings/presentation/account_security_screen.dart';
import 'package:drift_tennis/features/settings/presentation/contact_support_screen.dart';
import 'package:drift_tennis/features/settings/presentation/delete_account_screen.dart';
import 'package:drift_tennis/features/settings/presentation/help_screen.dart';
import 'package:drift_tennis/features/settings/presentation/legal_screen.dart';
import 'package:drift_tennis/features/settings/presentation/settings_home_screen.dart';

import '../../../support/pump.dart';

void main() {
  // Static and form screens: rendering without throwing in both
  // brightnesses is the whole contract — it proves the theme extensions
  // stay wired and the build logic survives empty form state.
  final screens = {
    'SettingsHomeScreen': () => const SettingsHomeScreen(),
    'LegalScreen': () => const LegalScreen(),
    'HelpScreen': () => const HelpScreen(),
    'DeleteAccountScreen': () => const DeleteAccountScreen(),
    'ContactSupportScreen': () => const ContactSupportScreen(),
    'AccountSecurityScreen': () => const AccountSecurityScreen(),
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
