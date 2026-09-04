import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/core/shell/drift_app_header.dart';
import 'package:drift_tennis/features/home/application/home_feed_provider.dart';
import 'package:drift_tennis/features/home/data/home_repository.dart';
import 'package:drift_tennis/features/notifications/application/notifications_providers.dart';

import '../../support/fixtures.dart';
import '../../support/pump.dart';

void main() {
  // The header calls `Scaffold.of(context).openDrawer()`, so it has to be
  // pumped inside a Scaffold that actually has a drawer.
  Widget screen({String? title}) => Scaffold(
    drawer: const Drawer(child: Text('drawer')),
    body: DriftAppHeader(title: title),
  );

  final notificationsOverride = notificationsListProvider.overrideWith(
    (ref) async => notificationsPage(),
  );
  group('DriftAppHeader', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('shows the greeting when no title is given in $label', (
        tester,
      ) async {
        await pumpScreen(
          tester,
          screen(),
          brightness: brightness,
          overrides: [
            homeSummaryProvider.overrideWith((ref) async => homeSummary()),
            notificationsOverride,
          ],
        );

        expect(find.text('Hi, Ana'), findsOneWidget);
        expect(find.byIcon(Icons.menu), findsOneWidget);
        expect(find.byIcon(Icons.notifications_outlined), findsOneWidget);
        // The avatar was removed from the header — profile is reached through
        // the drawer now.
        expect(find.text('AM'), findsNothing);
      });

      testWidgets('shows the tab name when a title is given in $label', (
        tester,
      ) async {
        await pumpScreen(
          tester,
          screen(title: 'Compete'),
          brightness: brightness,
          overrides: [notificationsOverride],
        );

        expect(find.text('Compete'), findsOneWidget);
        expect(find.text('Hi, Ana'), findsNothing);
      });
    }

    testWidgets('falls back to a generic greeting when the summary fails', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        screen(),
        overrides: [
          homeSummaryProvider.overrideWith((ref) => failing<HomeSummary>()),
          notificationsOverride,
        ],
      );

      expect(find.text('Welcome back'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('opens the drawer from the hamburger', (tester) async {
      await pumpScreen(
        tester,
        screen(),
        overrides: [
          homeSummaryProvider.overrideWith((ref) async => homeSummary()),
          notificationsOverride,
        ],
      );

      await tester.tap(find.byIcon(Icons.menu));
      await tester.pumpAndSettle();

      expect(find.text('drawer'), findsOneWidget);
    });
  });
}
