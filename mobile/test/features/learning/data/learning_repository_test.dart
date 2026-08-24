import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/learning/data/learning_repository.dart';

Map<String, dynamic> _content({String id = 'c1'}) => {
  'id': id,
  'type': 'DRILL',
  'sport': 'TENNIS',
  'targetSkill': 'SERVE',
  'branch': null,
  'title': 'Serve placement ladder',
  'summary': 'Ten minutes of targets.',
  'durationMinutes': 10,
};

void main() {
  group('ContentSummary / ContentDetail', () {
    test('maps a piece of content', () {
      final c = ContentSummary.fromJson(_content());

      expect(c.type, 'DRILL');
      expect(c.targetSkill, 'SERVE');
      expect(c.durationMinutes, 10);
    });

    test('tolerates content with no summary or duration', () {
      final c = ContentSummary.fromJson({
        ..._content(),
        'summary': null,
        'durationMinutes': null,
      });

      expect(c.summary, isNull);
      expect(c.durationMinutes, isNull);
    });

    test('maps a lesson with body text and no video', () {
      final d = ContentDetail.fromJson({
        ..._content(),
        'bodyText': 'Stand side-on…',
        'videoUrl': null,
        'steps': <dynamic>[],
      });

      expect(d.summary.title, 'Serve placement ladder');
      expect(d.bodyText, isNotNull);
      expect(d.videoUrl, isNull);
      expect(d.steps, isEmpty);
    });

    test('maps a training plan carrying its steps', () {
      final d = ContentDetail.fromJson({
        ..._content(id: 'plan-1'),
        'type': 'TRAINING_PLAN',
        'bodyText': null,
        'videoUrl': null,
        'steps': <dynamic>[_content(id: 'step-1'), _content(id: 'step-2')],
      });

      expect(d.steps, hasLength(2));
      expect(d.steps.first.id, 'step-1');
    });
  });

  group('SkillScoreEntry', () {
    test('maps a scored skill', () {
      final s = SkillScoreEntry.fromJson({
        'skill': 'SERVE',
        'score': 3.5,
        'maturity': 'DEVELOPING',
      });

      expect(s.skill, 'SERVE');
      expect(s.score, 3.5);
    });

    // A skill with no assessment answer and no logged practice has no
    // score — the radar must plot a gap, not a zero.
    test('tolerates a skill with no score yet', () {
      final s = SkillScoreEntry.fromJson({
        'skill': 'NET_PLAY',
        'score': null,
        'maturity': null,
      });

      expect(s.score, isNull);
      expect(s.maturity, isNull);
    });

    test('accepts a whole-number score', () {
      final s = SkillScoreEntry.fromJson({
        'skill': 'SERVE',
        'score': 4,
        'maturity': 'ESTABLISHED',
      });

      expect(s.score, 4.0);
    });
  });

  group('SkillProfile.fromJson', () {
    test('maps skills, weakest and recommendations', () {
      final p = SkillProfile.fromJson({
        'skills': <dynamic>[
          {'skill': 'SERVE', 'score': 3.0, 'maturity': 'DEVELOPING'},
        ],
        'weakestSkill': 'SERVE',
        'recommendations': <dynamic>[_content()],
      });

      expect(p.skills, hasLength(1));
      expect(p.weakestSkill, 'SERVE');
      expect(p.recommendations, hasLength(1));
    });

    // Before any assessment there is no weakest skill to name.
    test('tolerates a profile with nothing scored', () {
      final p = SkillProfile.fromJson({
        'skills': <dynamic>[],
        'weakestSkill': null,
        'recommendations': <dynamic>[],
      });

      expect(p.weakestSkill, isNull);
      expect(p.skills, isEmpty);
    });
  });

  group('PracticeSessionEntry.fromJson', () {
    Map<String, dynamic> json({Object? drill, Object? notes}) => {
      'id': 'ps1',
      'occurredAt': '2026-08-23T09:00:00.000Z',
      'durationMinutes': 45,
      'skillFocus': 'SERVE',
      'notes': notes,
      'perceivedPerformance': 4,
      'drill': drill,
    };

    test('maps a logged session', () {
      final s = PracticeSessionEntry.fromJson(json(notes: 'Felt good'));

      expect(s.durationMinutes, 45);
      expect(s.perceivedPerformance, 4);
      expect(s.notes, 'Felt good');
      expect(s.occurredAt.isUtc, isFalse);
    });

    // Practice logging is deliberately lightweight — a session need not be
    // tied to a drill or carry notes.
    test('tolerates a freeform session with no drill or notes', () {
      final s = PracticeSessionEntry.fromJson(json());

      expect(s.drill, isNull);
      expect(s.notes, isNull);
    });

    test('maps a session linked to a drill', () {
      final s = PracticeSessionEntry.fromJson(json(drill: _content()));
      expect(s.drill?.id, 'c1');
    });
  });

  group('SkillDetail.fromJson', () {
    test('maps the blended score and its inputs', () {
      final d = SkillDetail.fromJson({
        'skill': 'SERVE',
        'score': 3.8,
        'maturity': 'DEVELOPING',
        'assessmentBaseline': 3.0,
        'practiceSessions': <dynamic>[],
        'recommendations': <dynamic>[_content()],
      });

      expect(d.score, 3.8);
      expect(d.assessmentBaseline, 3.0);
      expect(d.recommendations, hasLength(1));
    });

    test('tolerates a skill with neither score nor baseline', () {
      final d = SkillDetail.fromJson({
        'skill': 'NET_PLAY',
        'score': null,
        'maturity': null,
        'assessmentBaseline': null,
        'practiceSessions': <dynamic>[],
        'recommendations': <dynamic>[],
      });

      expect(d.score, isNull);
      expect(d.assessmentBaseline, isNull);
    });
  });

  group('AssessmentHistoryEntry / ProgressReport', () {
    test('maps a completed assessment', () {
      final a = AssessmentHistoryEntry.fromJson({
        'id': 'as1',
        'completedAt': '2026-08-20T09:00:00.000Z',
        'resultSystemSuggestedLevel': 4.0,
      });

      expect(a.completedAt, isNotNull);
      expect(a.resultSystemSuggestedLevel, 4.0);
    });

    // An abandoned assessment session is a real row with no completion.
    test('tolerates an unfinished assessment', () {
      final a = AssessmentHistoryEntry.fromJson({
        'id': 'as1',
        'completedAt': null,
        'resultSystemSuggestedLevel': null,
      });

      expect(a.completedAt, isNull);
      expect(a.resultSystemSuggestedLevel, isNull);
    });

    test('maps a progress report', () {
      final r = ProgressReport.fromJson({
        'skills': <dynamic>[
          {'skill': 'SERVE', 'score': 3.0, 'maturity': 'DEVELOPING'},
        ],
        'assessmentHistory': <dynamic>[
          {
            'id': 'as1',
            'completedAt': '2026-08-20T09:00:00.000Z',
            'resultSystemSuggestedLevel': 4.0,
          },
        ],
      });

      expect(r.skills, hasLength(1));
      expect(r.assessmentHistory, hasLength(1));
    });
  });

  group('Goal.fromJson', () {
    Map<String, dynamic> json({
      Object? deadline = '2026-12-01T00:00:00.000Z',
      Object? achievedAt,
      Object? currentScore = 3.5,
      String status = 'ON_TRACK',
      List<dynamic> milestones = const [],
    }) => {
      'id': 'g1',
      'skill': 'SERVE',
      'baseline': 3.0,
      'target': 4.5,
      'deadline': deadline,
      'achievedAt': achievedAt,
      'currentScore': currentScore,
      'status': status,
      'milestones': milestones,
    };

    test('maps an in-flight goal', () {
      final g = Goal.fromJson(json());

      expect(g.baseline, 3.0);
      expect(g.target, 4.5);
      expect(g.currentScore, 3.5);
      expect(g.status, 'ON_TRACK');
      expect(g.achievedAt, isNull);
    });

    // Pace is computed against a deadline; an open-ended goal has none,
    // and the tracker must not divide by a missing date.
    test('tolerates an open-ended goal', () {
      final g = Goal.fromJson(json(deadline: null));
      expect(g.deadline, isNull);
    });

    test('maps an achieved goal', () {
      final g = Goal.fromJson(
        json(achievedAt: '2026-11-01T00:00:00.000Z', status: 'ACHIEVED'),
      );

      expect(g.achievedAt, isNotNull);
      expect(g.status, 'ACHIEVED');
    });

    test('tolerates a goal with no current score yet', () {
      expect(Goal.fromJson(json(currentScore: null)).currentScore, isNull);
    });

    test('maps milestones, achieved and pending', () {
      final g = Goal.fromJson(
        json(
          milestones: [
            {
              'id': 'm1',
              'label': 'Reach 3.5',
              'achievedAt': '2026-09-01T00:00:00.000Z',
            },
            {'id': 'm2', 'label': 'Reach 4.0', 'achievedAt': null},
          ],
        ),
      );

      expect(g.milestones, hasLength(2));
      expect(g.milestones.first.achievedAt, isNotNull);
      expect(g.milestones.last.achievedAt, isNull);
    });

    test('accepts whole-number baseline and target', () {
      final g = Goal.fromJson({...json(), 'baseline': 3, 'target': 5});

      expect(g.baseline, 3.0);
      expect(g.target, 5.0);
    });
  });
}
