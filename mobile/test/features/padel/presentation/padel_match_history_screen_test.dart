import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/matches/data/matches_repository.dart';
import 'package:drift_tennis/features/matches/data/player_stats.dart';
import 'package:drift_tennis/features/padel/application/padel_providers.dart';
import 'package:drift_tennis/features/users/application/current_user_provider.dart';
import 'package:drift_tennis/features/padel/presentation/padel_match_history_screen.dart';
import 'package:drift_tennis/shared/widgets/drift_match_card.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('PadelMatchHistoryScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders history with stats in $label', (tester) async {
        await pumpScreen(
          tester,
          const PadelMatchHistoryScreen(),
          brightness: brightness,
          overrides: [
            padelMatchHistoryProvider.overrideWith(
              (ref) => Future.value([match(sport: 'PADEL')]),
            ),
            padelStatsProvider.overrideWith(
              (ref) => Future<PlayerStats>.value(playerStats),
            ),
            currentUserProvider.overrideWith((ref) async => userProfile()),
          ],
        );

        expect(find.text('Padel Match History'), findsOneWidget);
        expect(find.byType(DriftMatchCard), findsOneWidget);
      });

      testWidgets('renders its empty state in $label', (tester) async {
        await pumpScreen(
          tester,
          const PadelMatchHistoryScreen(),
          brightness: brightness,
          overrides: [
            padelMatchHistoryProvider.overrideWith(
              (ref) => Future.value(<DriftMatch>[]),
            ),
            padelStatsProvider.overrideWith(
              (ref) => Future<PlayerStats>.value(playerStats),
            ),
            currentUserProvider.overrideWith((ref) async => userProfile()),
          ],
        );

        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const PadelMatchHistoryScreen(),
        settle: false,
        overrides: [
          padelMatchHistoryProvider.overrideWith(
            (ref) => pending<List<DriftMatch>>(),
          ),
          padelStatsProvider.overrideWith(
            (ref) => Future<PlayerStats>.value(playerStats),
          ),
          currentUserProvider.overrideWith((ref) async => userProfile()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const PadelMatchHistoryScreen(),
        overrides: [
          padelMatchHistoryProvider.overrideWith(
            (ref) => failing<List<DriftMatch>>(),
          ),
          padelStatsProvider.overrideWith(
            (ref) => Future<PlayerStats>.value(playerStats),
          ),
          currentUserProvider.overrideWith((ref) async => userProfile()),
        ],
      );

      expect(
        find.text("Couldn't load your Padel match history."),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });
  });
}
