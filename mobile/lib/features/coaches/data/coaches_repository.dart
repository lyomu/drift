import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';

enum CoachLevel {
  beginner,
  intermediate,
  advanced,
  competitive;

  String get apiValue => name.toUpperCase();
  String get label => name[0].toUpperCase() + name.substring(1);

  static CoachLevel fromJson(String value) => CoachLevel.values.firstWhere(
    (level) => level.apiValue == value,
    orElse: () => CoachLevel.beginner,
  );
}

enum CoachVerificationStatus {
  unverified,
  pending,
  verified;

  static CoachVerificationStatus fromJson(String value) => switch (value) {
    'VERIFIED' => CoachVerificationStatus.verified,
    'PENDING' => CoachVerificationStatus.pending,
    _ => CoachVerificationStatus.unverified,
  };
}

class CoachClub {
  const CoachClub({required this.id, required this.name});
  final String id;
  final String name;

  factory CoachClub.fromJson(Map<String, dynamic> json) =>
      CoachClub(id: json['id'] as String, name: json['name'] as String);
}

class CoachSummary {
  const CoachSummary({
    required this.id,
    required this.userId,
    required this.firstName,
    required this.lastName,
    required this.photoUrl,
    required this.bio,
    required this.yearsExperience,
    required this.specialisations,
    required this.levels,
    required this.verificationStatus,
    required this.clubs,
  });

  final String id;
  final String userId;
  final String? firstName;
  final String? lastName;
  final String? photoUrl;
  final String? bio;
  final int? yearsExperience;
  final List<String> specialisations;
  final List<CoachLevel> levels;
  final CoachVerificationStatus verificationStatus;
  final List<CoachClub> clubs;

  String get displayName {
    final parts = [
      firstName,
      lastName,
    ].whereType<String>().where((part) => part.isNotEmpty);
    return parts.isEmpty ? 'Coach' : parts.join(' ');
  }

  factory CoachSummary.fromJson(Map<String, dynamic> json) => CoachSummary(
    id: json['id'] as String,
    userId: json['userId'] as String,
    firstName: json['firstName'] as String?,
    lastName: json['lastName'] as String?,
    photoUrl: json['photoUrl'] as String?,
    bio: json['bio'] as String?,
    yearsExperience: json['yearsExperience'] as int?,
    specialisations: (json['specialisations'] as List<dynamic>)
        .map((item) => item as String)
        .toList(),
    levels: (json['levels'] as List<dynamic>)
        .map((item) => CoachLevel.fromJson(item as String))
        .toList(),
    verificationStatus: CoachVerificationStatus.fromJson(
      json['verificationStatus'] as String,
    ),
    clubs: (json['clubs'] as List<dynamic>)
        .map((item) => CoachClub.fromJson(item as Map<String, dynamic>))
        .toList(),
  );
}

class CoachContact {
  const CoachContact({this.email, this.phone, this.bookingUrl});
  final String? email;
  final String? phone;
  final String? bookingUrl;
}

class CoachProfile {
  const CoachProfile({
    required this.summary,
    required this.qualifications,
    required this.availabilityNote,
    required this.contact,
  });

  final CoachSummary summary;
  final List<String> qualifications;
  final String? availabilityNote;
  final CoachContact contact;

  factory CoachProfile.fromJson(Map<String, dynamic> json) {
    final contact = json['publicContact'] as Map<String, dynamic>;
    return CoachProfile(
      summary: CoachSummary.fromJson(json),
      qualifications: (json['qualifications'] as List<dynamic>)
          .map((item) => item as String)
          .toList(),
      availabilityNote: json['availabilityNote'] as String?,
      contact: CoachContact(
        email: contact['email'] as String?,
        phone: contact['phone'] as String?,
        bookingUrl: contact['bookingUrl'] as String?,
      ),
    );
  }
}

class CoachFilters {
  const CoachFilters({
    this.specialisation,
    this.level,
    this.clubId,
    this.clubName,
  });

  final String? specialisation;
  final CoachLevel? level;
  final String? clubId;
  final String? clubName;

  bool get isEmpty =>
      (specialisation == null || specialisation!.isEmpty) &&
      level == null &&
      clubId == null &&
      (clubName == null || clubName!.isEmpty);

  CoachFilters copyWith({
    String? specialisation,
    CoachLevel? level,
    String? clubId,
    String? clubName,
    bool clearSpecialisation = false,
    bool clearLevel = false,
    bool clearClub = false,
  }) => CoachFilters(
    specialisation: clearSpecialisation
        ? null
        : (specialisation ?? this.specialisation),
    level: clearLevel ? null : (level ?? this.level),
    clubId: clearClub ? null : (clubId ?? this.clubId),
    clubName: clearClub ? null : (clubName ?? this.clubName),
  );

  Map<String, dynamic> toQuery() => {
    if (specialisation != null && specialisation!.isNotEmpty)
      'specialisation': specialisation,
    if (level != null) 'level': level!.apiValue,
    if (clubId != null) 'clubId': clubId,
    if (clubName != null && clubName!.isNotEmpty) 'clubName': clubName,
  };
}

class CoachesRepository {
  CoachesRepository(this._dio);
  final Dio _dio;

  Future<List<CoachSummary>> search(CoachFilters filters) async {
    final data = await _get('/coaches', query: filters.toQuery());
    return (data['coaches'] as List<dynamic>)
        .map((item) => CoachSummary.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  Future<CoachProfile> findOne(String id) async {
    final data = await _get('/coaches/$id');
    return CoachProfile.fromJson(data);
  }

  Future<Map<String, dynamic>> _get(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: query);
      return response.data as Map<String, dynamic>;
    } on DioException catch (error) {
      final body = error.response?.data;
      final message = body is Map ? body['message'] : null;
      final text = message is List ? message.join(' ') : message?.toString();
      throw AuthException(text ?? 'Something went wrong. Please try again.');
    }
  }
}

final coachesRepositoryProvider = Provider<CoachesRepository>((ref) {
  return CoachesRepository(ref.watch(dioClientProvider));
});
