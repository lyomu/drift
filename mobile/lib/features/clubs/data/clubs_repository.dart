import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';
import '../../courts/data/courts_repository.dart';

class ClubSummary {
  const ClubSummary({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.distanceKm,
    required this.verificationStatus,
    required this.courtCount,
  });

  final String id;
  final String name;
  final String? address;
  final double? latitude;
  final double? longitude;
  final double? distanceKm;
  final ListingVerificationStatus verificationStatus;
  final int courtCount;

  factory ClubSummary.fromJson(Map<String, dynamic> json) => ClubSummary(
    id: json['id'] as String,
    name: json['name'] as String,
    address: json['address'] as String?,
    latitude: (json['latitude'] as num?)?.toDouble(),
    longitude: (json['longitude'] as num?)?.toDouble(),
    distanceKm: (json['distanceKm'] as num?)?.toDouble(),
    verificationStatus: ListingVerificationStatus.fromJson(
      json['verificationStatus'] as String,
    ),
    courtCount: json['courtCount'] as int,
  );
}

/// Mirrors the backend `ClubMembershipStatus`, plus `none` for "not a
/// member" (the API sends null).
enum ClubMembership {
  none,
  invited,
  pending,
  active,
  suspended;

  static ClubMembership fromJson(String? raw) => switch (raw) {
    'INVITED' => ClubMembership.invited,
    'PENDING' => ClubMembership.pending,
    'ACTIVE' => ClubMembership.active,
    'SUSPENDED' => ClubMembership.suspended,
    _ => ClubMembership.none,
  };

  /// Only ACTIVE members can read announcements or the feed — anything else
  /// gets a 403 from the membership guard.
  bool get canSeeCommunity => this == ClubMembership.active;
}

class ClubPostAuthor {
  const ClubPostAuthor({required this.id, required this.name, this.photoUrl});

  final String id;
  final String name;
  final String? photoUrl;

  factory ClubPostAuthor.fromJson(Map<String, dynamic> json) => ClubPostAuthor(
    id: json['id'] as String,
    name: json['name'] as String,
    photoUrl: json['photoUrl'] as String?,
  );
}

class ClubPostReaction {
  const ClubPostReaction({
    required this.emoji,
    required this.count,
    required this.mine,
  });

  final String emoji;
  final int count;
  final bool mine;

  factory ClubPostReaction.fromJson(Map<String, dynamic> json) =>
      ClubPostReaction(
        emoji: json['emoji'] as String,
        count: json['count'] as int,
        mine: json['mine'] as bool,
      );
}

class ClubPost {
  const ClubPost({
    required this.id,
    required this.body,
    required this.createdAt,
    required this.author,
    required this.isMine,
    required this.reactions,
  });

  final String id;
  final String body;
  final DateTime createdAt;

  /// Null once the author deletes their account — the post stays readable.
  final ClubPostAuthor? author;
  final bool isMine;
  final List<ClubPostReaction> reactions;

  factory ClubPost.fromJson(Map<String, dynamic> json) => ClubPost(
    id: json['id'] as String,
    body: json['body'] as String,
    createdAt: DateTime.parse(json['createdAt'] as String),
    author: json['author'] == null
        ? null
        : ClubPostAuthor.fromJson(json['author'] as Map<String, dynamic>),
    isMine: json['isMine'] as bool,
    reactions: (json['reactions'] as List<dynamic>)
        .map((r) => ClubPostReaction.fromJson(r as Map<String, dynamic>))
        .toList(),
  );
}

class Announcement {
  const Announcement({
    required this.id,
    required this.title,
    required this.body,
    required this.pinned,
    required this.publishedAt,
  });

  final String id;
  final String title;
  final String body;
  final bool pinned;
  final DateTime? publishedAt;

  factory Announcement.fromJson(Map<String, dynamic> json) => Announcement(
    id: json['id'] as String,
    title: json['title'] as String,
    body: json['body'] as String,
    pinned: json['pinned'] as bool? ?? false,
    publishedAt: json['publishedAt'] == null
        ? null
        : DateTime.parse(json['publishedAt'] as String),
  );
}

class ClubProfile {
  const ClubProfile({
    required this.summary,
    required this.membership,
    required this.description,
    required this.phone,
    required this.website,
    required this.amenities,
    required this.openingHoursNote,
    required this.photoUrls,
    required this.courts,
  });

