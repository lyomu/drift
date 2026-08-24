import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/competitions/application/competitions_providers.dart';
import 'package:drift_tennis/features/competitions/data/competitions_repository.dart';
import 'package:drift_tennis/features/competitions/presentation/registered_players_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('RegisteredPlayersScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the registered players in $label', (tester) async {
        await pumpScreen(
          tester,
          const RegisteredPlayersScreen(seasonId: 'season-1'),
          brightness: brightness,
          overrides: [
            registeredPlayersProvider('season-1').overrideWith(
              (ref) async => [registeredPlayer()],
            ),
          ],
        );

        expect(find.text('Registered Players'), findsOneWidget);
        expect(find.text('Ana Diaz'), findsOneWidget);
        expect(find.text('Waitlist'), findsNothing);
      });

      testWidgets('tags a waitlisted player in $label', (tester) async {
        await pumpScreen(
          tester,
          const RegisteredPlayersScreen(seasonId: 'season-1'),
          brightness: brightness,
          overrides: [
            registeredPlayersProvider('season-1').overrideWith(
              (ref) async => [
                registeredPlayer(
                  status: SeasonRegistrationStatus.waitlisted,
                ),
              ],
            ),
          ],
        );

        expect(find.text('Waitlist'), findsOneWidget);
      });

      testWidgets('renders its empty state in $label', (tester) async {
        await pumpScreen(
          tester,
          const RegisteredPlayersScreen(seasonId: 'season-1'),
          brightness: brightness,
          overrides: [
            registeredPlayersProvider('season-1').overrideWith(
              (ref) async => <RegisteredPlayer>[],
            ),
          ],
        );

        expect(find.text('No one has registered yet.'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const RegisteredPlayersScreen(seasonId: 'season-1'),
        settle: false,
        overrides: [
          registeredPlayersProvider('season-1').overrideWith(
            (ref) => pending<List<RegisteredPlayer>>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const RegisteredPlayersScreen(seasonId: 'season-1'),
        overrides: [
          registeredPlayersProvider('season-1').overrideWith(
            (ref) => failing<List<RegisteredPlayer>>(),
          ),
        ],
      );

      expect(find.text("Couldn't load players."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
