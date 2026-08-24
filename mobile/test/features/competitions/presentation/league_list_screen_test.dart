import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/competitions/application/competitions_providers.dart';
import 'package:drift_tennis/features/competitions/data/competitions_repository.dart';
import 'package:drift_tennis/features/competitions/presentation/league_list_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  // The screen supplies no Scaffold of its own — in the app it lives inside
  // Compete Hub's, and its DriftCard InkWells need a Material ancestor.
  Widget screen() => const Scaffold(body: LeagueListScreen());

  group('LeagueListScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders leagues in $label', (tester) async {
        await pumpScreen(
          tester,
          screen(),
          brightness: brightness,
          overrides: [
            leaguesProvider.overrideWith((ref) async => [league()]),
          ],
        );

        expect(find.text('Leagues'), findsOneWidget);
        expect(find.text('Richmond Singles'), findsOneWidget);
      });

      testWidgets('renders its empty state in $label', (tester) async {
        await pumpScreen(
          tester,
          screen(),
          brightness: brightness,
          overrides: [
            leaguesProvider.overrideWith((ref) async => <League>[]),
          ],
        );

        expect(
          find.text('No leagues near you yet — try widening your search'),
          findsOneWidget,
        );
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        screen(),
        settle: false,
        overrides: [
          leaguesProvider.overrideWith((ref) => pending<List<League>>()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('offers a retry after an error', (tester) async {
      await pumpScreen(
        tester,
        screen(),
        overrides: [
          leaguesProvider.overrideWith((ref) => failing<List<League>>()),
        ],
      );

      expect(find.text("Couldn't load leagues. Please try again."),
          findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
