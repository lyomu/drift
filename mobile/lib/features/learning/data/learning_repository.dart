import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';

class ContentSummary {
  const ContentSummary({
    required this.id,
    required this.type,
    required this.sport,
    required this.targetSkill,
    required this.branch,
    required this.title,
    required this.summary,
    required this.durationMinutes,
  });

  final String id;
  final String type;
  final String sport;
  final String targetSkill;
  final String? branch;
  final String title;
  final String? summary;
  final int? durationMinutes;

  bool get isDrill => type == 'DRILL';
  bool get isTrainingPlan => type == 'TRAINING_PLAN';

  factory ContentSummary.fromJson(Map<String, dynamic> json) => ContentSummary(
    id: json['id'] as String,
    type: json['type'] as String,
    sport: json['sport'] as String,
    targetSkill: json['targetSkill'] as String,
    branch: json['branch'] as String?,
    title: json['title'] as String,
    summary: json['summary'] as String?,
    durationMinutes: json['durationMinutes'] as int?,
  );
}

class ContentDetail {
  const ContentDetail({
    required this.summary,
    required this.bodyText,
    required this.videoUrl,
    required this.steps,
  });

  final ContentSummary summary;
  final String? bodyText;
  final String? videoUrl;
  final List<ContentSummary> steps;

  factory ContentDetail.fromJson(Map<String, dynamic> json) => ContentDetail(
    summary: ContentSummary.fromJson(json),
    bodyText: json['bodyText'] as String?,
    videoUrl: json['videoUrl'] as String?,
    steps: (json['steps'] as List<dynamic>)
        .map((s) => ContentSummary.fromJson(s as Map<String, dynamic>))
        .toList(),
  );
}

class SkillScoreEntry {
  const SkillScoreEntry({
    required this.skill,
    required this.score,
    required this.maturity,
  });

  final String skill;
  final double? score;

  /// "DIRECTIONAL" (assessment-only, shown as "Building") or "ESTABLISHED"
  /// (at least one practice session backs it up) — null means no data at
  /// all yet. Per Doc 3 §8: never show a falsely precise percentage on
  /// directional data.
  final String? maturity;

  factory SkillScoreEntry.fromJson(Map<String, dynamic> json) =>
      SkillScoreEntry(
        skill: json['skill'] as String,
        score: (json['score'] as num?)?.toDouble(),
        maturity: json['maturity'] as String?,
      );
}

class SkillProfile {
  const SkillProfile({
    required this.skills,
    required this.weakestSkill,
    required this.recommendations,
  });

  final List<SkillScoreEntry> skills;
  final String? weakestSkill;
  final List<ContentSummary> recommendations;

  factory SkillProfile.fromJson(Map<String, dynamic> json) => SkillProfile(
    skills: (json['skills'] as List<dynamic>)
        .map((s) => SkillScoreEntry.fromJson(s as Map<String, dynamic>))
        .toList(),
    weakestSkill: json['weakestSkill'] as String?,
    recommendations: (json['recommendations'] as List<dynamic>)
        .map((c) => ContentSummary.fromJson(c as Map<String, dynamic>))
        .toList(),
  );
}

class PracticeSessionEntry {
  const PracticeSessionEntry({
    required this.id,
    required this.occurredAt,
    required this.durationMinutes,
    required this.skillFocus,
    required this.notes,
    required this.perceivedPerformance,
    required this.drill,
  });

  final String id;
  final DateTime occurredAt;
  final int durationMinutes;
  final String skillFocus;
  final String? notes;
  final int perceivedPerformance;
  final ContentSummary? drill;

  factory PracticeSessionEntry.fromJson(Map<String, dynamic> json) =>
      PracticeSessionEntry(
        id: json['id'] as String,
        occurredAt: DateTime.parse(json['occurredAt'] as String).toLocal(),
        durationMinutes: json['durationMinutes'] as int,
        skillFocus: json['skillFocus'] as String,
        notes: json['notes'] as String?,
        perceivedPerformance: json['perceivedPerformance'] as int,
        drill: json['drill'] != null
            ? ContentSummary.fromJson(json['drill'] as Map<String, dynamic>)
            : null,
      );
}

class SkillDetail {
  const SkillDetail({
    required this.skill,
    required this.score,
    required this.maturity,
    required this.assessmentBaseline,
    required this.practiceSessions,
    required this.recommendations,
  });

