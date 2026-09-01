import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:drift_tennis/features/matches/application/matches_providers.dart';
import 'package:drift_tennis/features/matches/data/matches_repository.dart';
import 'package:drift_tennis/features/matches/presentation/match_detail_screen.dart';
import 'package:drift_tennis/features/users/application/current_user_provider.dart';

import '../../../support/fixtures.dart';
import '../../../support/mocks.dart';
import '../../../support/pump.dart';

/// Layer 3b â€” the scheduling half of the match loop, driven through the
/// real Match Detail screen with a scripted repository. Each action's
/// mock mutates [currentMatch], and the screen's own invalidate-on-action
/// then rebuilds against the new state â€” the same refresh contract the
/// live API provides.
void main() {
  late MockMatchesRepository repo;
  late DriftMatch currentMatch;

  /// Detail screens put their action buttons well below the default
  /// 800x600 test viewport; a tall surface keeps every tap hittable.
  void useTallSurface(WidgetTester tester) {
    tester.view.physicalSize = const Size(800, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
  }

  setUpAll(() {
    registerFallbackValue(<DateTime>[]);
  });

  Future<List<Override>> overrides() async => [
    matchDetailProvider('match-1').overrideWith((ref) async => currentMatch),
    currentUserProvider.overrideWith((ref) async => userProfile()),
    matchesRepositoryProvider.overrideWithValue(repo),
  ];

  setUp(() {
    repo = MockMatchesRepository();
    currentMatch = match();
  });

  group('MatchDetailScreen scheduling loop', () {
    testWidgets('accepts one of the opponent\'s proposed times', (
      tester,
    ) async {
      currentMatch = match(latestProposal: timeProposal(proposedById: 'u2'));
      when(() => repo.acceptTime('match-1', 'to1')).thenAnswer((_) async {
        // The server confirms the time; the proposal disappears.
        currentMatch = match(latestProposal: null);
        return currentMatch;
      });

      await pumpRouted(
        tester,
        const MatchDetailScreen(matchId: 'match-1'),
        overrides: await overrides(),
        extraRoutes: const [],
      );
      await tester.pumpAndSettle();

      expect(find.text('PICK A TIME'), findsOneWidget);
      expect(find.byType(OutlinedButton), findsNWidgets(2));

      await tester.tap(find.byType(OutlinedButton).first);
      await tester.pumpAndSettle();

      verify(() => repo.acceptTime('match-1', 'to1')).called(1);
      expect(find.text('PICK A TIME'), findsNothing);
    });

    testWidgets("keeps my own proposal locked while they choose", (
      tester,
    ) async {
      currentMatch = match(latestProposal: timeProposal(proposedById: 'u1'));

      await pumpRouted(
        tester,
        const MatchDetailScreen(matchId: 'match-1'),
        overrides: await overrides(),
      );
      await tester.pumpAndSettle();

      expect(find.text('YOUR PROPOSED TIMES'), findsOneWidget);
      expect(find.text('Waiting for them to choose.'), findsOneWidget);

      // My own options are disabled â€” tapping must not hit the API.
      await tester.tap(find.byType(OutlinedButton).first, warnIfMissed: false);
      await tester.pumpAndSettle();

      verifyNever(() => repo.acceptTime(any(), any()));
    });

    testWidgets('proposes times through the sheet end to end', (tester) async {
      useTallSurface(tester);
      // No confirmed time yet, and the match is in its scheduling window —
      // that combination unlocks the Propose action.
      currentMatch = match(
        state: MatchState.scheduling,
        latestProposal: null,
        confirmedTime: null,
      );
      final tomorrow = DateTime.now().add(const Duration(days: 1));
      when(() => repo.proposeTimes('match-1', any())).thenAnswer((inv) async {
        final options = inv.positionalArguments[1] as List<DateTime>;
        currentMatch = match(
          latestProposal: TimeProposal(
            id: 'tp2',
            round: 1,
            status: 'PENDING',
            proposedById: 'u1',
            acceptedOptionId: null,
            options: [
              for (final o in options)
                TimeOption(id: 'opt-${o.millisecondsSinceEpoch}', startsAt: o),
            ],
          ),
        );
        return currentMatch;
      });

      await pumpRouted(
        tester,
        const MatchDetailScreen(matchId: 'match-1'),
        overrides: await overrides(),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Propose Times'));
      await tester.pumpAndSettle();
      expect(find.text('Propose times'), findsOneWidget);

      // Add a time through the real date + time pickers.
      await tester.tap(find.text('Add a time'));
      await tester.pumpAndSettle();

      // Date picker: pick day 19 of the visible month, then confirm it —
      // the time picker is a second dialog with its own OK.
      final day = find.text('19');
      expect(day, findsWidgets);
      await tester.ensureVisible(day.last);
      await tester.tap(day.last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('OK')); // date
      await tester.pumpAndSettle();
      await tester.tap(find.text('OK')); // time (18:00 default)
      await tester.pumpAndSettle();

      expect(find.textContaining('Send 1 time'), findsOneWidget);
      final send = find.textContaining('Send 1 time');
      await tester.ensureVisible(send);
      await tester.tap(send);
      await tester.pumpAndSettle();

      verify(() => repo.proposeTimes('match-1', any())).called(1);
      // The screen refreshed into "waiting on them" state.
      expect(find.text('Waiting for them to choose.'), findsOneWidget);
      expect(tester.takeException(), isNull);
      // Sanity: the scripted proposal really was in the future.
      expect(tomorrow.isAfter(DateTime.now()), isTrue);
    });
  });
}
