import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/home/application/home_feed_provider.dart';
import 'package:drift_tennis/features/home/data/home_repository.dart';
import 'package:drift_tennis/features/home/presentation/home_screen.dart';
import 'package:drift_tennis/features/notifications/application/notifications_providers.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  // The screen has no Scaffold of its own — it lives inside the shell tab.
  Widget screen() => const Scaffold(body: HomeScreen());

  group('HomeScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the feed in $label', (tester) async {
        await pumpScreen(
          tester,
          screen(),
          brightness: brightness,
          overrides: [
            homeFeedProvider.overrideWith((ref) => Future.value([homeCard()])),
            notificationsListProvider.overrideWith(
              (ref) async => notificationsPage(),
            ),
          ],
        );

        expect(find.text('Home'), findsOneWidget);
        expect(find.text('Confirm a result'), findsOneWidget);
      });

      testWidgets("renders an empty feed without throwing in $label",
          (tester) async {
        await pumpScreen(
          tester,
          screen(),
          brightness: brightness,
          overrides: [
            homeFeedProvider.overrideWith(
              (ref) => Future.value(<HomeCard>[]),
            ),
            notificationsListProvider.overrideWith(
              (ref) async => notificationsPage(),
            ),
          ],
        );

        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        screen(),
        settle: false,
        overrides: [
          homeFeedProvider.overrideWith((ref) => pending<List<HomeCard>>()),
          notificationsListProvider.overrideWith(
            (ref) async => notificationsPage(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('offers a retry after an error', (tester) async {
      await pumpScreen(
        tester,
        screen(),
        overrides: [
          homeFeedProvider.overrideWith((ref) => failing<List<HomeCard>>()),
          notificationsListProvider.overrideWith(
            (ref) async => notificationsPage(),
          ),
        ],
      );

      expect(find.text("Couldn't load your Home feed. Please try again."),
          findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
