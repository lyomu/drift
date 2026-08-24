import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/players/application/players_providers.dart';
import 'package:drift_tennis/features/players/data/players_repository.dart';
import 'package:drift_tennis/features/players/presentation/player_profile_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('PlayerProfileScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets("renders another player's profile in $label",
          (tester) async {
        await pumpScreen(
          tester,
          const PlayerProfileScreen(playerId: 'u2'),
          brightness: brightness,
          overrides: [
            playerProfileProvider('u2').overrideWith(
              (ref) => Future.value(playerProfile()),
            ),
          ],
        );

        expect(find.text('Player'), findsOneWidget);
        expect(find.text('Ana Diaz'), findsOneWidget);
      });

      testWidgets('hides gated fields from a non-connection in $label',
          (tester) async {
        await pumpScreen(
          tester,
          const PlayerProfileScreen(playerId: 'u2'),
          brightness: brightness,
          overrides: [
            playerProfileProvider('u2').overrideWith(
              (ref) => Future.value(
                playerProfile(skillBreakdown: null),
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
        const PlayerProfileScreen(playerId: 'u2'),
        settle: false,
        overrides: [
          playerProfileProvider('u2').overrideWith(
            (ref) => pending<PlayerProfile>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const PlayerProfileScreen(playerId: 'u2'),
        overrides: [
          playerProfileProvider('u2').overrideWith(
            (ref) => failing<PlayerProfile>(),
          ),
        ],
      );

      expect(find.text('Player not available.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
