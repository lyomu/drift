import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';

/// Mirrors the backend `PadelSide` enum.
enum PadelSide {
  left('LEFT', 'Left'),
  right('RIGHT', 'Right'),
  either('EITHER', 'Either');

  const PadelSide(this.wireValue, this.label);

  final String wireValue;
  final String label;

  static PadelSide? fromJson(String? value) => switch (value) {
    'LEFT' => PadelSide.left,
    'RIGHT' => PadelSide.right,
    'EITHER' => PadelSide.either,
    _ => null,
  };
}

class PadelProfile {
  const PadelProfile({
    required this.id,
    required this.dominantHand,
    required this.singlesRating,
    required this.doublesRating,
    required this.systemSuggestedLevel,
    required this.levelLabel,
    required this.skillBreakdown,
    required this.preferredSide,
    required this.partnerPreference,
    required this.goals,
  });

  final String id;
  final String? dominantHand;
  final double? singlesRating;
  final double? doublesRating;
  final double? systemSuggestedLevel;
  final String? levelLabel;
  final Map<String, int>? skillBreakdown;
  final PadelSide? preferredSide;
  final String? partnerPreference;
  final List<String> goals;

  factory PadelProfile.fromJson(Map<String, dynamic> json) {
    final breakdown = json['skillBreakdown'] as Map<String, dynamic>?;
    return PadelProfile(
      id: json['id'] as String,
      dominantHand: json['dominantHand'] as String?,
      singlesRating: (json['singlesRating'] as num?)?.toDouble(),
      doublesRating: (json['doublesRating'] as num?)?.toDouble(),
      systemSuggestedLevel: (json['systemSuggestedLevel'] as num?)?.toDouble(),
      levelLabel: json['levelLabel'] as String?,
      skillBreakdown: breakdown?.map((k, v) => MapEntry(k, v as int)),
      preferredSide: PadelSide.fromJson(json['preferredSide'] as String?),
      partnerPreference: json['partnerPreference'] as String?,
      goals: (json['goals'] as List<dynamic>).cast<String>(),
    );
  }
}

class PadelRepository {
  PadelRepository(this._dio);

  final Dio _dio;

  /// "+ Add Padel" confirm-intent — idempotent.
  Future<PadelProfile> addPadel() async {
    final data = await _post('/padel/profile', {});
    return PadelProfile.fromJson(data);
  }

  /// `null` means "not added yet", not an error — My Sports Hub uses that
  /// to decide "+ Add Padel" vs "Open Padel Profile". Any other failure
  /// still throws [AuthException].
  Future<PadelProfile?> getProfile() async {
    try {
      final response = await _dio.get('/padel/profile');
      return PadelProfile.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw _toAuthException(e);
    }
  }

  Future<PadelProfile> updatePreferences({
    PadelSide? preferredSide,
    String? partnerPreference,
    List<String>? goals,
  }) async {
    final data = await _patch('/padel/profile/preferences', {
      if (preferredSide != null) 'preferredSide': preferredSide.wireValue,
      if (partnerPreference != null) 'partnerPreference': partnerPreference,
      if (goals != null) 'goals': goals,
    });
    return PadelProfile.fromJson(data);
  }

  Future<Map<String, dynamic>> _post(
    String path,
    Map<String, dynamic> body,
  ) async {
    try {
      final response = await _dio.post(path, data: body);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw _toAuthException(e);
    }
  }

  Future<Map<String, dynamic>> _patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    try {
      final response = await _dio.patch(path, data: body);
      return response.data as Map<String, dynamic>;
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

final padelRepositoryProvider = Provider<PadelRepository>((ref) {
  return PadelRepository(ref.watch(dioClientProvider));
});