  final ClubSummary summary;
  final ClubMembership membership;
  final String? description;
  final String? phone;
  final String? website;
  final List<String> amenities;
  final String? openingHoursNote;
  final List<String> photoUrls;

  /// May be empty — a club owning no court is still a valid, browsable
  /// profile, not an error (Court and Club are independently discoverable).
  final List<CourtSummary> courts;

  factory ClubProfile.fromJson(Map<String, dynamic> json) => ClubProfile(
    summary: ClubSummary.fromJson(json),
    membership: ClubMembership.fromJson(json['membershipStatus'] as String?),
    description: json['description'] as String?,
    phone: json['phone'] as String?,
    website: json['website'] as String?,
    amenities: (json['amenities'] as List<dynamic>).cast<String>(),
    openingHoursNote: json['openingHoursNote'] as String?,
    photoUrls: (json['photoUrls'] as List<dynamic>).cast<String>(),
    courts: (json['courts'] as List<dynamic>)
        .map((c) => CourtSummary.fromJson(c as Map<String, dynamic>))
        .toList(),
  );
}

class ClubSearchResult {
  const ClubSearchResult({required this.total, required this.clubs});

  final int total;
  final List<ClubSummary> clubs;
}

class ClubsRepository {
  ClubsRepository(this._dio);

  final Dio _dio;

  Future<ClubSearchResult> search(LatLng? center, {String? search}) async {
    final query = {
      if (center != null) 'latitude': center.latitude,
      if (center != null) 'longitude': center.longitude,
      if (search != null && search.isNotEmpty) 'search': search,
    };
    final data = await _get('/clubs', query: query);
    final clubs = data['clubs'] as List<dynamic>;
    return ClubSearchResult(
      total: data['total'] as int,
      clubs: clubs
          .map((c) => ClubSummary.fromJson(c as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<ClubProfile> findOne(String id, {LatLng? viewerLocation}) async {
    final data = await _get(
      '/clubs/$id',
      query: viewerLocation != null
          ? {
              'latitude': viewerLocation.latitude,
              'longitude': viewerLocation.longitude,
            }
          : null,
    );
    return ClubProfile.fromJson(data);
  }

  // ------------------------------------------------------------ community

  /// Join is a *request* — it lands as PENDING until a club admin approves.
  Future<void> requestToJoin(String clubId) =>
      _send(() => _dio.post('/clubs/$clubId/join'));

  /// Withdraws a pending request, or leaves a club outright.
  Future<void> leave(String clubId) =>
      _send(() => _dio.delete('/clubs/$clubId/join'));

  Future<List<Announcement>> announcements(String clubId) async {
    final data = await _get('/clubs/$clubId/announcements');
    return (data['announcements'] as List<dynamic>)
        .map((a) => Announcement.fromJson(a as Map<String, dynamic>))
        .toList();
  }

  Future<List<ClubPost>> feed(String clubId) async {
    final data = await _get('/clubs/$clubId/posts');
    return (data['posts'] as List<dynamic>)
        .map((p) => ClubPost.fromJson(p as Map<String, dynamic>))
        .toList();
  }

  Future<void> post(String clubId, String body) =>
      _send(() => _dio.post('/clubs/$clubId/posts', data: {'body': body}));

  Future<void> deletePost(String clubId, String postId) =>
      _send(() => _dio.delete('/clubs/$clubId/posts/$postId'));

  /// Reactions toggle — the server upserts, so re-adding is harmless.
  Future<void> react(String clubId, String postId, String emoji) => _send(
    () => _dio.post(
      '/clubs/$clubId/posts/$postId/reactions',
      data: {'emoji': emoji},
    ),
  );

  Future<void> unreact(String clubId, String postId, String emoji) => _send(
    () => _dio.delete(
      '/clubs/$clubId/posts/$postId/reactions',
      data: {'emoji': emoji},
    ),
  );

  /// For the write paths, which return either nothing or a body we ignore.
  Future<void> _send(Future<Response<dynamic>> Function() call) async {
    try {
      await call();
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

  Future<Map<String, dynamic>> _get(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: query);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw AuthException(_messageFrom(e));
    }
  }
}

final clubsRepositoryProvider = Provider<ClubsRepository>((ref) {
  return ClubsRepository(ref.watch(dioClientProvider));
});
