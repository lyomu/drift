import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/users/application/current_user_provider.dart';

import 'package:drift_tennis/features/competitions/application/competitions_providers.dart';
import 'package:drift_tennis/features/competitions/data/competitions_repository.dart';
import 'package:drift_tennis/features/competitions/presentation/round_detail_screen.dart';
import 'package:drift_tennis/shared/widgets/drift_match_card.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('RoundDetailScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders fixtures in $label', (tester) async {
        await pumpScreen(
          tester,
          const RoundDetailScreen(seasonId: 'season-1', roundId: 'round-1'),
          brightness: brightness,
          overrides: [
            roundProvider(
              (seasonId: 'season-1', roundId: 'round-1'),
            ).overrideWith((ref) async => competitionRound()),
            currentUserProvider.overrideWith((ref) async => userProfile()),
          ],
        );

        expect(find.text('Round 1'), findsOneWidget);
        expect(find.byType(DriftMatchCard), findsOneWidget);
      });

      testWidgets("renders the viewer's bye round in $label", (tester) async {
        await pumpScreen(
          tester,
          const RoundDetailScreen(seasonId: 'season-1', roundId: 'round-1'),
          brightness: brightness,
          overrides: [
            roundProvider(
              (seasonId: 'season-1', roundId: 'round-1'),
            ).overrideWith(
              (ref) async => CompetitionRound(
                id: 'round-1',
                seasonId: 'season-1',
                index: 3,
                deadline: DateTime(2026, 9, 14),
                openedAt: DateTime(2026, 9, 1),
                closedAt: null,
                fixtures: [
                  Fixture(
                    id: 'fx-bye',
                    sideA: playerSummary(id: 'u1', firstName: 'Ana'),
                    sideB: null,
                    isBye: true,
                    match: null,
                  ),
                ],
              ),
            ),
            currentUserProvider.overrideWith((ref) async => userProfile()),
          ],
        );

        expect(find.text('Round 3'), findsOneWidget);
        expect(find.text('Bye this round'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const RoundDetailScreen(seasonId: 'season-1', roundId: 'round-1'),
        settle: false,
        overrides: [
          roundProvider(
            (seasonId: 'season-1', roundId: 'round-1'),
          ).overrideWith((ref) => pending<CompetitionRound>()),
          currentUserProvider.overrideWith((ref) async => userProfile()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const RoundDetailScreen(seasonId: 'season-1', roundId: 'round-1'),
        overrides: [
          roundProvider(
            (seasonId: 'season-1', roundId: 'round-1'),
          ).overrideWith((ref) => failing<CompetitionRound>()),
          currentUserProvider.overrideWith((ref) async => userProfile()),
        ],
      );

      expect(find.text('Round not available.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
