import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/users/application/current_user_provider.dart';

import 'package:drift_tennis/features/competitions/application/competitions_providers.dart';
import 'package:drift_tennis/features/competitions/data/competitions_repository.dart';
import 'package:drift_tennis/features/competitions/presentation/standings_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('StandingsScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the table in $label', (tester) async {
        await pumpScreen(
          tester,
          const StandingsScreen(seasonId: 'season-1'),
          brightness: brightness,
          overrides: [
            standingsProvider('season-1').overrideWith(
              (ref) async => [standingRow()],
            ),
            currentUserProvider.overrideWith((ref) async => userProfile()),
          ],
        );

        expect(find.text('Standings'), findsOneWidget);
        expect(find.text('Ana Diaz'), findsOneWidget);
        expect(find.text('3-1'), findsOneWidget);
      });

      testWidgets('explains an empty table in $label', (tester) async {
        await pumpScreen(
          tester,
          const StandingsScreen(seasonId: 'season-1'),
          brightness: brightness,
          overrides: [
            standingsProvider('season-1').overrideWith(
              (ref) async => <StandingRow>[],
            ),
            currentUserProvider.overrideWith((ref) async => userProfile()),
          ],
        );

        expect(
          find.text('Standings appear once the first round is played'),
          findsOneWidget,
        );
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const StandingsScreen(seasonId: 'season-1'),
        settle: false,
        overrides: [
          standingsProvider('season-1').overrideWith(
            (ref) => pending<List<StandingRow>>(),
          ),
          currentUserProvider.overrideWith((ref) async => userProfile()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const StandingsScreen(seasonId: 'season-1'),
        overrides: [
          standingsProvider('season-1').overrideWith(
            (ref) => failing<List<StandingRow>>(),
          ),
          currentUserProvider.overrideWith((ref) async => userProfile()),
        ],
      );

      expect(find.text("Couldn't load standings."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