  final String skill;
  final double? score;
  final String? maturity;
  final double? assessmentBaseline;
  final List<PracticeSessionEntry> practiceSessions;
  final List<ContentSummary> recommendations;

  factory SkillDetail.fromJson(Map<String, dynamic> json) => SkillDetail(
    skill: json['skill'] as String,
    score: (json['score'] as num?)?.toDouble(),
    maturity: json['maturity'] as String?,
    assessmentBaseline: (json['assessmentBaseline'] as num?)?.toDouble(),
    practiceSessions: (json['practiceSessions'] as List<dynamic>)
        .map((s) => PracticeSessionEntry.fromJson(s as Map<String, dynamic>))
        .toList(),
    recommendations: (json['recommendations'] as List<dynamic>)
        .map((c) => ContentSummary.fromJson(c as Map<String, dynamic>))
        .toList(),
  );
}

class AssessmentHistoryEntry {
  const AssessmentHistoryEntry({
    required this.id,
    required this.completedAt,
    required this.resultSystemSuggestedLevel,
  });

  final String id;
  final DateTime? completedAt;
  final double? resultSystemSuggestedLevel;

  factory AssessmentHistoryEntry.fromJson(Map<String, dynamic> json) =>
      AssessmentHistoryEntry(
        id: json['id'] as String,
        completedAt: json['completedAt'] != null
            ? DateTime.parse(json['completedAt'] as String).toLocal()
            : null,
        resultSystemSuggestedLevel: (json['resultSystemSuggestedLevel'] as num?)
            ?.toDouble(),
      );
}

class ProgressReport {
  const ProgressReport({required this.skills, required this.assessmentHistory});

  final List<SkillScoreEntry> skills;
  final List<AssessmentHistoryEntry> assessmentHistory;

  factory ProgressReport.fromJson(Map<String, dynamic> json) => ProgressReport(
    skills: (json['skills'] as List<dynamic>)
        .map((s) => SkillScoreEntry.fromJson(s as Map<String, dynamic>))
        .toList(),
    assessmentHistory: (json['assessmentHistory'] as List<dynamic>)
        .map((a) => AssessmentHistoryEntry.fromJson(a as Map<String, dynamic>))
        .toList(),
  );
}

class GoalMilestoneEntry {
  const GoalMilestoneEntry({
    required this.id,
    required this.label,
    required this.achievedAt,
  });

  final String id;
  final String label;
  final DateTime? achievedAt;

  factory GoalMilestoneEntry.fromJson(Map<String, dynamic> json) =>
      GoalMilestoneEntry(
        id: json['id'] as String,
        label: json['label'] as String,
        achievedAt: json['achievedAt'] != null
            ? DateTime.parse(json['achievedAt'] as String).toLocal()
            : null,
      );
}

class Goal {
  const Goal({
    required this.id,
    required this.skill,
    required this.baseline,
    required this.target,
    required this.deadline,
    required this.achievedAt,
    required this.currentScore,
    required this.status,
    required this.milestones,
  });

  final String id;
  final String skill;
  final double baseline;
  final double target;
  final DateTime? deadline;
  final DateTime? achievedAt;
  final double? currentScore;

  /// "ON_TRACK" | "BEHIND" | "ACHIEVED" — always derived server-side, never
  /// stale (see backend `learning/skill-score.ts`'s `deriveGoalStatus`).
  final String status;
  final List<GoalMilestoneEntry> milestones;

  factory Goal.fromJson(Map<String, dynamic> json) => Goal(
    id: json['id'] as String,
    skill: json['skill'] as String,
    baseline: (json['baseline'] as num).toDouble(),
    target: (json['target'] as num).toDouble(),
    deadline: json['deadline'] != null
        ? DateTime.parse(json['deadline'] as String).toLocal()
        : null,
    achievedAt: json['achievedAt'] != null
        ? DateTime.parse(json['achievedAt'] as String).toLocal()
        : null,
    currentScore: (json['currentScore'] as num?)?.toDouble(),
    status: json['status'] as String,
    milestones: (json['milestones'] as List<dynamic>)
        .map((m) => GoalMilestoneEntry.fromJson(m as Map<String, dynamic>))
        .toList(),
  );
}

class LearningRepository {
  LearningRepository(this._dio);

  final Dio _dio;

  Future<SkillProfile> getSkillProfile() async {
    final data = await _get('/learning/skill-profile');
    return SkillProfile.fromJson(data);
  }

