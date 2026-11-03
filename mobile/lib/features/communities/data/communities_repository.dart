import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';
import '../../competitions/data/competitions_repository.dart';

/// Mirrors the backend `CommunityType`. CLUB communities are created from
/// club-admin only; the app creates the other three.
enum CommunityType {
  social,
  training,
  ladder,
  club;

  static CommunityType fromJson(String value) => CommunityType.values
      .firstWhere((t) => t.wire == value, orElse: () => CommunityType.social);

  String get wire => name.toUpperCase();

  /// The types offered in the create sheet.
  static const creatable = [social, training, ladder];

  String get label => switch (this) {
    CommunityType.social => l10nNow.communityTypeSocial,
    CommunityType.training => l10nNow.communityTypeTraining,
    CommunityType.ladder => l10nNow.communityTypeLadder,
    CommunityType.club => l10nNow.communityTypeClub,
  };
}

enum CommunityFrequency {
  weekly('WEEKLY'),
  biweekly('BIWEEKLY'),
  monthly('MONTHLY'),
  other('OTHER');

  const CommunityFrequency(this.wire);

  final String wire;

  static CommunityFrequency fromJson(String value) =>
      CommunityFrequency.values.firstWhere(
        (f) => f.wire == value,
        orElse: () => CommunityFrequency.other,
      );

  String get label => switch (this) {
    CommunityFrequency.weekly => l10nNow.communityFrequencyWeekly,
    CommunityFrequency.biweekly => l10nNow.communityFrequencyBiweekly,
    CommunityFrequency.monthly => l10nNow.communityFrequencyMonthly,
    CommunityFrequency.other => l10nNow.communityFrequencyOther,
  };
}

enum CommunityJoinPolicy {
  open('OPEN'),
  byRequest('BY_REQUEST');

  const CommunityJoinPolicy(this.wire);

  final String wire;

  static CommunityJoinPolicy fromJson(String value) =>
      value == 'BY_REQUEST' ? byRequest : open;
}

enum CommunityStatus {
  pending,
  approved,
  rejected,
  suspended;

  static CommunityStatus fromJson(String value) => CommunityStatus.values
      .firstWhere((s) => s.name.toUpperCase() == value, orElse: () => pending);
}

enum CommunityRole {
  owner,
  admin,
  member;

  static CommunityRole fromJson(String value) => CommunityRole.values
      .firstWhere((r) => r.name.toUpperCase() == value, orElse: () => member);

  bool get canManage => this == owner || this == admin;

  String get label => switch (this) {
    CommunityRole.owner => l10nNow.communityRoleOwner,
    CommunityRole.admin => l10nNow.communityRoleAdmin,
    CommunityRole.member => l10nNow.communityRoleMember,
  };
}

/// The viewer's own row in a community. Null when they have none.
class CommunityMembership {
  const CommunityMembership({
    required this.role,
    required this.isActive,
    required this.muted,
  });

  final CommunityRole role;

  /// False while a join request is waiting for approval.
  final bool isActive;
  final bool muted;

  bool get canManage => isActive && role.canManage;
  bool get isOwner => isActive && role == CommunityRole.owner;

  factory CommunityMembership.fromJson(Map<String, dynamic> json) =>
      CommunityMembership(
        role: CommunityRole.fromJson(json['role'] as String),
        isActive: json['status'] == 'ACTIVE',
        muted: json['muted'] as bool? ?? false,
      );
}

class Community {
  const Community({
    required this.id,
    required this.type,
    required this.name,
    required this.city,
    required this.frequency,
    required this.about,
    required this.photoUrl,
    required this.joinPolicy,
    required this.status,
    required this.decisionNote,
    required this.clubName,
    required this.memberCount,
    required this.conversationId,
    required this.distanceKm,
    required this.myMembership,
  });

  final String id;
  final CommunityType type;
  final String name;
  final String city;
  final CommunityFrequency frequency;
  final String? about;
  final String? photoUrl;
  final CommunityJoinPolicy joinPolicy;
  final CommunityStatus status;

  /// The platform's rejection note — sent to the owner only.
  final String? decisionNote;
  final String? clubName;
  final int memberCount;

  /// Set only for ACTIVE members of an approved (or suspended) community.
  final String? conversationId;
  final int? distanceKm;
  final CommunityMembership? myMembership;

