import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/assessment/data/assessment_repository.dart';

Map<String, dynamic> _question({String id = 'q1'}) => {
  'questionId': id,
  'pillar': 'SERVE',
  'prompt': 'When you serve, what usually happens?',
  'options': <dynamic>[
    {'key': 'A', 'text': 'I struggle to get it in'},
    {'key': 'D', 'text': 'I can place it and vary pace'},
  ],
};

/// The branching itself is server-side (`backend/src/assessment`), so what
/// matters here is that the client reads the two shapes the API alternates
/// between: "here's the next question" and "you're done, here's your level".
void main() {
  group('AssessmentQuestion / AssessmentOption', () {
    test('maps a question and its options', () {
      final q = AssessmentQuestion.fromJson(_question());

      expect(q.questionId, 'q1');
      expect(q.pillar, 'SERVE');
      expect(q.options, hasLength(2));
      expect(q.options.first.key, 'A');
      expect(q.options.last.text, 'I can place it and vary pace');
    });
  });

  group('AssessmentSessionState.fromJson', () {
    test('maps a session mid-assessment', () {
      final s = AssessmentSessionState.fromJson({
        'sessionId': 's1',
        'branch': 'EXPERIENCED',
        'questionBudget': 13,
        'answeredCount': 4,
        'nextQuestion': _question(),
      });

      expect(s.sessionId, 's1');
      expect(s.branch, 'EXPERIENCED');
      expect(s.questionBudget, 13);
      expect(s.answeredCount, 4);
      expect(s.nextQuestion?.questionId, 'q1');
    });

    // A resumed session that has already run out of questions returns no
    // next question — the screen must show the result step, not a blank.
    test('tolerates a session with no question left', () {
      final s = AssessmentSessionState.fromJson({
        'sessionId': 's1',
        'branch': 'BEGINNER',
        'questionBudget': 7,
        'answeredCount': 7,
        'nextQuestion': null,
      });

      expect(s.nextQuestion, isNull);
      expect(s.answeredCount, s.questionBudget);
    });
  });

  group('AssessmentResult.fromJson', () {
    test('maps the suggested level and its breakdown', () {
      final r = AssessmentResult.fromJson({
        'level': 4.0,
        'label': '4.0 — Intermediate',
        'skillBreakdown': {'SERVE': 4, 'FOREHAND': 5, 'BACKHAND': 3},
      });

      expect(r.level, 4.0);
      expect(r.label, '4.0 — Intermediate');
      expect(r.skillBreakdown['FOREHAND'], 5);
    });

    test('accepts a whole-number level', () {
      final r = AssessmentResult.fromJson({
        'level': 4,
        'label': '4.0',
        'skillBreakdown': <String, dynamic>{},
      });

      expect(r.level, 4.0);
    });
  });

  group('AnswerOutcome.fromJson', () {
    // The API returns one of two shapes from the same endpoint, keyed on
    // `complete`. Reading the wrong branch is how an assessment either
    // stalls on the last question or skips the result screen.
    test('reads the next-question shape while the assessment continues', () {
      final o = AnswerOutcome.fromJson({
        'complete': false,
        'answeredCount': 5,
        'nextQuestion': _question(id: 'q2'),
      });

      expect(o.result, isNull);
      expect(o.nextQuestion?.questionId, 'q2');
      expect(o.answeredCount, 5);
    });

    test('reads the result shape once complete', () {
      final o = AnswerOutcome.fromJson({
        'complete': true,
        'level': 3.5,
        'label': '3.5',
        'skillBreakdown': {'SERVE': 3},
      });

      expect(o.nextQuestion, isNull);
      expect(o.result?.level, 3.5);
    });

    test('treats an absent complete flag as "still going"', () {
      final o = AnswerOutcome.fromJson({
        'answeredCount': 1,
        'nextQuestion': _question(),
      });

      expect(o.result, isNull);
      expect(o.nextQuestion, isNotNull);
    });
  });
}
