import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/core/theme/app_theme.dart';
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

  group('NotificationCenterScreen refetch-on-open', () {
    testWidgets('refetches even when Home kept the cache warm', (tester) async {
      // Reproduces the device-found bug: Home's bell watches the same
      // .autoDispose provider permanently, so its first (stale-empty)
      // result used to survive every re-entry. The screen must invalidate
      // on open and show the fresh page.
      var fetches = 0;
      final container = ProviderContainer(
        overrides: [
          notificationsListProvider.overrideWith((ref) async {
            fetches++;
            return fetches == 1
                ? const NotificationsPage(
                    total: 0,
                    unreadCount: 0,
                    notifications: [],
                  )
                : notificationsPage();
          }),
        ],
      );
      addTearDown(container.dispose);

      Future<void> pump(Widget child) async {
        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: MaterialApp(theme: AppTheme.light(), home: child),
          ),
        );
        await tester.pumpAndSettle();
      }

      // A stand-in for Home's bell: keeps the provider alive with the
      // stale empty result.
      await pump(const ConsumerWidgetAdapter());
      expect(fetches, 1);

      await pump(const NotificationCenterScreen());

      expect(find.text('Court closed'), findsOneWidget);
      expect(fetches, 2);
    });
  });
}

/// Minimal widget that watches the provider exactly like Home's bell does.
class ConsumerWidgetAdapter extends ConsumerWidget {
  const ConsumerWidgetAdapter({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(notificationsListProvider);
    return const SizedBox.shrink();
  }
}
