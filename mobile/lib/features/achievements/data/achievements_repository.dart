import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';

class Achievement {
  const Achievement({
    required this.id,
    required this.title,
    required this.description,
    required this.criteria,
    required this.icon,
    required this.state,
    required this.current,
    required this.target,
  });

  final String id;
  final String title;
  final String description;
  final String criteria;
  final String icon;
  final String state;
  final int current;
  final int target;

  bool get earned => state == 'EARNED';

  factory Achievement.fromJson(Map<String, dynamic> json) => Achievement(
    id: json['id'] as String,
    title: json['title'] as String,
    description: json['description'] as String,
    criteria: json['criteria'] as String,
    icon: json['icon'] as String,
    state: json['state'] as String,
    current: json['current'] as int,
    target: json['target'] as int,
  );
}

class AchievementsResponse {
  const AchievementsResponse({
    required this.achievements,
    required this.earnedCount,
    required this.totalCount,
  });

  final List<Achievement> achievements;
  final int earnedCount;
  final int totalCount;

  factory AchievementsResponse.fromJson(Map<String, dynamic> json) =>
      AchievementsResponse(
        achievements: (json['achievements'] as List<dynamic>)
            .map((a) => Achievement.fromJson(a as Map<String, dynamic>))
            .toList(),
        earnedCount: json['earnedCount'] as int,
        totalCount: json['totalCount'] as int,
      );
}

class AchievementsRepository {
  AchievementsRepository(this._dio);

  final Dio _dio;

  Future<AchievementsResponse> list() async {
    try {
      final response = await _dio.get('/achievements');
      return AchievementsResponse.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      final body = e.response?.data;
      final message = body is Map ? body['message'] as Object? : null;
      final text = message is List ? message.join(' ') : message?.toString();
      throw AuthException(text ?? 'Achievements could not be loaded.');
    }
  }
}

final achievementsRepositoryProvider = Provider<AchievementsRepository>((ref) {
  return AchievementsRepository(ref.watch(dioClientProvider));
});
