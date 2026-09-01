import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/players/data/players_repository.dart';

void main() {
  group('PlayerConnectionState.fromJson', () {
    test('maps each state', () {
      expect(
        PlayerConnectionState.fromJson('PENDING_OUTGOING'),
        PlayerConnectionState.pendingOutgoing,
      );
      expect(
        PlayerConnectionState.fromJson('PENDING_INCOMING'),
        PlayerConnectionState.pendingIncoming,
      );
      expect(
        PlayerConnectionState.fromJson('CONNECTED'),
        PlayerConnectionState.connected,
      );
      expect(
        PlayerConnectionState.fromJson('NONE'),
        PlayerConnectionState.none,
      );
    });

    // Direction matters: outgoing shows "Requested", incoming shows
    // Accept/Decline. Collapsing them would offer the wrong action.
    test('keeps the two pending directions distinct', () {
      expect(
        PlayerConnectionState.fromJson('PENDING_OUTGOING'),
        isNot(PlayerConnectionState.fromJson('PENDING_INCOMING')),
      );
    });

    test('defaults to none on anything unrecognised', () {
      expect(PlayerConnectionState.fromJson('???'), PlayerConnectionState.none);
    });
  });

  group('PlayerSummary.fromJson', () {
    Map<String, dynamic> json({
      Object? level = 4.25,
      Object? firstName = 'Ana',
      Object? availabilitySummary = 'Weekend mornings',
    }) => {
      'id': 'u1',
      'firstName': firstName,
      'lastName': 'Diaz',
      'photoUrl': null,
      'level': level,
      'levelLabel': level == null ? null : '4.25',
      'generalLocation': 'London',
      'distanceBand': 'Within 5 km',
      'preferredClubName': 'Riverside Tennis',
      'formatPreference': 'SINGLES',
      'stylePreference': 'SOCIAL',
      'availabilitySummary': availabilitySummary,
    };

    test('maps every field', () {
      final p = PlayerSummary.fromJson(json());

      expect(p.id, 'u1');
      expect(p.firstName, 'Ana');
      expect(p.level, 4.25);
      expect(p.distanceBand, 'Within 5 km');
      expect(p.formatPreference, 'SINGLES');
    });

    // A player who hasn't finished onboarding has no level yet.
    test('tolerates an unrated player', () {
      final p = PlayerSummary.fromJson(json(level: null));

      expect(p.level, isNull);
      expect(p.levelLabel, isNull);
    });

    test('accepts an int level', () {
      expect(PlayerSummary.fromJson(json(level: 4)).level, 4.0);
    });

    test('tolerates a player with no name set', () {
      expect(PlayerSummary.fromJson(json(firstName: null)).firstName, isNull);
    });

    // Availability is privacy-gated server-side — a non-connection simply
    // gets null rather than an error.
    test('tolerates availability hidden by privacy settings', () {
      final p = PlayerSummary.fromJson(json(availabilitySummary: null));
      expect(p.availabilitySummary, isNull);
    });
  });

  group('AvailabilitySlot.fromJson', () {
    test('maps day and block', () {
      final s = AvailabilitySlot.fromJson({
        'dayOfWeek': 6,
        'timeBlock': 'MORNING',
      });

      expect(s.dayOfWeek, 6);
      expect(s.timeBlock, 'MORNING');
    });
  });

  group('PlayerProfile.fromJson', () {
    Map<String, dynamic> json({
      Object? skillBreakdown,
      Object? availabilitySlots,
      String connectionState = 'NONE',
    }) => {
      'id': 'u1',
      'firstName': 'Ana',
      'lastName': 'Diaz',
      'photoUrl': null,
      'level': 4.0,
      'levelLabel': '4.0',
      'generalLocation': 'London',
      'distanceBand': null,
      'preferredClubName': null,
      'formatPreference': null,
      'stylePreference': null,
      'availabilitySummary': null,
      'dominantHand': 'RIGHT',
      'connectionState': connectionState,
      'skillBreakdown': skillBreakdown,
      'availabilitySlots': availabilitySlots,
      'stats': {
        'singles': {
          'rating': 4.0,
          'ratingLabel': '4.0',
          'wins': 2,
          'losses': 1,
        },
        'doubles': {
          'rating': null,
          'ratingLabel': null,
          'wins': 0,
          'losses': 0,
        },
        'recentForm': <dynamic>['W'],
      },
    };

    test('flattens the summary and maps profile fields', () {
      final p = PlayerProfile.fromJson(json(connectionState: 'CONNECTED'));

      expect(p.summary.id, 'u1');
      expect(p.dominantHand, 'RIGHT');
      expect(p.connectionState, PlayerConnectionState.connected);
      expect(p.stats.singles.wins, 2);
    });

    // Both are privacy-gated: a non-connection gets null, not an empty
    // object. The radar and availability sections must hide, not render
    // zeroes as if the player scored nothing.
    test('leaves skill breakdown null when privacy hides it', () {
      expect(PlayerProfile.fromJson(json()).skillBreakdown, isNull);
    });

    test('leaves availability null when privacy hides it', () {
      expect(PlayerProfile.fromJson(json()).availabilitySlots, isNull);
    });

    test('maps a visible skill breakdown', () {
      final p = PlayerProfile.fromJson(
        json(skillBreakdown: {'SERVE': 4, 'FOREHAND': 5}),
      );

      expect(p.skillBreakdown, isNotNull);
      expect(p.skillBreakdown!['SERVE'], 4);
    });

    test('maps visible availability slots', () {
      final p = PlayerProfile.fromJson(
        json(
          availabilitySlots: [
            {'dayOfWeek': 6, 'timeBlock': 'MORNING'},
          ],
        ),
      );

      expect(p.availabilitySlots, hasLength(1));
      expect(p.availabilitySlots!.first.dayOfWeek, 6);
    });
  });
}
