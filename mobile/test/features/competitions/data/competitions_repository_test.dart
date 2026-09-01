import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/competitions/data/competitions_repository.dart';

Map<String, dynamic> _player(String id) => {
  'id': id,
  'firstName': 'Test',
  'lastName': id,
  'photoUrl': null,
  'generalLocation': null,
  'level': 4.0,
  'levelLabel': '4.0',
  'distanceKm': null,
  'connectionState': 'NONE',
};

void main() {
  group('SeasonState.fromJson', () {
    test('maps every state', () {
      expect(
        SeasonState.fromJson('REGISTRATION_OPEN'),
        SeasonState.registrationOpen,
      );
      expect(SeasonState.fromJson('SCHEDULED'), SeasonState.scheduled);
      expect(SeasonState.fromJson('ACTIVE'), SeasonState.active);
      expect(SeasonState.fromJson('COMPLETED'), SeasonState.completed);
      expect(SeasonState.fromJson('CANCELLED'), SeasonState.cancelled);
      expect(SeasonState.fromJson('DRAFT'), SeasonState.draft);
    });

    // Draft is the safe default — an unrecognised state must not present a
    // season as open for registration.
    test('defaults to draft on anything unrecognised', () {
      expect(SeasonState.fromJson('???'), SeasonState.draft);
    });
  });

  group('SeasonRegistrationStatus.fromJson', () {
    test('maps each status', () {
      expect(
        SeasonRegistrationStatus.fromJson('WAITLISTED'),
        SeasonRegistrationStatus.waitlisted,
      );
      expect(
        SeasonRegistrationStatus.fromJson('WITHDRAWN'),
        SeasonRegistrationStatus.withdrawn,
      );
      expect(
        SeasonRegistrationStatus.fromJson('ENROLLED'),
        SeasonRegistrationStatus.enrolled,
      );
    });
  });

  group('League.fromJson', () {
    // Since M15 a league is a single competition run — the list endpoint no
    // longer nests seasons, so the model synthesises a single self-reference.
    test('maps a league and a self-referential season', () {
      final l = League.fromJson({
        'id': 'l1',
        'sport': 'TENNIS',
        'name': 'Winter Singles',
        'description': 'A friendly league',
        'rulesText': '<p>Best of 3</p>',
        'startsAt': '2026-09-01T00:00:00.000Z',
        'scoringFormat': 'Best of 3 sets',
        'walkoverRule': 'Forfeit after 15 minutes',
        'unfinishedMatchPolicy': 'Resume within 48h',
        'format': 'SINGLES',
      });

      expect(l.name, 'Winter Singles');
      expect(l.seasons, hasLength(1));
      expect(l.seasons.first.id, 'l1');
      expect(l.seasons.first.label, 'Winter Singles');
      expect(l.startDate, DateTime.utc(2026, 9, 1));
      expect(l.scoringFormat, 'Best of 3 sets');
      expect(l.walkoverRule, 'Forfeit after 15 minutes');
      expect(l.unfinishedMatchPolicy, 'Resume within 48h');
    });

    test('tolerates a league with no description, rules or schedule', () {
      final l = League.fromJson({
        'id': 'l1',
        'sport': 'TENNIS',
        'name': 'New League',
        'description': null,
        'rulesText': null,
        'format': 'SINGLES',
      });

      expect(l.description, isNull);
      expect(l.rulesText, isNull);
      expect(l.startDate, isNull);
      expect(l.scoringFormat, isNull);
    });
  });

  group('SeasonDetail.fromJson', () {
    Map<String, dynamic> json({
      Object? capacity = 16,
      Object? viewerRegistrationStatus,
    }) => {
      'id': 'l1',
      'name': 'Winter Singles',
      'competitionState': 'REGISTRATION_OPEN',
      'registrationOpensAt': '2026-08-01T00:00:00.000Z',
      'registrationClosesAt': '2026-09-01T00:00:00.000Z',
      'startsAt': '2026-09-08T00:00:00.000Z',
      'roundCount': 5,
      'enrolledCount': 7,
      'capacity': capacity,
      'viewerRegistrationStatus': viewerRegistrationStatus,
    };

    test('maps the competition and converts its dates to local', () {
      final s = SeasonDetail.fromJson(json());

      expect(s.leagueName, 'Winter Singles');
      expect(s.label, 'Winter Singles');
      expect(s.state, SeasonState.registrationOpen);
      expect(s.roundCount, 5);
      expect(s.enrolledCount, 7);
      expect(s.startsAt.isUtc, isFalse);
    });

    // An uncapped competition is valid — capacity gates the waitlist, and its
    // absence means "no limit", not zero.
    test('tolerates an uncapped competition', () {
      expect(SeasonDetail.fromJson(json(capacity: null)).capacity, isNull);
    });

    // A draft league can have no dates set yet.
    test('tolerates a competition with no schedule', () {
      final s = SeasonDetail.fromJson({
        'id': 'l1',
        'name': 'Draft League',
        'competitionState': 'DRAFT',
        'roundCount': null,
        'enrolledCount': 0,
        'capacity': null,
        'viewerRegistrationStatus': null,
      });
      expect(s.roundCount, 0);
      expect(s.state, SeasonState.draft);
    });

    test('reports the viewer as unregistered when no status is sent', () {
      expect(SeasonDetail.fromJson(json()).viewerRegistrationStatus, isNull);
    });

    test('surfaces a waitlisted viewer', () {
      final s = SeasonDetail.fromJson(
        json(viewerRegistrationStatus: 'WAITLISTED'),
      );
      expect(s.viewerRegistrationStatus, SeasonRegistrationStatus.waitlisted);
    });
  });

  group('RegisteredPlayer / MySeasonSummary', () {
    test('maps a registered player with their status', () {
      final r = RegisteredPlayer.fromJson({
        'status': 'WAITLISTED',
        'player': _player('u1'),
      });

      expect(r.status, SeasonRegistrationStatus.waitlisted);
      expect(r.player.id, 'u1');
    });

    test('maps a league the viewer is in', () {
      final m = MySeasonSummary.fromJson({
        'leagueId': 'l1',
        'leagueName': 'Winter Singles',
        'name': 'Winter Singles',
        'state': 'ACTIVE',
        'registrationStatus': 'ENROLLED',
      });

      expect(m.seasonId, 'l1');
      expect(m.leagueName, 'Winter Singles');
      expect(m.state, SeasonState.active);
      expect(m.registrationStatus, SeasonRegistrationStatus.enrolled);
    });
  });

  group('Fixture.fromJson', () {
    Map<String, dynamic> json({Object? sideB, bool isBye = false}) => {
      'id': 'f1',
      'sideA': _player('u1'),
      'sideB': sideB,
      'isBye': isBye,
      'match': null,
    };

    test('maps a normal fixture', () {
      final f = Fixture.fromJson(json(sideB: _player('u2')));

      expect(f.sideA.id, 'u1');
      expect(f.sideB?.id, 'u2');
      expect(f.isBye, isFalse);
    });

    // An odd player count produces a bye — one side is genuinely absent,
    // which the round-robin generator relies on.
    test('maps a bye with no opponent', () {
      final f = Fixture.fromJson(json(isBye: true));

      expect(f.isBye, isTrue);
      expect(f.sideB, isNull);
      expect(f.match, isNull);
    });
  });

  group('CompetitionRound.fromJson', () {
    Map<String, dynamic> json({Object? openedAt, Object? closedAt}) => {
      'id': 'r1',
      'leagueId': 'l1',
      'index': 2,
      'deadline': '2026-09-15T00:00:00.000Z',
      'openedAt': openedAt,
      'closedAt': closedAt,
      'fixtures': <dynamic>[
        {
          'id': 'f1',
          'sideA': _player('u1'),
          'sideB': null,
          'isBye': true,
          'match': null,
        },
      ],
    };

    test('maps a round and its fixtures', () {
      final r = CompetitionRound.fromJson(
        json(openedAt: '2026-09-08T00:00:00.000Z'),
      );

      expect(r.index, 2);
      expect(r.fixtures, hasLength(1));
      expect(r.deadline.isUtc, isFalse);
      expect(r.openedAt, isNotNull);
      expect(r.closedAt, isNull);
    });

    // Rounds open lazily on read (derive-on-read progression), so an
    // unopened round legitimately has neither timestamp.
    test('tolerates a round that has not opened yet', () {
      final r = CompetitionRound.fromJson(json());

      expect(r.openedAt, isNull);
      expect(r.closedAt, isNull);
    });
  });

  group('StandingRow.fromJson', () {
    test('maps a ranked row', () {
      final row = StandingRow.fromJson({
        'userId': 'u1',
        'displayName': 'Ana Diaz',
        'rank': 1,
        'points': 9,
        'wins': 3,
        'losses': 0,
        'previousRank': 2,
      });

      expect(row.rank, 1);
      expect(row.points, 9);
      expect(row.previousRank, 2);
    });

    // No previous rank in the first published standings — movement
    // indicators must handle that rather than assuming a change.
    test('tolerates a first-ever standings row', () {
      final row = StandingRow.fromJson({
        'userId': 'u1',
        'displayName': 'Ana Diaz',
        'rank': 1,
        'points': 0,
        'wins': 0,
        'losses': 0,
        'previousRank': null,
      });

      expect(row.previousRank, isNull);
    });
  });
}
