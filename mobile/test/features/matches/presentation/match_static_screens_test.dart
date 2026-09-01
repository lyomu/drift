import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/matches/presentation/dispute_detail_screen.dart';
import 'package:drift_tennis/features/matches/presentation/enter_score_screen.dart';
import 'package:drift_tennis/features/matches/presentation/match_reflection_screen.dart';
import 'package:drift_tennis/features/matches/presentation/ratings_stats_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  final screens = <String, Widget Function()>{
    'EnterScoreScreen': () => EnterScoreScreen(match: match(), viewerId: 'u1'),
    'MatchReflectionScreen': () =>
        const MatchReflectionScreen(matchId: 'match-1'),
    'DisputeDetailScreen': () => DisputeDetailScreen(
      match: match(result: matchResult(disputedById: 'u1')),
      viewerId: 'u2',
    ),
    'RatingsStatsScreen': () =>
        RatingsStatsScreen(title: 'Your Stats', stats: playerStats),
  };

  for (final entry in screens.entries) {
    group(entry.key, () {
      for (final brightness in Brightness.values) {
        testWidgets('renders without throwing in ${brightness.name}', (
          tester,
        ) async {
          await pumpScreen(
            tester,
            Scaffold(body: entry.value()),
            brightness: brightness,
          );

          expect(tester.takeException(), isNull);
        });
      }
    });
  }
}
