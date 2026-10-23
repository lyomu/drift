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

void main() {
  DriftMatch outgoingChallenge({
    ParticipantStatus opponentStatus = ParticipantStatus.invited,
    MatchState state = MatchState.proposed,
  }) => match(
    state: state,
    participants: [
      participant(userId: 'u1'),
      participant(userId: 'u2', side: 'B', status: opponentStatus),
    ],
  );

  test('only the sender can undo an unanswered challenge', () {
    final unanswered = outgoingChallenge();
    expect(unanswered.canWithdraw('u1'), isTrue);
    expect(unanswered.canWithdraw('u2'), isFalse);
    expect(unanswered.canWithdraw(''), isFalse);
    expect(
      outgoingChallenge(
        opponentStatus: ParticipantStatus.accepted,
      ).canWithdraw('u1'),
      isFalse,
    );
    expect(
      outgoingChallenge(state: MatchState.scheduled).canWithdraw('u1'),
      isFalse,
    );
  });

  testWidgets('confirmation withdraws the challenge and refreshes detail', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    final repo = MockMatchesRepository();
    var currentMatch = outgoingChallenge();
    when(() => repo.withdraw('match-1')).thenAnswer((_) async {
      currentMatch = outgoingChallenge(state: MatchState.cancelled);
      return currentMatch;
    });
    final overrides = <Override>[
      matchDetailProvider('match-1').overrideWith((ref) async => currentMatch),
      currentUserProvider.overrideWith((ref) async => userProfile()),
      matchesRepositoryProvider.overrideWithValue(repo),
    ];

    await pumpRouted(
      tester,
      const MatchDetailScreen(matchId: 'match-1'),
      overrides: overrides,
    );
    await tester.pumpAndSettle();

    expect(find.text('Undo challenge'), findsOneWidget);
    expect(find.text('Cancel match'), findsNothing);
    await tester.ensureVisible(find.text('Undo challenge'));
    await tester.tap(find.text('Undo challenge'));
    await tester.pumpAndSettle();
    expect(find.text('Undo this challenge?'), findsOneWidget);

    await tester.tap(find.text('Keep challenge'));
    await tester.pumpAndSettle();
    verifyNever(() => repo.withdraw(any()));

    await tester.tap(find.text('Undo challenge'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Undo challenge').last);
    await tester.pumpAndSettle();

    verify(() => repo.withdraw('match-1')).called(1);
    expect(find.text('Undo challenge'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
