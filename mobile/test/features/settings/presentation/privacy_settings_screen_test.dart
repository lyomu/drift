import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/settings/application/settings_providers.dart';
import 'package:drift_tennis/features/settings/presentation/privacy_settings_screen.dart';
import 'package:drift_tennis/features/users/data/users_repository.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('PrivacySettingsScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the visibility controls in $label', (tester) async {
        await pumpScreen(
          tester,
          const PrivacySettingsScreen(),
          brightness: brightness,
          overrides: [
            privacySettingsProvider.overrideWith(
              (ref) => Future.value(privacySettings),
            ),
          ],
        );

        expect(find.text('Privacy Settings'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const PrivacySettingsScreen(),
        settle: false,
        overrides: [
          privacySettingsProvider.overrideWith(
            (ref) => pending<PrivacySettings>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const PrivacySettingsScreen(),
        overrides: [
          privacySettingsProvider.overrideWith(
            (ref) => failing<PrivacySettings>(),
          ),
        ],
      );

      expect(find.text("Couldn't load your privacy settings."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
