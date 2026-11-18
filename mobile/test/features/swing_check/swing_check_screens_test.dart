import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/profile/application/profile_providers.dart';
import 'package:drift_tennis/features/swing_check/data/swing_check_repository.dart';
import 'package:drift_tennis/features/swing_check/domain/swing_session.dart';
import 'package:drift_tennis/features/swing_check/presentation/swing_check_results_screen.dart';
import 'package:drift_tennis/features/swing_check/presentation/swing_check_setup_screen.dart';

import '../../support/pump.dart';

class _FakeRepository implements SwingCheckRepository {
  _FakeRepository(this.record, {this.feedbackError});

  SwingSessionRecord record;
  final SwingCheckException? feedbackError;
  int feedbackRequests = 0;

  @override
  Future<SwingSessionRecord> fetch(String id) async => record;

  @override
  Future<SwingSessionRecord> requestFeedback(String id) async {
    feedbackRequests++;
    if (feedbackError != null) throw feedbackError!;
    record = record.copyWith(
      feedback: const CoachFeedback(
        locale: 'en',
        overall: 'Good, consistent session.',
        tips: [CoachTip(metric: 'elbowAngleDeg', text: 'Extend a little more at contact.')],
      ),
    );
    return record;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

SwingSessionRecord _record({int measured = 4, int detected = 5}) =>
    SwingSessionRecord.fromJson({
      'id': 's1',
      'stroke': 'FOREHAND',
      'dominantHand': 'RIGHT',
      'swingsDetected': detected,
      'swingsMeasured': measured,
      'createdAt': '2026-11-10T10:00:00.000Z',
      'summary': measured >= 3
          ? {
              'elbowAngleDeg': {'mean': 152.4, 'spread': 4.1, 'count': measured},
              'contactHeightPct': {'mean': 55.0, 'spread': 2.0, 'count': measured},
            }
          : <String, dynamic>{},
      'metrics': {
        'swings': [
          for (var i = 0; i < measured; i++)
            {
              'index': i,
              'tMs': i * 2000,
              'measured': true,
              'values': {'elbowAngleDeg': 150 + i},
            },
          for (var i = measured; i < detected; i++)
            {'index': i, 'tMs': i * 2000, 'measured': false, 'reason': 'arm_hidden'},
        ],
      },
      'feedback': null,
    });

Future<_FakeRepository> _pumpResults(
  WidgetTester tester,
  SwingSessionRecord record, {
  SwingCheckException? feedbackError,
}) async {
  final repository = _FakeRepository(record, feedbackError: feedbackError);
  await pumpScreen(
    tester,
    const SwingCheckResultsScreen(sessionId: 's1'),
    overrides: [swingCheckRepositoryProvider.overrideWithValue(repository)],
  );
  await tester.pumpAndSettle();
  return repository;
}

void main() {
  group('SwingCheckResultsScreen', () {
    testWidgets('shows averages, coach tips and refused swings with reasons', (tester) async {
      final repository = await _pumpResults(tester, _record());

      expect(find.text('4 of 5 swings measured'), findsOneWidget);
      expect(find.text('Your averages'), findsOneWidget);
      expect(find.text('Arm extension at contact'), findsWidgets);
      expect(repository.feedbackRequests, 1);
      expect(find.text('Good, consistent session.'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Not measured'), 200);
      expect(find.text('Your hitting arm was hidden from the camera.'), findsOneWidget);
    });

    testWidgets('below 3 measured swings: no summary and no coach request', (tester) async {
      final repository = await _pumpResults(tester, _record(measured: 2, detected: 5));

      expect(find.text('Not enough swings measured'), findsOneWidget);
      expect(find.text('Your averages'), findsNothing);
      expect(repository.feedbackRequests, 0);
    });

    testWidgets('coach unavailable keeps the metrics and offers a retry', (tester) async {
      await _pumpResults(
        tester,
        _record(),
        feedbackError: const SwingCheckException(
          SwingCheckFailure.coachUnavailable,
          "Coach feedback isn't available right now. Your measurements are saved.",
        ),
      );

      expect(find.text('Your averages'), findsOneWidget);
      expect(
        find.text("Coach feedback isn't available right now. Your measurements are saved."),
        findsOneWidget,
      );
      expect(find.text('Try again'), findsOneWidget);
    });

    testWidgets('renders in French', (tester) async {
      final repository = _FakeRepository(_record(measured: 2, detected: 3));
      await pumpScreen(
        tester,
        const SwingCheckResultsScreen(sessionId: 's1'),
        locale: const Locale('fr'),
        overrides: [swingCheckRepositoryProvider.overrideWithValue(repository)],
      );
      await tester.pumpAndSettle();
      expect(find.text('Pas assez de coups mesurés'), findsOneWidget);
    });
  });

  group('SwingCheckSetupScreen', () {
    testWidgets('offers forehand and serve, explains backhands, and has a start button', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const SwingCheckSetupScreen(),
        overrides: [
          ownProfileProvider.overrideWith((ref) => Future.error('offline')),
        ],
      );
      await tester.pumpAndSettle();

      expect(find.text('Forehand'), findsOneWidget);
      expect(find.text('Serve'), findsOneWidget);
      expect(find.textContaining("Backhands aren't supported yet"), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Start filming'), 200);
      expect(find.text('Start filming'), findsOneWidget);
    });
  });
}
