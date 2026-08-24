import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/matches/data/matches_repository.dart';
import 'package:drift_tennis/features/matches/data/player_stats.dart';

Map<String, dynamic> _player(String id) => {
  'id': id,
  'firstName': 'Test',
  'lastName': 'Player',
  'photoUrl': null,
  'generalLocation': null,
  'level': 4.0,
  'levelLabel': '4.0',
  'distanceKm': null,
  'connectionState': 'NONE',
};

void main() {
  group('MatchState.fromJson', () {
    test('maps every state the backend can send', () {
      for (final state in MatchState.values) {
        expect(MatchState.fromJson(state.name.toUpperCase()), state);
      }
    });

    test('falls back to proposed on an unrecognised state', () {
      expect(MatchState.fromJson('SOMETHING_NEW'), MatchState.proposed);
    });

    test('every state has a distinct human label', () {
      final labels = MatchState.values.map((s) => s.label).toList();
      expect(labels.toSet(), hasLength(labels.length));
    });
  });

  group('ParticipantStatus.fromJson', () {
    test('maps each status', () {
      expect(ParticipantStatus.fromJson('INVITED'), ParticipantStatus.invited);
      expect(
        ParticipantStatus.fromJson('ACCEPTED'),
        ParticipantStatus.accepted,
      );
      expect(
        ParticipantStatus.fromJson('DECLINED'),
        ParticipantStatus.declined,
      );
    });

    test('treats an unknown status as still invited', () {
      expect(ParticipantStatus.fromJson('???'), ParticipantStatus.invited);
    });
  });

  group('ResultOutcome', () {
    test('round-trips every outcome through the wire value', () {
      for (final outcome in ResultOutcome.values) {
        expect(ResultOutcome.fromJson(outcome.wireValue), outcome);
      }
    });

    test('defaults to a scored result on anything unexpected', () {
      expect(ResultOutcome.fromJson('WHATEVER'), ResultOutcome.score);
    });
  });

  group('SetScore', () {
    test('maps a plain set', () {
      final s = SetScore.fromJson({'sideAGames': 6, 'sideBGames': 3});

      expect(s.sideAGames, 6);
      expect(s.sideBGames, 3);
      expect(s.sideATiebreak, isNull);
    });

    test('maps a tiebreak set', () {
      final s = SetScore.fromJson({
        'sideAGames': 7,
        'sideBGames': 6,
        'sideATiebreak': 7,
        'sideBTiebreak': 5,
      });

      expect(s.sideATiebreak, 7);
      expect(s.sideBTiebreak, 5);
    });

    test('omits absent tiebreaks from toJson rather than sending nulls', () {
      final json = const SetScore(sideAGames: 6, sideBGames: 4).toJson();

      expect(json.containsKey('sideATiebreak'), isFalse);
      expect(json, {'sideAGames': 6, 'sideBGames': 4});
    });

    test('round-trips through toJson', () {
      const original = SetScore(
        sideAGames: 7,
        sideBGames: 6,
        sideATiebreak: 7,
        sideBTiebreak: 3,
      );
      final back = SetScore.fromJson(original.toJson());

      expect(back.sideAGames, original.sideAGames);
      expect(back.sideBTiebreak, original.sideBTiebreak);
    });
  });

  group('TimeOption / TimeProposal', () {
    test('maps a proposal and its options', () {
      final p = TimeProposal.fromJson({
        'id': 'tp1',
        'round': 2,
        'status': 'PENDING',
        'proposedById': 'u1',
        'acceptedOptionId': null,
        'options': [
          {'id': 'o1', 'startsAt': '2026-08-24T09:00:00.000Z'},
          {'id': 'o2', 'startsAt': '2026-08-24T18:00:00.000Z'},
        ],
      });

      expect(p.round, 2);
      expect(p.options, hasLength(2));
      expect(p.options.first.id, 'o1');
      expect(p.acceptedOptionId, isNull);
    });

    test('converts option times to local', () {
      final o = TimeOption.fromJson({
        'id': 'o1',
        'startsAt': '2026-08-24T09:00:00.000Z',
      });

      expect(o.startsAt.isUtc, isFalse);
    });
  });

  group('MatchResult.fromJson', () {
    Map<String, dynamic> json({
      String outcome = 'SCORE',
      Object? sets = const [
        {'sideAGames': 6, 'sideBGames': 3},
      ],
      Object? ratingDeltaA,
      Object? disputedById,
    }) => {
      'status': 'PENDING_CONFIRMATION',
      'outcome': outcome,
      'sets': sets,
      'winningSide': 'A',
      'submittedById': 'u1',
      'disputedById': disputedById,
      'disputantOutcome': null,
      'disputantSets': null,
      'disputantWinningSide': null,
      'ratingDeltaA': ratingDeltaA,
      'ratingDeltaB': null,
    };

    test('maps a submitted score', () {
      final r = MatchResult.fromJson(json());

      expect(r.outcome, ResultOutcome.score);
      expect(r.sets, hasLength(1));
      expect(r.winningSide, 'A');
      expect(r.disputedById, isNull);
    });

    // A walkover has no games to record, so `sets` arrives null.
    test('maps a walkover with no sets', () {
      final r = MatchResult.fromJson(json(outcome: 'WALKOVER', sets: null));

      expect(r.outcome, ResultOutcome.walkover);
      // Null rather than an empty list — the model distinguishes "no games
      // were played" from "a scored result with zero sets recorded".
      expect(r.sets, isNull);
    });

    // Rating deltas only exist once a result settles — before that they are
    // null, and these are the `as num?` casts that break screens silently.
    test('tolerates absent rating deltas before settlement', () {
      final r = MatchResult.fromJson(json());

      expect(r.ratingDeltaA, isNull);
      expect(r.ratingDeltaB, isNull);
    });

    test('accepts an int rating delta', () {
      expect(MatchResult.fromJson(json(ratingDeltaA: 1)).ratingDeltaA, 1.0);
    });

    test('maps a disputed result', () {
      final r = MatchResult.fromJson(json(disputedById: 'u2'));
      expect(r.disputedById, 'u2');
    });
  });

  group('MatchCompetitionContext.fromJson', () {
    test('maps the league and round a fixture belongs to', () {
      final c = MatchCompetitionContext.fromJson({
        'leagueId': 'l1',
        'leagueName': 'Winter Singles',
        'seasonId': 's1',
        'seasonLabel': '2026 Winter',
        'roundId': 'r1',
        'roundIndex': 3,
      });

      expect(c.leagueName, 'Winter Singles');
      expect(c.roundIndex, 3);
    });
  });

  group('DriftMatch.fromJson', () {
    Map<String, dynamic> json({
      String state = 'SCHEDULED',
      Object? confirmedTime = '2026-08-24T09:00:00.000Z',
      Object? result,
      Object? competitionContext,
      Object? latestProposal,
      Object? roundsRemaining = 2,
    }) => {
      'id': 'm1',
      'sport': 'TENNIS',
      'format': 'SINGLES',
      'state': state,
      'createdById': 'u1',
      'confirmedTime': confirmedTime,
      'courtName': 'Riverside Court 1',
      'courtNote': null,
      'roundsRemaining': roundsRemaining,
      'conversationId': 'c1',
      'viewerRole': 'CHALLENGER',
      'viewerStatus': 'ACCEPTED',
      'participants': [
        {
          'userId': 'u1',
          'side': 'A',
          'role': 'CHALLENGER',
          'status': 'ACCEPTED',
          'player': _player('u1'),
        },
        {
          'userId': 'u2',
          'side': 'B',
          'role': 'OPPONENT',
          'status': 'ACCEPTED',
          'player': _player('u2'),
        },
      ],
      'latestProposal': latestProposal,
      'cancelReason': null,
      'result': result,
      'competitionContext': competitionContext,
    };

    test('maps a scheduled match and its participants', () {
      final m = DriftMatch.fromJson(json());

      expect(m.id, 'm1');
      expect(m.state, MatchState.scheduled);
      expect(m.participants, hasLength(2));
      expect(m.viewerStatus, ParticipantStatus.accepted);
      expect(m.confirmedTime!.isUtc, isFalse);
    });

    // A freshly created challenge has no time, no proposal and no result.
    test('maps a proposed match with nothing agreed yet', () {
      final m = DriftMatch.fromJson(
        json(state: 'PROPOSED', confirmedTime: null),
      );

      expect(m.state, MatchState.proposed);
      expect(m.confirmedTime, isNull);
      expect(m.latestProposal, isNull);
      expect(m.result, isNull);
      expect(m.competitionContext, isNull);
    });

    test('defaults roundsRemaining when the API omits it', () {
      final m = DriftMatch.fromJson(json(roundsRemaining: null));
      expect(m.roundsRemaining, 0);
    });

    test('maps a fixture-generated match with competition context', () {
      final m = DriftMatch.fromJson(
        json(
          competitionContext: {
            'leagueId': 'l1',
            'leagueName': 'Winter Singles',
            'seasonId': 's1',
            'seasonLabel': '2026 Winter',
            'roundId': 'r1',
            'roundIndex': 1,
          },
        ),
      );

      expect(m.competitionContext?.leagueName, 'Winter Singles');
    });

    test('maps a completed match carrying a result', () {
      final m = DriftMatch.fromJson(
        json(
          state: 'COMPLETED',
          result: {
            'status': 'CONFIRMED',
            'outcome': 'SCORE',
            'sets': [
              {'sideAGames': 6, 'sideBGames': 3},
            ],
            'winningSide': 'A',
            'submittedById': 'u1',
            'disputedById': null,
            'disputantOutcome': null,
            'disputantSets': null,
            'disputantWinningSide': null,
            'ratingDeltaA': 0.1,
            'ratingDeltaB': -0.1,
          },
        ),
      );

      expect(m.state, MatchState.completed);
      expect(m.result?.ratingDeltaA, 0.1);
    });
  });

  group('PlayerStats.fromJson', () {
    Map<String, dynamic> format({Object? rating = 4.2}) => {
      'rating': rating,
      'ratingLabel': rating == null ? null : '4.2',
      'wins': 3,
      'losses': 1,
    };

    test('maps both formats and recent form', () {
      final s = PlayerStats.fromJson({
        'singles': format(),
        'doubles': format(),
        'recentForm': ['W', 'W', 'L'],
      });

      expect(s.singles.rating, 4.2);
      expect(s.singles.wins, 3);
      expect(s.recentForm, ['W', 'W', 'L']);
    });

    // An unrated player is the normal state before their first result.
    test('tolerates an unrated format', () {
      final s = PlayerStats.fromJson({
        'singles': format(rating: null),
        'doubles': format(rating: null),
        'recentForm': <dynamic>[],
      });

      expect(s.singles.rating, isNull);
      expect(s.singles.ratingLabel, isNull);
      expect(s.recentForm, isEmpty);
    });

    test('accepts an int rating', () {
      final s = PlayerStats.fromJson({
        'singles': format(rating: 4),
        'doubles': format(),
        'recentForm': <dynamic>[],
      });

      expect(s.singles.rating, 4.0);
    });
  });
}
