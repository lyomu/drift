import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/competitions/application/competitions_providers.dart';
import 'package:drift_tennis/features/competitions/data/competitions_repository.dart';
import 'package:drift_tennis/features/competitions/presentation/league_rules_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('LeagueRulesScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the published rules in $label', (tester) async {
        await pumpScreen(
          tester,
          const LeagueRulesScreen(leagueId: 'league-1'),
          brightness: brightness,
          overrides: [
            leagueDetailProvider('league-1').overrideWith(
              (ref) async => league(),
            ),
          ],
        );

        expect(find.text('Best of three sets.'), findsOneWidget);
      });

      testWidgets("falls back politely when no rules exist in $label",
          (tester) async {
        await pumpScreen(
          tester,
          const LeagueRulesScreen(leagueId: 'league-1'),
          brightness: brightness,
          overrides: [
            leagueDetailProvider('league-1').overrideWith(
              (ref) async => League(
                id: 'league-1',
                sport: 'TENNIS',
                name: 'Richmond Singles',
                description: null,
                rulesText: null,
                format: 'SINGLES',
                seasons: const [],
              ),
            ),
          ],
        );

        expect(
          find.text('No rules have been published for this league yet.'),
          findsOneWidget,
        );
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const LeagueRulesScreen(leagueId: 'league-1'),
        settle: false,
        overrides: [
          leagueDetailProvider('league-1').overrideWith(
            (ref) => pending<League>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const LeagueRulesScreen(leagueId: 'league-1'),
        overrides: [
          leagueDetailProvider('league-1').overrideWith(
            (ref) => failing<League>(),
          ),
        ],
      );

      expect(find.text('Rules not available.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