  bool get isMember => myMembership?.isActive ?? false;
  bool get hasPendingRequest =>
      myMembership != null && !myMembership!.isActive;

  factory Community.fromJson(Map<String, dynamic> json) => Community(
    id: json['id'] as String,
    type: CommunityType.fromJson(json['type'] as String),
    name: json['name'] as String,
    city: json['city'] as String,
    frequency: CommunityFrequency.fromJson(json['frequency'] as String),
    about: json['about'] as String?,
    photoUrl: json['photoUrl'] as String?,
    joinPolicy: CommunityJoinPolicy.fromJson(json['joinPolicy'] as String),
    status: CommunityStatus.fromJson(json['status'] as String),
    decisionNote: json['decisionNote'] as String?,
    clubName: json['clubName'] as String?,
    memberCount: json['memberCount'] as int? ?? 0,
    conversationId: json['conversationId'] as String?,
    distanceKm: (json['distanceKm'] as num?)?.round(),
    myMembership: json['myMembership'] == null
        ? null
        : CommunityMembership.fromJson(
            json['myMembership'] as Map<String, dynamic>,
          ),
  );
}

class CommunityMember {
  const CommunityMember({
    required this.userId,
    required this.displayName,
    required this.photoUrl,
    required this.level,
    required this.role,
    required this.since,
  });

  final String userId;
  final String displayName;
  final String? photoUrl;
  final double? level;
  final CommunityRole role;
  final DateTime since;

  factory CommunityMember.fromJson(Map<String, dynamic> json) =>
      CommunityMember(
        userId: json['userId'] as String,
        displayName: json['displayName'] as String,
        photoUrl: json['photoUrl'] as String?,
        level: (json['level'] as num?)?.toDouble(),
        role: CommunityRole.fromJson(json['role'] as String),
        since: DateTime.parse(json['since'] as String).toLocal(),
      );
}

class CommunityMembers {
  const CommunityMembers({required this.members, required this.requests});

  final List<CommunityMember> members;

  /// Pending join requests — only returned to the owner and admins.
  final List<CommunityMember> requests;
}

class CommunityLadder {
  const CommunityLadder({
    required this.id,
    required this.name,
    required this.entryCount,
    required this.myPosition,
  });

  final String id;
  final String name;
  final int entryCount;
  final int? myPosition;

  factory CommunityLadder.fromJson(Map<String, dynamic> json) =>
      CommunityLadder(
        id: json['id'] as String,
        name: json['name'] as String,
        entryCount: json['entryCount'] as int? ?? 0,
        myPosition: json['myPosition'] as int?,
      );
}

class CommunityCompetitions {
  const CommunityCompetitions({required this.leagues, required this.ladders});

  final List<League> leagues;
  final List<CommunityLadder> ladders;

  bool get isEmpty => leagues.isEmpty && ladders.isEmpty;
}

/// A disputed result in one of the community's leagues, for its owner and
/// admins to rule on.
class CommunityDispute {
  const CommunityDispute({
    required this.fixtureId,
    required this.sideAName,
    required this.sideBName,
  });

  final String fixtureId;
  final String sideAName;
  final String? sideBName;

  factory CommunityDispute.fromJson(Map<String, dynamic> json) {
    String nameOf(Map<String, dynamic>? player) => [
      player?['firstName'],
      player?['lastName'],
    ].whereType<String>().join(' ');
    return CommunityDispute(
      fixtureId: json['fixtureId'] as String,
      sideAName: nameOf(json['sideA'] as Map<String, dynamic>?),
      sideBName: json['sideB'] == null
          ? null
          : nameOf(json['sideB'] as Map<String, dynamic>),
    );
  }
}

/// Filters for the Community hub's discovery list.
class CommunityFilters {
  const CommunityFilters({this.nearMe = false, this.city, this.type, this.q});

  final bool nearMe;
  final String? city;
  final CommunityType? type;
  final String? q;

  bool get isEmpty =>
      !nearMe && city == null && type == null && (q?.isEmpty ?? true);

