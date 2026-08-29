import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/matches/application/matches_providers.dart';
import 'package:drift_tennis/features/matches/data/matches_repository.dart';
import 'package:drift_tennis/features/matches/presentation/match_detail_screen.dart';
import 'package:drift_tennis/features/users/application/current_user_provider.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('MatchDetailScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders a scheduled match in $label', (tester) async {
        await pumpScreen(
          tester,
          const MatchDetailScreen(matchId: 'match-1'),
          brightness: brightness,
          overrides: [
            matchDetailProvider('match-1').overrideWith(
              (ref) async => match(),
            ),
            currentUserProvider.overrideWith((ref) async => userProfile()),
          ],
        );

        expect(find.text('Match'), findsOneWidget);
        expect(find.text('Players'), findsOneWidget);
        // Rendered both in the header block and the court section.
        expect(find.text('Riverside Court 2'), findsWidgets);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const MatchDetailScreen(matchId: 'match-1'),
        settle: false,
        overrides: [
          matchDetailProvider('match-1').overrideWith(
            (ref) => pending<DriftMatch>(),
          ),
          currentUserProvider.overrideWith((ref) async => userProfile()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const MatchDetailScreen(matchId: 'match-1'),
        overrides: [
          matchDetailProvider('match-1').overrideWith(
            (ref) => failing<DriftMatch>(),
          ),
          currentUserProvider.overrideWith((ref) async => userProfile()),
        ],
      );

      // Wave 4.2 replaced the dead-end "Match not available." text with a
      // DriftErrorRetry block (message + Retry button) — see
      // HOME-AND-POLISH-PLAN.md.
      expect(find.text("Couldn't load this match."), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
