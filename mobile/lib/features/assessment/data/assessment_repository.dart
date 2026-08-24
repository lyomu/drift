import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';

class AssessmentOption {
  const AssessmentOption({required this.key, required this.text});

  final String key;
  final String text;

  factory AssessmentOption.fromJson(Map<String, dynamic> json) =>
      AssessmentOption(
        key: json['key'] as String,
        text: json['text'] as String,
      );
}

class AssessmentQuestion {
  const AssessmentQuestion({
    required this.questionId,
    required this.pillar,
    required this.prompt,
    required this.options,
  });

  final String questionId;
  final String pillar;
  final String prompt;
  final List<AssessmentOption> options;

  factory AssessmentQuestion.fromJson(Map<String, dynamic> json) =>
      AssessmentQuestion(
        questionId: json['questionId'] as String,
        pillar: json['pillar'] as String,
        prompt: json['prompt'] as String,
        options: (json['options'] as List)
            .map((o) => AssessmentOption.fromJson(o as Map<String, dynamic>))
            .toList(),
      );
}

class AssessmentSessionState {
  const AssessmentSessionState({
    required this.sessionId,
    required this.branch,
    required this.questionBudget,
    required this.answeredCount,
    this.nextQuestion,
  });

  final String sessionId;
  final String branch;
  final int questionBudget;
  final int answeredCount;
  final AssessmentQuestion? nextQuestion;

  factory AssessmentSessionState.fromJson(Map<String, dynamic> json) =>
      AssessmentSessionState(
        sessionId: json['sessionId'] as String,
        branch: json['branch'] as String,
        questionBudget: json['questionBudget'] as int,
        answeredCount: json['answeredCount'] as int,
        nextQuestion: json['nextQuestion'] == null
            ? null
            : AssessmentQuestion.fromJson(
                json['nextQuestion'] as Map<String, dynamic>,
              ),
      );
}

class AssessmentResult {
  const AssessmentResult({
    required this.level,
    required this.label,
    required this.skillBreakdown,
  });

  final double level;
  final String label;
  final Map<String, int> skillBreakdown;

  factory AssessmentResult.fromJson(Map<String, dynamic> json) =>
      AssessmentResult(
        level: (json['level'] as num).toDouble(),
        label: json['label'] as String,
        skillBreakdown: (json['skillBreakdown'] as Map<String, dynamic>).map(
          (key, value) => MapEntry(key, value as int),
        ),
      );
}

/// Either the next question, or the final result once the session completes.
class AnswerOutcome {
  const AnswerOutcome({this.nextQuestion, this.answeredCount = 0, this.result});

  final AssessmentQuestion? nextQuestion;
  final int answeredCount;
  final AssessmentResult? result;

  bool get isComplete => result != null;

  factory AnswerOutcome.fromJson(Map<String, dynamic> json) {
    if (json['complete'] == true) {
      return AnswerOutcome(result: AssessmentResult.fromJson(json));
    }
    return AnswerOutcome(
      nextQuestion: AssessmentQuestion.fromJson(
        json['nextQuestion'] as Map<String, dynamic>,
      ),
      answeredCount: json['answeredCount'] as int,
    );
  }
}

/// Talks to `/assessment/*` (Tennis, the onboarding assessment) by default.
/// Phase M13's Padel assessment mirrors the same request/response shapes
/// exactly (`padel-assessment.service.ts` was built to match), so
/// [padelAssessmentRepositoryProvider] below reuses this class pointed at
/// `/padel/assessment` instead of duplicating it.
class AssessmentRepository {
  AssessmentRepository(this._dio, {this.basePath = '/assessment'});

  final Dio _dio;
  final String basePath;

  Future<AssessmentSessionState> startOrResumeSession() async {
    final data = await _request(
      () => _dio.post('$basePath/sessions', data: {}),
    );
    return AssessmentSessionState.fromJson(data);
  }

  Future<AnswerOutcome> submitAnswer({
    required String sessionId,
    required String questionId,
    required String selectedOption,
  }) async {
    final data = await _request(
      () => _dio.post(
        '$basePath/sessions/$sessionId/answers',
        data: {'questionId': questionId, 'selectedOption': selectedOption},
      ),
    );
    return AnswerOutcome.fromJson(data);
  }

  Future<Map<String, dynamic>> _request(
    Future<Response> Function() call,
  ) async {
    try {
      final response = await call();
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      final body = e.response?.data;
      final message = body is Map ? body['message'] as Object? : null;
      final text = message is List ? message.join(' ') : message?.toString();
      throw AuthException(text ?? 'Something went wrong. Please try again.');
    }
  }
}

final assessmentRepositoryProvider = Provider<AssessmentRepository>((ref) {
  return AssessmentRepository(ref.watch(dioClientProvider));
});

final padelAssessmentRepositoryProvider = Provider<AssessmentRepository>((ref) {
  return AssessmentRepository(
    ref.watch(dioClientProvider),
    basePath: '/padel/assessment',
  );
});
