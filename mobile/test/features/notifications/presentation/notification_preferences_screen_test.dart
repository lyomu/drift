import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/notifications/application/notifications_providers.dart';
import 'package:drift_tennis/features/notifications/data/notifications_repository.dart';
import 'package:drift_tennis/features/notifications/presentation/notification_preferences_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('NotificationPreferencesScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the category toggles in $label', (tester) async {
        await pumpScreen(
          tester,
          const NotificationPreferencesScreen(),
          brightness: brightness,
          overrides: [
            notificationPreferencesProvider.overrideWith(
              (ref) => Future.value(notificationPreferences),
            ),
          ],
        );

        expect(find.text('Notification Preferences'), findsOneWidget);
      });

      testWidgets("survives a failed preferences load in $label", (
        tester,
      ) async {
        await pumpScreen(
          tester,
          const NotificationPreferencesScreen(),
          brightness: brightness,
          overrides: [
            notificationPreferencesProvider.overrideWith(
              (ref) => failing<NotificationPreferences>(),
            ),
          ],
        );

        expect(find.text("Couldn't load your preferences."), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const NotificationPreferencesScreen(),
        settle: false,
        overrides: [
          notificationPreferencesProvider.overrideWith(
            (ref) => pending<NotificationPreferences>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });
}
