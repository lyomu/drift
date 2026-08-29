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

  // The header is a sibling of the feed and fetches independently, so every
  // case has to stub it too — otherwise it reaches for the real repository.
  final summaryOverride = homeSummaryProvider.overrideWith(
    (ref) async => homeSummary(),
  );
  final notificationsOverride = notificationsListProvider.overrideWith(
    (ref) async => notificationsPage(),
  );

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
            summaryOverride,
            notificationsOverride,
          ],
        );

        // The identity header replaced the old static "Home" title.
        expect(find.text('Hi, Ana'), findsOneWidget);
        expect(find.text('Confirm a result'), findsOneWidget);
      });

      testWidgets("renders an empty feed without throwing in $label", (
        tester,
      ) async {
        await pumpScreen(
          tester,
          screen(),
          brightness: brightness,
          overrides: [
            homeFeedProvider.overrideWith((ref) => Future.value(<HomeCard>[])),
            summaryOverride,
            notificationsOverride,
          ],
        );

        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('renders a card action and its payload', (tester) async {
      await pumpScreen(
        tester,
        screen(),
        overrides: [
          homeFeedProvider.overrideWith(
            (ref) => Future.value([
              homeCard(
                type: 'SUGGESTED_OPPONENTS',
                title: 'Players near your level',
                dismissible: true,
                action: const HomeCardAction(
                  label: 'Find players',
                  route: '/home?tab=play&play=find',
                ),
                data: HomeCardData(
                  kind: 'players',
                  players: [playerSummary(id: 'u1')],
                ),
              ),
            ]),
          ),
          summaryOverride,
          notificationsOverride,
        ],
      );

      expect(find.text('Players near your level'), findsOneWidget);
      expect(find.text('Find players'), findsWidgets);
      expect(tester.takeException(), isNull);
    });

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        screen(),
        settle: false,
        overrides: [
          homeFeedProvider.overrideWith((ref) => pending<List<HomeCard>>()),
          summaryOverride,
          notificationsOverride,
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
          summaryOverride,
          notificationsOverride,
        ],
      );

      expect(
        find.text("Couldn't load your Home feed. Please try again."),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });
  });
}
