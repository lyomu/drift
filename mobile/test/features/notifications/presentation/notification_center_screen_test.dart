import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/notifications/application/notifications_providers.dart';
import 'package:drift_tennis/features/notifications/data/notifications_repository.dart';
import 'package:drift_tennis/features/notifications/presentation/notification_center_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('NotificationCenterScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders its data state in $label', (tester) async {
        await pumpScreen(
          tester,
          const NotificationCenterScreen(),
          brightness: brightness,
          overrides: [
            notificationsListProvider.overrideWith(
              (ref) async => notificationsPage(),
            ),
          ],
        );

        expect(find.text('Notifications'), findsOneWidget);
        expect(find.text('Court closed'), findsOneWidget);
      });

      testWidgets('renders its empty state in $label', (tester) async {
        await pumpScreen(
          tester,
          const NotificationCenterScreen(),
          brightness: brightness,
          overrides: [
            notificationsListProvider.overrideWith(
              (ref) async =>
                  const NotificationsPage(
                    total: 0,
                    unreadCount: 0,
                    notifications: [],
                  ),
            ),
          ],
        );

        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const NotificationCenterScreen(),
        settle: false,
        overrides: [
          notificationsListProvider.overrideWith(
            (ref) => pending<NotificationsPage>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const NotificationCenterScreen(),
        overrides: [
          notificationsListProvider.overrideWith(
            (ref) => failing<NotificationsPage>(),
          ),
        ],
      );

      expect(tester.takeException(), isNull);
    });
  });
}
