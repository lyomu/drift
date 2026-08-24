import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../../core/onboarding/onboarding_step.dart';
import '../../auth/data/auth_repository.dart';

class UserProfile {
  const UserProfile({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.photoUrl,
    required this.bio,
    required this.onboardingStep,
  });

  final String id;
  final String? email;
  final String? firstName;
  final String? lastName;
  final String? photoUrl;
  final String? bio;
  final OnboardingStep onboardingStep;

  String get displayName {
    final parts = [
      firstName,
      lastName,
    ].whereType<String>().where((p) => p.isNotEmpty);
    return parts.isEmpty ? 'Player' : parts.join(' ');
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    id: json['id'] as String,
    email: json['email'] as String?,
    firstName: json['firstName'] as String?,
    lastName: json['lastName'] as String?,
    photoUrl: json['photoUrl'] as String?,
    bio: json['bio'] as String?,
    onboardingStep: OnboardingStep.fromJson(json['onboardingStep'] as String),
  );
}

/// Mirrors the backend `FieldVisibility` enum.
enum FieldVisibility {
  connectionsOnly('CONNECTIONS_ONLY'),
  everyone('EVERYONE');

  const FieldVisibility(this.wireValue);

  final String wireValue;

  static FieldVisibility fromJson(String value) => switch (value) {
    'EVERYONE' => FieldVisibility.everyone,
    _ => FieldVisibility.connectionsOnly,
  };
}

class PrivacySettings {
  const PrivacySettings({
    required this.skillBreakdownVisibility,
    required this.availabilityVisibility,
  });

  final FieldVisibility skillBreakdownVisibility;
  final FieldVisibility availabilityVisibility;

  factory PrivacySettings.fromJson(Map<String, dynamic> json) =>
      PrivacySettings(
        skillBreakdownVisibility: FieldVisibility.fromJson(
          json['skillBreakdownVisibility'] as String,
        ),
        availabilityVisibility: FieldVisibility.fromJson(
          json['availabilityVisibility'] as String,
        ),
      );
}

class UsersRepository {
  UsersRepository(this._dio);

  final Dio _dio;

  Future<UserProfile> getMe() async {
    final data = await _get('/users/me');
    return UserProfile.fromJson(data);
  }

  Future<OnboardingStep> updateBasicProfile({
    required String firstName,
    required String lastName,
    String? photoUrl,
    required String dominantHand,
  }) => _patchStep('/users/me/basic-profile', {
    'firstName': firstName,
    'lastName': lastName,
    if (photoUrl != null) 'photoUrl': photoUrl,
    'dominantHand': dominantHand,
  });

  Future<OnboardingStep> updateTennisExperience({
    required String experienceSignal,
    String? selfReportedRatingScale,
    double? selfReportedRatingValue,
  }) => _patchStep('/users/me/tennis-experience', {
    'experienceSignal': experienceSignal,
    if (selfReportedRatingScale != null)
      'selfReportedRatingScale': selfReportedRatingScale,
    if (selfReportedRatingValue != null)
      'selfReportedRatingValue': selfReportedRatingValue,
  });

  Future<OnboardingStep> updateLevel(double userSelectedLevel) =>
      _patchStep('/users/me/level', {'userSelectedLevel': userSelectedLevel});

  Future<OnboardingStep> updateGoals(List<String> goals) =>
      _patchStep('/users/me/goals', {'goals': goals});

  Future<OnboardingStep> updatePreferences({
    required String formatPreference,
    required String stylePreference,
    required List<String> preferredTimeSlots,
  }) => _patchStep('/users/me/preferences', {
    'formatPreference': formatPreference,
    'stylePreference': stylePreference,
    'preferredTimeSlots': preferredTimeSlots,
  });

  Future<OnboardingStep> updateLocation({
    required String generalLocation,
    double? latitude,
    double? longitude,
    required String locationSource,
  }) => _patchStep('/users/me/location', {
    'generalLocation': generalLocation,
    if (latitude != null) 'latitude': latitude,
    if (longitude != null) 'longitude': longitude,
    'locationSource': locationSource,
  });

  Future<OnboardingStep> updateClubCourts({
    String? preferredClubName,
    List<String>? preferredCourtNames,
  }) => _patchStep('/users/me/club-courts', {
    if (preferredClubName != null) 'preferredClubName': preferredClubName,
    if (preferredCourtNames != null) 'preferredCourtNames': preferredCourtNames,
  });

  Future<OnboardingStep> updateAvailability(List<Map<String, dynamic>> slots) =>
      _patchStep('/users/me/availability', {'slots': slots});

  Future<OnboardingStep> updatePadelInterest(String padelInterest) =>
      _patchStep('/users/me/padel-interest', {'padelInterest': padelInterest});

  /// Edit Profile (Phase M12) — a post-onboarding partial update, distinct
  /// from the onboarding-step methods above (none of which advance a step).
  Future<UserProfile> updateProfile({
    String? firstName,
    String? lastName,
    String? dominantHand,
    String? bio,
  }) async {
    final data = await _patch('/users/me/profile', {
      if (firstName != null) 'firstName': firstName,
      if (lastName != null) 'lastName': lastName,
      if (dominantHand != null) 'dominantHand': dominantHand,
      if (bio != null) 'bio': bio,
    });
    return UserProfile.fromJson(data);
  }

  Future<PrivacySettings> getPrivacySettings() async {
    final data = await _get('/users/me/privacy-settings');
    return PrivacySettings.fromJson(data);
  }

  Future<PrivacySettings> updatePrivacySettings({
    FieldVisibility? skillBreakdownVisibility,
    FieldVisibility? availabilityVisibility,
  }) async {
    final data = await _patch('/users/me/privacy-settings', {
      if (skillBreakdownVisibility != null)
        'skillBreakdownVisibility': skillBreakdownVisibility.wireValue,
      if (availabilityVisibility != null)
        'availabilityVisibility': availabilityVisibility.wireValue,
    });
    return PrivacySettings.fromJson(data);
  }

  /// Soft delete — see `UsersService.deleteAccount` on the backend. The
  /// caller is responsible for clearing local session state afterwards.
  Future<void> deleteAccount() => _send(() => _dio.post('/users/me/delete'));

  Future<Map<String, dynamic>> _patch(
    String path,
    Map<String, dynamic> body,
  ) async {
    try {
      final response = await _dio.patch(path, data: body);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw AuthException(_messageFrom(e));
    }
  }

  Future<void> _send(Future<Response<dynamic>> Function() call) async {
    try {
      await call();
    } on DioException catch (e) {
      throw AuthException(_messageFrom(e));
    }
  }

  Future<OnboardingStep> _patchStep(
    String path,
    Map<String, dynamic> body,
  ) async {
    try {
      final response = await _dio.patch(path, data: body);
      final data = response.data as Map<String, dynamic>;
      return OnboardingStep.fromJson(data['onboardingStep'] as String);
    } on DioException catch (e) {
      throw AuthException(_messageFrom(e));
    }
  }

  Future<Map<String, dynamic>> _get(String path) async {
    try {
      final response = await _dio.get(path);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw AuthException(_messageFrom(e));
    }
  }

  String _messageFrom(DioException e) {
    final body = e.response?.data;
    final message = body is Map ? body['message'] as Object? : null;
    final text = message is List ? message.join(' ') : message?.toString();
    return text ?? 'Something went wrong. Please try again.';
  }
}

final usersRepositoryProvider = Provider<UsersRepository>((ref) {
  return UsersRepository(ref.watch(dioClientProvider));
});
