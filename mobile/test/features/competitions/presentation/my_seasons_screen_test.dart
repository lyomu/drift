import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/competitions/application/competitions_providers.dart';
import 'package:drift_tennis/features/competitions/data/competitions_repository.dart';
import 'package:drift_tennis/features/competitions/presentation/my_seasons_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('MySeasonsScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders joined seasons in $label', (tester) async {
        await pumpScreen(
          tester,
          const MySeasonsScreen(),
          brightness: brightness,
          overrides: [
            mySeasonsProvider.overrideWith((ref) async => [mySeason()]),
          ],
        );

        expect(find.text('My Seasons'), findsOneWidget);
        expect(find.text('Autumn 2026'), findsOneWidget);
        expect(find.text('In progress'), findsOneWidget);
      });

      testWidgets('renders its empty state in $label', (tester) async {
        await pumpScreen(
          tester,
          const MySeasonsScreen(),
          brightness: brightness,
          overrides: [
            mySeasonsProvider.overrideWith(
              (ref) async => <MySeasonSummary>[],
            ),
          ],
        );

        expect(find.text("You haven't joined a season yet"), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const MySeasonsScreen(),
        settle: false,
        overrides: [
          mySeasonsProvider.overrideWith(
            (ref) => pending<List<MySeasonSummary>>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const MySeasonsScreen(),
        overrides: [
          mySeasonsProvider.overrideWith(
            (ref) => failing<List<MySeasonSummary>>(),
          ),
        ],
      );

      expect(find.text("Couldn't load your seasons."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
