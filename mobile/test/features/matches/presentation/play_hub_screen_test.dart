import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/matches/application/matches_providers.dart';
import 'package:drift_tennis/features/matches/data/matches_repository.dart';
import 'package:drift_tennis/features/matches/data/player_stats.dart';
import 'package:drift_tennis/features/players/application/players_providers.dart';
import 'package:drift_tennis/features/players/data/players_repository.dart';
import 'package:drift_tennis/features/users/application/current_user_provider.dart';
import 'package:drift_tennis/features/matches/presentation/play_hub_screen.dart';
import 'package:drift_tennis/shared/widgets/drift_soft_card.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

/// Play Hub's first tab embeds Player Search, so every test pins all four
/// providers the hub can touch across its segments. The hub itself has no
/// Scaffold of its own (it lives inside the shell tab), so tests supply
/// one; its cards' InkWells need a Material ancestor. Error futures are
/// built lazily so nothing errors before Riverpod attaches a listener.
List<Override> baseOverrides({
  Future<List<PlayerSummary>>? search,
  Future<PlayerStats>? stats,
  Map<MatchSegment, Future<List<DriftMatch>> Function()>? matches,
}) {
  Future<List<DriftMatch>> matchFuture(MatchSegment segment) =>
      matches?[segment]?.call() ?? Future.value(<DriftMatch>[]);

  return [
    playerSearchProvider.overrideWith(
      (ref) => search ?? Future.value(<PlayerSummary>[]),
    ),
    myStatsProvider.overrideWith(
      (ref) => stats ?? Future<PlayerStats>.value(playerStats),
    ),
    for (final segment in MatchSegment.values)
      matchListProvider(segment).overrideWith((ref) => matchFuture(segment)),
    currentUserProvider.overrideWith((ref) async => userProfile()),
  ];
}

void main() {
  Widget screen() => const Scaffold(body: PlayHubScreen());

  group('PlayHubScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('opens on the Find tab in $label', (tester) async {
        await pumpScreen(
          tester,
          screen(),
          brightness: brightness,
          overrides: baseOverrides(search: Future.value([playerSummary()])),
        );

        expect(find.text('Ana Diaz'), findsOneWidget);
      });
    }

    testWidgets('shows the history tab with a stats header', (tester) async {
      await pumpScreen(
        tester,
        screen(),
        overrides: baseOverrides(
          matches: {
            MatchSegment.history: () => Future.value([match()]),
          },
        ),
      );

      await tester.tap(find.text('History'));
      await tester.pumpAndSettle();

      expect(find.text('Your stats'), findsOneWidget);
      // The history tab renders each match as a DriftSoftCard row, not the
      // full DriftMatchCard.
      expect(find.byType(DriftSoftCard), findsWidgets);
    });

    testWidgets("renders an empty challenges tab's empty state", (
      tester,
    ) async {
      await pumpScreen(tester, screen(), overrides: baseOverrides());

      await tester.tap(find.text('Challenges'));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
    });

    testWidgets('survives a failed match list without throwing', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        screen(),
        overrides: baseOverrides(
          matches: {MatchSegment.challenges: failing<List<DriftMatch>>},
        ),
      );

      await tester.tap(find.text('Challenges'));
      await tester.pumpAndSettle();

      expect(find.text("Couldn't load your matches."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
