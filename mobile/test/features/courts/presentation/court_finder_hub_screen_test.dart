import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/courts/application/courts_providers.dart';
import 'package:drift_tennis/features/courts/data/courts_repository.dart';
import 'package:drift_tennis/features/courts/presentation/court_finder_hub_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  // The hub has no Scaffold of its own — it lives inside the Discover tab.
  // The map segment never settles under fake async (flutter_map keeps
  // scheduling frames for its tile layer), so every test's first pump is a
  // plain one and only the list segment gets pumpAndSettle afterwards.
  Widget screen() => const Scaffold(body: CourtFinderHubScreen());

  group('CourtFinderHubScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('opens on the map segment in $label', (tester) async {
        await pumpScreen(
          tester,
          screen(),
          settle: false,
          brightness: brightness,
          overrides: [
            courtSearchProvider.overrideWith(
              (ref) => Future.value(courtSearchResult()),
            ),
          ],
        );
        await tester.pump();

        expect(find.text('Courts'), findsOneWidget);
        expect(tester.takeException(), isNull);
      });

      testWidgets('renders results on the list segment in $label',
          (tester) async {
        await pumpScreen(
          tester,
          screen(),
          settle: false,
          brightness: brightness,
          overrides: [
            courtSearchProvider.overrideWith(
              (ref) => Future.value(courtSearchResult()),
            ),
          ],
        );

        await tester.tap(find.text('List'));
        await tester.pumpAndSettle();

        expect(find.text('Riverside Courts'), findsOneWidget);
      });

      testWidgets("survives a failed search without throwing in $label",
          (tester) async {
        await pumpScreen(
          tester,
          screen(),
          settle: false,
          brightness: brightness,
          overrides: [
            courtSearchProvider.overrideWith(
              (ref) => failing<CourtSearchResult>(),
            ),
          ],
        );

        await tester.tap(find.text('List'));
        await tester.pumpAndSettle();

        expect(find.text("Couldn't load courts. Please try again."),
            findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        screen(),
        settle: false,
        overrides: [
          courtSearchProvider.overrideWith((ref) => pending<CourtSearchResult>()),
        ],
      );

      await tester.tap(find.text('List'));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });
}