  CommunityFilters copyWith({
    bool? nearMe,
    String? Function()? city,
    CommunityType? Function()? type,
    String? Function()? q,
  }) => CommunityFilters(
    nearMe: nearMe ?? this.nearMe,
    city: city == null ? this.city : city(),
    type: type == null ? this.type : type(),
    q: q == null ? this.q : q(),
  );

  @override
  bool operator ==(Object other) =>
      other is CommunityFilters &&
      other.nearMe == nearMe &&
      other.city == city &&
      other.type == type &&
      other.q == q;

  @override
  int get hashCode => Object.hash(nearMe, city, type, q);
}

class CommunitiesRepository {
  CommunitiesRepository(this._dio);

  final Dio _dio;

  /// Radius for "Near me", in km.
  static const nearMeRadiusKm = 50;

  Future<List<Community>> search(
    CommunityFilters filters, {
    double? latitude,
    double? longitude,
  }) async {
    final query = <String, dynamic>{
      if (filters.city != null) 'city': filters.city,
      if (filters.type != null) 'type': filters.type!.wire,
      if (filters.q != null && filters.q!.trim().isNotEmpty)
        'q': filters.q!.trim(),
      if (latitude != null && longitude != null) ...{
        'latitude': latitude,
        'longitude': longitude,
        if (filters.nearMe) 'maxDistanceKm': nearMeRadiusKm,
      },
      'take': 50,
    };
    final data = await _get('/communities', query: query);
    return _communities(data);
  }

  Future<List<Community>> mine() async =>
      _communities(await _get('/communities/mine'));

  Future<Community> detail(String id) async =>
      Community.fromJson(await _get('/communities/$id'));

  Future<Community> create({
    required CommunityType type,
    required String name,
    required String city,
    required CommunityFrequency frequency,
    String? about,
    required CommunityJoinPolicy joinPolicy,
    double? latitude,
    double? longitude,
  }) async {
    final data = await _send(
      () => _dio.post(
        '/communities',
        data: {
          'type': type.wire,
          'name': name,
          'city': city,
          'frequency': frequency.wire,
          if (about != null && about.trim().isNotEmpty) 'about': about.trim(),
          'joinPolicy': joinPolicy.wire,
          if (latitude != null && longitude != null) ...{
            'latitude': latitude,
            'longitude': longitude,
          },
        },
      ),
    );
    return Community.fromJson(data);
  }

  Future<Community> update(
    String id, {
    String? name,
    String? city,
    CommunityFrequency? frequency,
    String? about,
    CommunityJoinPolicy? joinPolicy,
  }) async {
    final data = await _send(
      () => _dio.patch(
        '/communities/$id',
        data: {
          'name': ?name,
          'city': ?city,
          'frequency': ?frequency?.wire,
          'about': ?about,
          'joinPolicy': ?joinPolicy?.wire,
        },
      ),
    );
    return Community.fromJson(data);
  }

  Future<Community> uploadPhoto(String id, String filePath) async {
    final data = await _send(
      () async => _dio.post(
        '/communities/$id/photo',
        data: FormData.fromMap({
          'file': await MultipartFile.fromFile(filePath),
        }),
      ),
    );
    return Community.fromJson(data);
  }

  Future<Community> join(String id) async =>
      Community.fromJson(await _send(() => _dio.post('/communities/$id/join')));

  Future<void> cancelRequest(String id) =>
      _send(() => _dio.delete('/communities/$id/join'));

  /// True when leaving closed the community (the owner was its last member).
  Future<bool> leave(String id) async {
    final data = await _send(() => _dio.post('/communities/$id/leave'));
    return data['deleted'] as bool? ?? false;
  }

  Future<void> setMuted(String id, bool muted) =>
      _send(() => _dio.post('/communities/$id/${muted ? 'mute' : 'unmute'}'));

  Future<void> delete(String id) => _send(() => _dio.delete('/communities/$id'));

  /// Returns whether the viewer left as part of the report.
  Future<bool> report(
    String id, {
    required String reason,
    String? notes,
    required bool leave,
  }) async {
    final data = await _send(
      () => _dio.post(
        '/communities/$id/report',
        data: {
          'reason': reason,
          if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
          'leave': leave,
        },
      ),
    );
    return data['left'] as bool? ?? false;
  }

