import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/padel/data/padel_repository.dart';

void main() {
  group('PadelSide.fromJson', () {
    test('round-trips every side through the wire value', () {
      for (final side in PadelSide.values) {
        expect(PadelSide.fromJson(side.wireValue), side);
      }
    });

    // Preferred side is optional — Padel is a secondary sport and the
    // preference screen can be skipped, so null is a real answer rather
    // than a missing one to default away.
    test('returns null when no side is set', () {
      expect(PadelSide.fromJson(null), isNull);
    });

    test('returns null on an unrecognised side', () {
      expect(PadelSide.fromJson('MIDDLE'), isNull);
    });

    test('every side has a distinct label', () {
      final labels = PadelSide.values.map((s) => s.label).toList();
      expect(labels.toSet(), hasLength(labels.length));
    });
  });

  group('PadelProfile.fromJson', () {
    Map<String, dynamic> json({
      Object? singlesRating,
      Object? systemSuggestedLevel = 3.0,
      Object? skillBreakdown,
      Object? preferredSide = 'LEFT',
      List<dynamic> goals = const ['improve_technique'],
    }) => {
      'id': 'pp1',
      'dominantHand': 'RIGHT',
      'singlesRating': singlesRating,
      'doublesRating': null,
      'systemSuggestedLevel': systemSuggestedLevel,
      'levelLabel': systemSuggestedLevel == null ? null : '3.0',
      'skillBreakdown': skillBreakdown,
      'preferredSide': preferredSide,
      'partnerPreference': 'REGULAR',
      'goals': goals,
    };

    test('maps a completed Padel profile', () {
      final p = PadelProfile.fromJson(
        json(skillBreakdown: {'VOLLEY': 4, 'BANDEJA': 2}),
      );

      expect(p.id, 'pp1');
      expect(p.systemSuggestedLevel, 3.0);
      expect(p.preferredSide, PadelSide.left);
      expect(p.partnerPreference, 'REGULAR');
      expect(p.skillBreakdown!['BANDEJA'], 2);
      expect(p.goals, ['improve_technique']);
    });

    // Immediately after "+ Add Padel" the profile exists but nothing has
    // been assessed — every rating is legitimately absent.
    test('maps a freshly added profile with nothing assessed', () {
      final p = PadelProfile.fromJson(
        json(systemSuggestedLevel: null, preferredSide: null, goals: const []),
      );

      expect(p.systemSuggestedLevel, isNull);
      expect(p.levelLabel, isNull);
      expect(p.singlesRating, isNull);
      expect(p.doublesRating, isNull);
      expect(p.preferredSide, isNull);
      expect(p.skillBreakdown, isNull);
      expect(p.goals, isEmpty);
    });

    test('accepts whole-number ratings', () {
      final p = PadelProfile.fromJson(
        json(singlesRating: 3, systemSuggestedLevel: 4),
      );

      expect(p.singlesRating, 3.0);
      expect(p.systemSuggestedLevel, 4.0);
    });
  });
}
