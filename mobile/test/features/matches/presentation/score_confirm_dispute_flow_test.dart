import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';

import 'package:drift_tennis/features/matches/application/matches_providers.dart';
import 'package:drift_tennis/features/matches/data/matches_repository.dart';
import 'package:drift_tennis/features/matches/presentation/enter_score_screen.dart';
import 'package:drift_tennis/features/matches/presentation/match_detail_screen.dart';
import 'package:drift_tennis/features/users/application/current_user_provider.dart';

import '../../../support/fixtures.dart';
import '../../../support/mocks.dart';
import '../../../support/pump.dart';

/// Layer 3b — the result half of the match loop: submit → confirm, and
/// submit → dispute → the disputant's version. Repository is scripted;
/// every screen on screen is the real one.
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

  bool singleSet(List<SetScore> sets, int a, int b) =>
      sets.length == 1 &&
      sets.first.sideAGames == a &&
      sets.first.sideBGames == b;

  setUpAll(() {
    registerFallbackValue(ResultOutcome.score);
    registerFallbackValue(<SetScore>[]);
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

  group('EnterScoreScreen submit', () {
    testWidgets('sends the entered sets from the match action', (tester) async {
      useTallSurface(tester);
      var submitCalls = 0;
      List<SetScore>? submittedSets;
      when(
        () => repo.submitResult(
          'match-1',
          outcome: any(named: 'outcome'),
          sets: any(named: 'sets'),
        ),
      ).thenAnswer((inv) async {
        submitCalls++;
        submittedSets = inv.namedArguments[#sets] as List<SetScore>?;
        currentMatch = match(
          state: MatchState.scheduled,
          result: matchResult(
            status: 'PENDING_CONFIRMATION',
            submittedById: 'u1',
          ),
        );
        return currentMatch;
      });

      await pumpRouted(
        tester,
        const MatchDetailScreen(matchId: 'match-1'),
        extraRoutes: [
          GoRoute(
            path: '/matches/match-1/enter-score',
            pageBuilder: (_, __) => NoTransitionPage(
              child: EnterScoreScreen(match: match(), viewerId: 'u1'),
            ),
          ),
        ],
        overrides: await overrides(),
      );
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('Enter Result'));
      await tester.tap(find.text('Enter Result'));
      await tester.pumpAndSettle();
      expect(find.text('Enter Result'), findsOneWidget);

      final scoreFields = find.byWidgetPredicate(
        (w) => w is TextField && w.decoration?.hintText == '0',
      );
      await tester.enterText(scoreFields.first, '6');
      await tester.enterText(scoreFields.at(1), '4');

      final submit = find.text('Submit');
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await tester.pumpAndSettle();

      expect(submitCalls, 1);
      expect(singleSet(submittedSets!, 6, 4), isTrue);
    });

    testWidgets('refuses a set with a missing games value', (tester) async {
      useTallSurface(tester);
      var submitCalls = 0;
      when(
        () => repo.submitResult(
          'match-1',
          outcome: any(named: 'outcome'),
          sets: any(named: 'sets'),
        ),
      ).thenAnswer((inv) async {
        submitCalls++;
        return currentMatch;
      });

      await pumpRouted(
        tester,
        const MatchDetailScreen(matchId: 'match-1'),
        extraRoutes: [
          GoRoute(
            path: '/matches/match-1/enter-score',
            pageBuilder: (_, __) => NoTransitionPage(
              child: EnterScoreScreen(match: match(), viewerId: 'u1'),
            ),
          ),
        ],
        overrides: await overrides(),
      );
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('Enter Result'));
      await tester.tap(find.text('Enter Result'));
      await tester.pumpAndSettle();

      final scoreFields = find.byWidgetPredicate(
        (w) => w is TextField && w.decoration?.hintText == '0',
      );
      await tester.enterText(scoreFields.first, '6');

      final submit = find.text('Submit');
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await tester.pump();

      expect(find.text('Enter both games for every set.'), findsOneWidget);
      expect(submitCalls, 0);
    });
  });
  group('MatchDetailScreen result loop', () {
    testWidgets("confirms the opponent's submission", (tester) async {
      useTallSurface(tester);
      currentMatch = match(
        state: MatchState.scheduled,
        result: matchResult(
          status: 'PENDING_CONFIRMATION',
          submittedById: 'u2',
        ),
      );
      var confirmCalls = 0;
      when(() => repo.confirmResult('match-1')).thenAnswer((_) async {
        confirmCalls++;
        currentMatch = match(
          state: MatchState.completed,
          result: matchResult(status: 'CONFIRMED', submittedById: 'u2'),
        );
        return currentMatch;
      });

      await pumpRouted(
        tester,
        const MatchDetailScreen(matchId: 'match-1'),
        overrides: await overrides(),
      );
      await tester.pumpAndSettle();

      expect(find.text('Waiting for them to confirm.'), findsNothing);
      expect(find.text('Confirm'), findsOneWidget);

      await tester.ensureVisible(find.text('Confirm'));
      await tester.tap(find.text('Confirm'));
      await tester.pumpAndSettle();

      expect(confirmCalls, 1);
      // Settled card replaces the action buttons.
      expect(find.text('Confirm'), findsNothing);
    });

    testWidgets('disputes into the Your Version form and lands back DISPUTED', (
      tester,
    ) async {
      useTallSurface(tester);
      currentMatch = match(
        state: MatchState.scheduled,
        result: matchResult(
          status: 'PENDING_CONFIRMATION',
          submittedById: 'u2',
        ),
      );
      var disputeCalls = 0;
      List<SetScore>? disputedSets;
      when(
        () => repo.disputeResult(
          'match-1',
          outcome: any(named: 'outcome'),
          sets: any(named: 'sets'),
        ),
      ).thenAnswer((inv) async {
        disputeCalls++;
        disputedSets = inv.namedArguments[#sets] as List<SetScore>?;
        currentMatch = match(
          state: MatchState.disputed,
          result: matchResult(
            status: 'DISPUTED',
            submittedById: 'u2',
            disputedById: 'u1',
          ),
        );
        return currentMatch;
      });

      await pumpRouted(
        tester,
        const MatchDetailScreen(matchId: 'match-1'),
        extraRoutes: [
          GoRoute(
            path: '/matches/match-1/enter-score',
            pageBuilder: (_, __) => NoTransitionPage(
              child: EnterScoreScreen(
                match: match(),
                viewerId: 'u1',
                mode: EnterScoreMode.dispute,
              ),
            ),
          ),
        ],
        overrides: await overrides(),
      );
      await tester.pumpAndSettle();

      expect(find.text('Dispute'), findsOneWidget);
      await tester.ensureVisible(find.text('Dispute'));
      await tester.tap(find.text('Dispute'));
      await tester.pumpAndSettle();

      expect(find.text('Your Version'), findsOneWidget);
      final scoreFields = find.byWidgetPredicate(
        (w) => w is TextField && w.decoration?.hintText == '0',
      );
      await tester.enterText(scoreFields.first, '3');
      await tester.enterText(scoreFields.at(1), '6');

      final submit = find.text('Submit');
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await tester.pumpAndSettle();

      expect(disputeCalls, 1);
      expect(singleSet(disputedSets!, 3, 6), isTrue);
      // Back on the refreshed detail screen in the disputed state.
      expect(find.text('View dispute'), findsOneWidget);
    });
  });
}