  Future<CommunityMembers> members(String id) async {
    final data = await _get('/communities/$id/members');
    List<CommunityMember> list(String key) => (data[key] as List<dynamic>)
        .map((m) => CommunityMember.fromJson(m as Map<String, dynamic>))
        .toList();
    return CommunityMembers(
      members: list('members'),
      requests: list('requests'),
    );
  }

  Future<void> approveRequest(String id, String userId) =>
      _send(() => _dio.post('/communities/$id/requests/$userId/approve'));

  Future<void> declineRequest(String id, String userId) =>
      _send(() => _dio.post('/communities/$id/requests/$userId/decline'));

  Future<void> removeMember(String id, String userId) =>
      _send(() => _dio.delete('/communities/$id/members/$userId'));

  Future<void> setRole(String id, String userId, CommunityRole role) => _send(
    () => _dio.patch(
      '/communities/$id/members/$userId',
      data: {'role': role.name.toUpperCase()},
    ),
  );

  Future<void> transferOwnership(String id, String userId) => _send(
    () => _dio.post('/communities/$id/transfer', data: {'userId': userId}),
  );

  Future<CommunityCompetitions> competitions(String id) async {
    final data = await _get('/communities/$id/competitions');
    return CommunityCompetitions(
      leagues: (data['leagues'] as List<dynamic>)
          .map((l) => League.fromJson(l as Map<String, dynamic>))
          .toList(),
      ladders: (data['ladders'] as List<dynamic>)
          .map((l) => CommunityLadder.fromJson(l as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<void> createLadder(
    String id, {
    required String name,
    required int challengeRange,
  }) => _send(
    () => _dio.post(
      '/communities/$id/ladders',
      data: {'name': name, 'challengeRange': challengeRange},
    ),
  );

  Future<void> createLeague(
    String id, {
    required String name,
    String? description,
    required DateTime registrationOpensAt,
    required DateTime registrationClosesAt,
    required DateTime startsAt,
    required int roundCount,
    required int roundIntervalDays,
    int? capacity,
  }) => _send(
    () => _dio.post(
      '/communities/$id/leagues',
      data: {
        'name': name,
        if (description != null && description.trim().isNotEmpty)
          'description': description.trim(),
        'registrationOpensAt': registrationOpensAt.toUtc().toIso8601String(),
        'registrationClosesAt': registrationClosesAt.toUtc().toIso8601String(),
        'startsAt': startsAt.toUtc().toIso8601String(),
        'roundCount': roundCount,
        'roundIntervalDays': roundIntervalDays,
        'capacity': ?capacity,
      },
    ),
  );

  Future<List<CommunityDispute>> disputes(String id) async {
    final data = await _get('/communities/$id/disputes');
    return (data['disputes'] as List<dynamic>)
        .map((d) => CommunityDispute.fromJson(d as Map<String, dynamic>))
        .toList();
  }

  /// `keepSubmitted`: uphold the score as first entered; otherwise the
  /// disputing player's version stands.
  Future<void> resolveDispute(
    String id,
    String fixtureId, {
    required bool keepSubmitted,
  }) => _send(
    () => _dio.patch(
      '/communities/$id/disputes/$fixtureId/resolve',
      data: {'ruling': keepSubmitted ? 'SUBMITTED' : 'DISPUTANT'},
    ),
  );

  List<Community> _communities(Map<String, dynamic> data) =>
      (data['communities'] as List<dynamic>)
          .map((c) => Community.fromJson(c as Map<String, dynamic>))
          .toList();

  Future<Map<String, dynamic>> _get(
    String path, {
    Map<String, dynamic>? query,
  }) => _send(() => _dio.get(path, queryParameters: query));

  Future<Map<String, dynamic>> _send(
    Future<Response<dynamic>> Function() call,
  ) async {
    try {
      final response = await call();
      final data = response.data;
      return data is Map<String, dynamic> ? data : <String, dynamic>{};
    } on DioException catch (e) {
      final body = e.response?.data;
      final message = body is Map ? body['message'] as Object? : null;
      final text = message is List ? message.join(' ') : message?.toString();
      throw AuthException(text ?? l10nNow.commonErrorGeneric);
    }
  }
}

final communitiesRepositoryProvider = Provider<CommunitiesRepository>((ref) {
  return CommunitiesRepository(ref.watch(dioClientProvider));
});
