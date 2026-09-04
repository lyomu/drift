import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/home/application/home_feed_provider.dart';
import 'package:drift_tennis/features/home/application/home_sections.dart';
import 'package:drift_tennis/features/home/data/home_repository.dart';
import 'package:drift_tennis/features/home/presentation/home_screen.dart';
import 'package:drift_tennis/features/home/presentation/sections/players_near_you_rail.dart';
import 'package:drift_tennis/features/notifications/application/notifications_providers.dart';
import 'package:drift_tennis/features/users/application/current_user_provider.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  // The screen has no Scaffold of its own — it lives inside the shell tab.
  Widget screen() => const Scaffold(body: HomeScreen());

  // The stat card is a sibling of the feed and fetches independently, so
  // every case has to stub it too — otherwise it reaches for the real
  // repository.
  final summaryOverride = homeSummaryProvider.overrideWith(
    (ref) async => homeSummary(),
  );
  final notificationsOverride = notificationsListProvider.overrideWith(
    (ref) async => notificationsPage(),
  );
  // PlayersNearYouSection filters out the viewer, so it reads the current user.
  final currentUserOverride = currentUserProvider.overrideWith(
    (ref) async => userProfile(),
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

        // The greeting lives in the shell's `DriftAppHeader` now (2026-09
        // redesign) — see `drift_app_header_test.dart`. Home starts at the
        // stat card, then the feed.
        expect(find.text('Hi, Ana'), findsNothing);
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

    testWidgets('buckets a SUGGESTED_OPPONENTS card into the players section', (
      tester,
    ) async {
      // The redesign turned the flat feed into fixed sections: HomeSections
      // decides which section each card feeds, and each section renders its
      // own header, not the card's title. Assert that seam directly rather
      // than scrolling the full Home ListView (whose other sections would
      // fire real repository calls).
      final feed = [
        homeCard(
          type: 'SUGGESTED_OPPONENTS',
          data: HomeCardData(
            kind: 'players',
            players: [playerSummary(id: 'u9')],
          ),
        ),
      ];
      final sections = HomeSections(feed);

      await pumpScreen(
        tester,
        Scaffold(
          body: PlayersNearYouSection(
            players: sections.players?.data?.players ?? const [],
          ),
        ),
        overrides: [currentUserOverride],
      );

      expect(find.text('Players near you'), findsOneWidget);
      expect(find.text('Ana D.'), findsOneWidget);
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
