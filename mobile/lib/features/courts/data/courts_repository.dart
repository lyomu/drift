import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';

/// Mirrors the backend's `ListingVerificationStatus` — shared by Court and
/// Club.
enum ListingVerificationStatus {
  unverified,
  pending,
  verified;

  static ListingVerificationStatus fromJson(String value) => switch (value) {
    'PENDING' => ListingVerificationStatus.pending,
    'VERIFIED' => ListingVerificationStatus.verified,
    _ => ListingVerificationStatus.unverified,
  };

  String get label => switch (this) {
    ListingVerificationStatus.verified => 'Verified',
    ListingVerificationStatus.pending => 'Verification pending',
    ListingVerificationStatus.unverified => 'Unverified',
  };
}

/// Mirrors the backend's `CourtBookingType`.
enum CourtBookingType {
  unknown,
  contactOnly,
  externalLink,
  nativePartner;

  static CourtBookingType fromJson(String value) => switch (value) {
    'CONTACT_ONLY' => CourtBookingType.contactOnly,
    'EXTERNAL_LINK' => CourtBookingType.externalLink,
    'NATIVE_PARTNER' => CourtBookingType.nativePartner,
    _ => CourtBookingType.unknown,
  };
}

class CourtGroupSummary {
  const CourtGroupSummary({
    required this.id,
    required this.sport,
    required this.surface,
    required this.indoor,
    required this.lighting,
    required this.count,
  });

  final String id;
  final String sport;
  final String surface;
  final bool indoor;
  final bool lighting;
  final int count;

  factory CourtGroupSummary.fromJson(Map<String, dynamic> json) =>
      CourtGroupSummary(
        id: json['id'] as String,
        sport: json['sport'] as String,
        surface: json['surface'] as String,
        indoor: json['indoor'] as bool,
        lighting: json['lighting'] as bool,
        count: json['count'] as int,
      );
}

class ClubRef {
  const ClubRef({
    required this.id,
    required this.name,
    required this.verificationStatus,
  });

  final String id;
  final String name;
  final ListingVerificationStatus verificationStatus;

  factory ClubRef.fromJson(Map<String, dynamic> json) => ClubRef(
    id: json['id'] as String,
    name: json['name'] as String,
    verificationStatus: ListingVerificationStatus.fromJson(
      json['verificationStatus'] as String,
    ),
  );
}

class CourtSummary {
  const CourtSummary({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.distanceKm,
    required this.surfaces,
    required this.indoorAvailable,
    required this.outdoorAvailable,
    required this.verificationStatus,
    required this.bookingType,
    required this.clubId,
    required this.clubName,
  });

  final String id;
  final String name;
  final String? address;
  final double? latitude;
  final double? longitude;

  /// Courts are public venues, not private individuals — the server sends
  /// an exact distance here, unlike the coarse player distance band.
  final double? distanceKm;

  final List<String> surfaces;
  final bool indoorAvailable;
  final bool outdoorAvailable;
  final ListingVerificationStatus verificationStatus;
  final CourtBookingType bookingType;
  final String? clubId;
  final String? clubName;

  factory CourtSummary.fromJson(Map<String, dynamic> json) => CourtSummary(
    id: json['id'] as String,
    name: json['name'] as String,
    address: json['address'] as String?,
    latitude: (json['latitude'] as num?)?.toDouble(),
    longitude: (json['longitude'] as num?)?.toDouble(),
    distanceKm: (json['distanceKm'] as num?)?.toDouble(),
    surfaces: (json['surfaces'] as List<dynamic>).cast<String>(),
    indoorAvailable: json['indoorAvailable'] as bool,
    outdoorAvailable: json['outdoorAvailable'] as bool,
    verificationStatus: ListingVerificationStatus.fromJson(
      json['verificationStatus'] as String,
    ),
    bookingType: CourtBookingType.fromJson(json['bookingType'] as String),
    clubId: json['clubId'] as String?,
    clubName: json['clubName'] as String?,
  );
}

class CourtProfile {
  const CourtProfile({
    required this.summary,
    required this.phone,
    required this.website,
    required this.mapsUrl,
    required this.bookingUrl,
    required this.amenities,
    required this.openingHoursNote,
    required this.isPublic,
    required this.photoUrls,
    required this.courtGroups,
    required this.club,
  });

  final CourtSummary summary;
  final String? phone;
  final String? website;

  /// Curator-supplied maps link. Preferred over the lat/long directions URL
  /// when present.
  final String? mapsUrl;

  /// Null unless [CourtSummary.bookingType] is [CourtBookingType.externalLink]
  /// — never a fabricated link for any other booking type.
  final String? bookingUrl;

  final List<String> amenities;
  final String? openingHoursNote;

  /// Null means genuinely unknown — never guessed public or private.
  final bool? isPublic;

  final List<String> photoUrls;
  final List<CourtGroupSummary> courtGroups;
  final ClubRef? club;

