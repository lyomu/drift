import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/competitions/application/competitions_providers.dart';
import 'package:drift_tennis/features/competitions/data/competitions_repository.dart';
import 'package:drift_tennis/features/competitions/presentation/season_detail_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('SeasonDetailScreen', () {
    Future<List<Override>> overrides(
      SeasonDetail season,
      CompetitionRound? round,
    ) async => [
      seasonDetailProvider('season-1').overrideWith((ref) async => season),
      currentRoundProvider('season-1').overrideWith((ref) async => round),
    ];

    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('offers registration while open in $label', (tester) async {
        await pumpScreen(
          tester,
          const SeasonDetailScreen(seasonId: 'season-1'),
          brightness: brightness,
          overrides: await overrides(seasonDetail(), null),
        );

        expect(find.text('Richmond Singles'), findsOneWidget);
        // Both the state badge and the registration card carry the label.
        expect(find.text('Registration open'), findsNWidgets(2));
        expect(find.text('Register'), findsOneWidget);
      });

      testWidgets('explains a closed season in $label', (tester) async {
        await pumpScreen(
          tester,
          const SeasonDetailScreen(seasonId: 'season-1'),
          brightness: brightness,
          overrides: await overrides(
            seasonDetail(state: SeasonState.active),
            null,
          ),
        );

        expect(
          find.text('Registration is closed for this league.'),
          findsOneWidget,
        );
      });
    }

    testWidgets("shows a registered viewer they're in", (tester) async {
      await pumpScreen(
        tester,
        const SeasonDetailScreen(seasonId: 'season-1'),
        overrides: await overrides(
          seasonDetail(
            state: SeasonState.active,
            viewerRegistrationStatus: SeasonRegistrationStatus.enrolled,
          ),
          null,
        ),
      );

      expect(find.text("You're registered"), findsOneWidget);
    });

    testWidgets('shows a waitlisted viewer their status', (tester) async {
      await pumpScreen(
        tester,
        const SeasonDetailScreen(seasonId: 'season-1'),
        overrides: await overrides(
          seasonDetail(
            viewerRegistrationStatus: SeasonRegistrationStatus.waitlisted,
          ),
          null,
        ),
      );

      expect(find.text('On the waitlist'), findsOneWidget);
      expect(find.text('Leave waitlist'), findsOneWidget);
    });

    testWidgets('links to the current round once one exists', (tester) async {
      await pumpScreen(
        tester,
        const SeasonDetailScreen(seasonId: 'season-1'),
        overrides: await overrides(
          seasonDetail(state: SeasonState.active),
          competitionRound(),
        ),
      );

      expect(find.text('Current Round'), findsOneWidget);
    });

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const SeasonDetailScreen(seasonId: 'season-1'),
        settle: false,
        overrides: [
          seasonDetailProvider(
            'season-1',
          ).overrideWith((ref) => pending<SeasonDetail>()),
          currentRoundProvider(
            'season-1',
          ).overrideWith((ref) => pending<CompetitionRound?>()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const SeasonDetailScreen(seasonId: 'season-1'),
        overrides: [
          seasonDetailProvider(
            'season-1',
          ).overrideWith((ref) => failing<SeasonDetail>()),
          currentRoundProvider(
            'season-1',
          ).overrideWith((ref) => failing<CompetitionRound?>()),
        ],
      );

      expect(find.text('League not available.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
