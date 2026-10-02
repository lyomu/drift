import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/players/application/players_providers.dart';
import 'package:drift_tennis/features/players/data/players_repository.dart';
import 'package:drift_tennis/features/players/presentation/player_search_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  // The screen has no Scaffold of its own — in the app it lives inside the
  // Discover tab's, and its InkWells need a Material ancestor.
  Widget screen({bool embedded = false}) =>
      Scaffold(body: PlayerSearchScreen(embedded: embedded));

  group('PlayerSearchScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders results in $label', (tester) async {
        await pumpRouted(
          tester,
          screen(),
          brightness: brightness,
          overrides: [
            playerSearchProvider.overrideWith(
              (ref) => Future.value([playerSummary()]),
            ),
          ],
        );

        // No 'Players' heading to assert any more: the screen renders inside
        // the Discover Hub, which supplies the title. The result card is the
        // thing this test is actually about.
        expect(find.text('Ana Diaz'), findsOneWidget);
      });

      testWidgets('renders its empty state in $label', (tester) async {
        await pumpRouted(
          tester,
          screen(),
          brightness: brightness,
          overrides: [
            playerSearchProvider.overrideWith(
              (ref) => Future.value(<PlayerSummary>[]),
            ),
          ],
        );

        expect(
          find.text(
            'No players match these filters. Try widening distance or level '
            'range.',
          ),
          findsOneWidget,
        );
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpRouted(
        tester,
        screen(),
        settle: false,
        overrides: [
          playerSearchProvider.overrideWith(
            (ref) => pending<List<PlayerSummary>>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('offers a retry after an error', (tester) async {
      await pumpRouted(
        tester,
        screen(),
        overrides: [
          playerSearchProvider.overrideWith(
            (ref) => failing<List<PlayerSummary>>(),
          ),
        ],
      );

      expect(
        find.text("Couldn't load players. Pull to retry."),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });
  });
}