  factory CourtProfile.fromJson(Map<String, dynamic> json) => CourtProfile(
    summary: CourtSummary.fromJson(json),
    phone: json['phone'] as String?,
    website: json['website'] as String?,
    mapsUrl: json['mapsUrl'] as String?,
    bookingUrl: json['bookingUrl'] as String?,
    amenities: (json['amenities'] as List<dynamic>).cast<String>(),
    openingHoursNote: json['openingHoursNote'] as String?,
    isPublic: json['isPublic'] as bool?,
    photoUrls: (json['photoUrls'] as List<dynamic>).cast<String>(),
    courtGroups: (json['courtGroups'] as List<dynamic>)
        .map((g) => CourtGroupSummary.fromJson(g as Map<String, dynamic>))
        .toList(),
    club: json['club'] != null
        ? ClubRef.fromJson(json['club'] as Map<String, dynamic>)
        : null,
  );
}

class CourtSearchResult {
  const CourtSearchResult({required this.total, required this.courts});

  final int total;
  final List<CourtSummary> courts;
}

/// Court discovery filters. All null/empty means "no filter" — the default
/// search. Deliberately does NOT hold latitude/longitude — those come from
/// the current map center (`mapCenterProvider`), which changes independently
/// of the filter set as the user pans the map.
class CourtFilters {
  const CourtFilters({
    this.maxDistanceKm,
    this.surfaces = const [],
    this.indoor,
    this.lighting,
    this.isPublic,
    this.hasBookingInfo,
    this.search,
  });

  final int? maxDistanceKm;
  final List<String> surfaces;
  final bool? indoor;
  final bool? lighting;
  final bool? isPublic;
  final bool? hasBookingInfo;
  final String? search;

  bool get isEmpty =>
      maxDistanceKm == null &&
      surfaces.isEmpty &&
      indoor == null &&
      lighting == null &&
      isPublic == null &&
      hasBookingInfo == null &&
      (search == null || search!.isEmpty);

  CourtFilters copyWith({
    int? maxDistanceKm,
    List<String>? surfaces,
    bool? indoor,
    bool? lighting,
    bool? isPublic,
    bool? hasBookingInfo,
    String? search,
    bool clearDistance = false,
    bool clearSurfaces = false,
    bool clearIndoor = false,
    bool clearLighting = false,
    bool clearIsPublic = false,
    bool clearHasBookingInfo = false,
  }) => CourtFilters(
    maxDistanceKm: clearDistance ? null : (maxDistanceKm ?? this.maxDistanceKm),
    surfaces: clearSurfaces ? const [] : (surfaces ?? this.surfaces),
    indoor: clearIndoor ? null : (indoor ?? this.indoor),
    lighting: clearLighting ? null : (lighting ?? this.lighting),
    isPublic: clearIsPublic ? null : (isPublic ?? this.isPublic),
    hasBookingInfo: clearHasBookingInfo
        ? null
        : (hasBookingInfo ?? this.hasBookingInfo),
    search: search ?? this.search,
  );

  Map<String, dynamic> toQuery() => {
    if (maxDistanceKm != null) 'maxDistanceKm': maxDistanceKm,
    if (surfaces.isNotEmpty) 'surfaces': surfaces,
    if (indoor != null) 'indoor': indoor,
    if (lighting != null) 'lighting': lighting,
    if (isPublic != null) 'isPublic': isPublic,
    if (hasBookingInfo != null) 'hasBookingInfo': hasBookingInfo,
    if (search != null && search!.isNotEmpty) 'search': search,
  };
}

class CourtsRepository {
  CourtsRepository(this._dio);

  final Dio _dio;

  Future<CourtSearchResult> search(LatLng? center, CourtFilters filters) async {
    final query = {
      if (center != null) 'latitude': center.latitude,
      if (center != null) 'longitude': center.longitude,
      ...filters.toQuery(),
    };
    final data = await _get('/courts', query: query);
    final courts = data['courts'] as List<dynamic>;
    return CourtSearchResult(
      total: data['total'] as int,
      courts: courts
          .map((c) => CourtSummary.fromJson(c as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<CourtProfile> findOne(String id, {LatLng? viewerLocation}) async {
    final data = await _get(
      '/courts/$id',
      query: viewerLocation != null
          ? {
              'latitude': viewerLocation.latitude,
              'longitude': viewerLocation.longitude,
            }
          : null,
    );
    return CourtProfile.fromJson(data);
  }

  Future<void> report(String id, {required String reason, String? notes}) =>
      _post('/courts/$id/report', {
        'reason': reason,
        if (notes != null) 'notes': notes,
      });

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

  Future<void> _post(String path, Map<String, dynamic> body) async {
    try {
      await _dio.post(path, data: body);
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

final courtsRepositoryProvider = Provider<CourtsRepository>((ref) {
  return CourtsRepository(ref.watch(dioClientProvider));
});
