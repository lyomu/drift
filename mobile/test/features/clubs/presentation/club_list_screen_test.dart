import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/clubs/application/clubs_providers.dart';
import 'package:drift_tennis/features/clubs/data/clubs_repository.dart';
import 'package:drift_tennis/features/clubs/presentation/club_list_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  // The screen has no Scaffold of its own — it lives inside the Discover tab.
  Widget screen() => const Scaffold(body: ClubListScreen());

  group('ClubListScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders clubs in $label', (tester) async {
        await pumpScreen(
          tester,
          screen(),
          brightness: brightness,
          overrides: [
            clubSearchProvider.overrideWith(
              (ref) => Future.value(clubSearchResult()),
            ),
          ],
        );

        expect(find.text('Clubs'), findsOneWidget);
        expect(find.text('Riverside Tennis'), findsOneWidget);
      });

      testWidgets('renders its empty state in $label', (tester) async {
        await pumpScreen(
          tester,
          screen(),
          brightness: brightness,
          overrides: [
            clubSearchProvider.overrideWith(
              (ref) => Future.value(
                const ClubSearchResult(total: 0, clubs: []),
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
        screen(),
        settle: false,
        overrides: [
          clubSearchProvider.overrideWith((ref) => pending<ClubSearchResult>()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('offers a retry after an error', (tester) async {
      await pumpScreen(
        tester,
        screen(),
        overrides: [
          clubSearchProvider.overrideWith((ref) => failing<ClubSearchResult>()),
        ],
      );

      expect(find.text("Couldn't load clubs. Please try again."),
          findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