  Future<SkillDetail> getSkillDetail(String skill) async {
    final data = await _get('/learning/skill-profile/$skill');
    return SkillDetail.fromJson(data);
  }

  Future<ProgressReport> getProgressReport() async {
    final data = await _get('/learning/progress');
    return ProgressReport.fromJson(data);
  }

  Future<List<ContentSummary>> browseContent({
    String? type,
    String? targetSkill,
  }) async {
    final data = await _get(
      '/learning/content',
      query: {
        if (type != null) 'type': type,
        if (targetSkill != null) 'targetSkill': targetSkill,
      },
    );
    return (data['content'] as List<dynamic>)
        .map((c) => ContentSummary.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  Future<ContentDetail> getContent(String id) async {
    final data = await _get('/learning/content/$id');
    return ContentDetail.fromJson(data);
  }

  Future<void> markContentComplete(String id) =>
      _send(() => _dio.post('/learning/content/$id/complete'));

  Future<List<PracticeSessionEntry>> listPracticeSessions() async {
    final data = await _get('/learning/practice-sessions');
    return (data['sessions'] as List<dynamic>)
        .map((s) => PracticeSessionEntry.fromJson(s as Map<String, dynamic>))
        .toList();
  }

  Future<void> logPracticeSession({
    required DateTime occurredAt,
    required int durationMinutes,
    required String skillFocus,
    String? drillId,
    String? notes,
    required int perceivedPerformance,
  }) => _send(
    () => _dio.post(
      '/learning/practice-sessions',
      data: {
        'occurredAt': occurredAt.toUtc().toIso8601String(),
        'durationMinutes': durationMinutes,
        'skillFocus': skillFocus,
        if (drillId != null) 'drillId': drillId,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
        'perceivedPerformance': perceivedPerformance,
      },
    ),
  );

  Future<List<Goal>> listGoals() async {
    final data = await _get('/learning/goals');
    return (data['goals'] as List<dynamic>)
        .map((g) => Goal.fromJson(g as Map<String, dynamic>))
        .toList();
  }

  Future<Goal> createGoal({
    required String skill,
    required double target,
    DateTime? deadline,
    List<String>? milestones,
  }) async {
    final data = await _send(
      () => _dio.post(
        '/learning/goals',
        data: {
          'skill': skill,
          'target': target,
          if (deadline != null) 'deadline': deadline.toUtc().toIso8601String(),
          if (milestones != null && milestones.isNotEmpty)
            'milestones': milestones,
        },
      ),
    );
    return Goal.fromJson(data);
  }

  Future<Goal> getGoal(String id) async {
    final data = await _get('/learning/goals/$id');
    return Goal.fromJson(data);
  }

  Future<Goal> updateGoal(
    String id, {
    double? target,
    DateTime? deadline,
  }) async {
    final data = await _send(
      () => _dio.patch(
        '/learning/goals/$id',
        data: {
          if (target != null) 'target': target,
          if (deadline != null) 'deadline': deadline.toUtc().toIso8601String(),
        },
      ),
    );
    return Goal.fromJson(data);
  }

  Future<void> deleteGoal(String id) =>
      _send(() => _dio.delete('/learning/goals/$id'));

  Future<Goal> completeGoal(String id) async {
    final data = await _send(() => _dio.patch('/learning/goals/$id/complete'));
    return Goal.fromJson(data);
  }

  Future<Goal> completeMilestone(String goalId, String milestoneId) async {
    final data = await _send(
      () => _dio.patch(
        '/learning/goals/$goalId/milestones/$milestoneId/complete',
      ),
    );
    return Goal.fromJson(data);
  }

  Future<Map<String, dynamic>> _get(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: query);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw _toAuthException(e);
    }
  }

  Future<Map<String, dynamic>> _send(
    Future<Response<dynamic>> Function() call,
  ) async {
    try {
      final response = await call();
      return (response.data as Map<String, dynamic>?) ?? {};
    } on DioException catch (e) {
      throw _toAuthException(e);
    }
  }

  AuthException _toAuthException(DioException e) {
    final body = e.response?.data;
    final message = body is Map ? body['message'] as Object? : null;
    final text = message is List ? message.join(' ') : message?.toString();
    return AuthException(text ?? 'Something went wrong. Please try again.');
  }
}

final learningRepositoryProvider = Provider<LearningRepository>((ref) {
  return LearningRepository(ref.watch(dioClientProvider));
});
