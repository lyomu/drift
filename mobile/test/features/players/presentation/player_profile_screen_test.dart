import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:drift_tennis/features/connections/data/connections_repository.dart';
import 'package:drift_tennis/features/players/application/players_providers.dart';
import 'package:drift_tennis/features/players/data/players_repository.dart';
import 'package:drift_tennis/features/players/presentation/player_profile_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/mocks.dart';
import '../../../support/pump.dart';

void main() {
  group('PlayerProfileScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets("renders another player's profile in $label", (tester) async {
        await pumpScreen(
          tester,
          const PlayerProfileScreen(playerId: 'u2'),
          brightness: brightness,
          overrides: [
            playerProfileProvider(
              'u2',
            ).overrideWith((ref) => Future.value(playerProfile())),
          ],
        );

        expect(find.text('Player'), findsOneWidget);
        expect(find.text('Ana Diaz'), findsOneWidget);
      });

      testWidgets('hides gated fields from a non-connection in $label', (
        tester,
      ) async {
        await pumpScreen(
          tester,
          const PlayerProfileScreen(playerId: 'u2'),
          brightness: brightness,
          overrides: [
            playerProfileProvider('u2').overrideWith(
              (ref) => Future.value(playerProfile(skillBreakdown: null)),
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
          playerProfileProvider(
            'u2',
          ).overrideWith((ref) => pending<PlayerProfile>()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const PlayerProfileScreen(playerId: 'u2'),
        overrides: [
          playerProfileProvider(
            'u2',
          ).overrideWith((ref) => failing<PlayerProfile>()),
        ],
      );

      expect(
        find.text('Could not load this player right now.'),
        findsOneWidget,
      );
      expect(find.text('Try again'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('shows unavailable only for a real 404', (tester) async {
      final options = RequestOptions(path: '/players/u2');
      await pumpScreen(
        tester,
        const PlayerProfileScreen(playerId: 'u2'),
        overrides: [
          playerProfileProvider('u2').overrideWith(
            (ref) => Future.error(
              DioException(
                requestOptions: options,
                response: Response(requestOptions: options, statusCode: 404),
              ),
            ),
          ),
        ],
      );
      expect(find.text('Player not available.'), findsOneWidget);
      expect(find.text('Try again'), findsNothing);
    });

    testWidgets('lets the sender cancel an outgoing connection request', (
      tester,
    ) async {
      final connections = MockConnectionsRepository();
      when(() => connections.remove('connection-1')).thenAnswer((_) async {});
      await pumpScreen(
        tester,
        const PlayerProfileScreen(playerId: 'u2'),
        overrides: [
          playerProfileProvider('u2').overrideWith(
            (ref) => Future.value(
              playerProfile(
                connectionState: PlayerConnectionState.pendingOutgoing,
                connectionId: 'connection-1',
              ),
            ),
          ),
          connectionsRepositoryProvider.overrideWithValue(connections),
        ],
      );

      expect(find.text('Request sent · Cancel'), findsOneWidget);
      await tester.tap(find.text('Request sent · Cancel'));
      await tester.pumpAndSettle();

      verify(() => connections.remove('connection-1')).called(1);
    });
  });
}
