import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';
import '../../matches/data/player_stats.dart';

/// How the viewer stands relative to a player. Mirrors the backend's
/// `ConnectionState` union in `players/player.mapper.ts` — named with a
/// `Player` prefix here because Flutter's `material.dart` already exports a
/// `ConnectionState` for async snapshots.
enum PlayerConnectionState {
  none,
  pendingOutgoing,
  pendingIncoming,
  connected;

  static PlayerConnectionState fromJson(String value) => switch (value) {
    'PENDING_OUTGOING' => PlayerConnectionState.pendingOutgoing,
    'PENDING_INCOMING' => PlayerConnectionState.pendingIncoming,
    'CONNECTED' => PlayerConnectionState.connected,
    _ => PlayerConnectionState.none,
  };
}

class PlayerSummary {
  const PlayerSummary({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.photoUrl,
    required this.level,
    required this.levelLabel,
    required this.generalLocation,
    required this.distanceBand,
    required this.preferredClubName,
    required this.formatPreference,
    required this.stylePreference,
    required this.availabilitySummary,
  });

  final String id;
  final String? firstName;
  final String? lastName;
  final String? photoUrl;
  final double? level;
  final String? levelLabel;
  final String? generalLocation;
  final String? distanceBand;
  final String? preferredClubName;
  final String? formatPreference;
  final String? stylePreference;
  final String? availabilitySummary;

  String get displayName {
    final parts = [
      firstName,
      lastName,
    ].whereType<String>().where((p) => p.isNotEmpty);
    return parts.isEmpty ? 'Player' : parts.join(' ');
  }

  factory PlayerSummary.fromJson(Map<String, dynamic> json) => PlayerSummary(
    id: json['id'] as String,
    firstName: json['firstName'] as String?,
    lastName: json['lastName'] as String?,
    photoUrl: json['photoUrl'] as String?,
    level: (json['level'] as num?)?.toDouble(),
    levelLabel: json['levelLabel'] as String?,
    generalLocation: json['generalLocation'] as String?,
    distanceBand: json['distanceBand'] as String?,
    preferredClubName: json['preferredClubName'] as String?,
    formatPreference: json['formatPreference'] as String?,
    stylePreference: json['stylePreference'] as String?,
    availabilitySummary: json['availabilitySummary'] as String?,
  );
}

class AvailabilitySlot {
  const AvailabilitySlot({required this.dayOfWeek, required this.timeBlock});

  final int dayOfWeek;
  final String timeBlock;

  factory AvailabilitySlot.fromJson(Map<String, dynamic> json) =>
      AvailabilitySlot(
        dayOfWeek: json['dayOfWeek'] as int,
        timeBlock: json['timeBlock'] as String,
      );
}

class PlayerProfile {
  const PlayerProfile({
    required this.summary,
    required this.dominantHand,
    required this.connectionState,
    required this.skillBreakdown,
    required this.availabilitySlots,
    required this.stats,
  });

  final PlayerSummary summary;
  final String? dominantHand;
  final PlayerConnectionState connectionState;

  /// `null` means "not visible to you" — gated to connections — as opposed
  /// to an empty map, which would mean "connected, but no data yet".
  final Map<String, num>? skillBreakdown;
  final List<AvailabilitySlot>? availabilitySlots;

  /// Not gated — ratings/stats aren't in Doc 6 §4's privacy-sensitive list
  /// the way skill breakdown is.
  final PlayerStats stats;

  factory PlayerProfile.fromJson(Map<String, dynamic> json) {
    final breakdown = json['skillBreakdown'] as Map<String, dynamic>?;
    final slots = json['availabilitySlots'] as List<dynamic>?;
    return PlayerProfile(
      summary: PlayerSummary.fromJson(json),
      dominantHand: json['dominantHand'] as String?,
      connectionState: PlayerConnectionState.fromJson(
        json['connectionState'] as String,
      ),
      skillBreakdown: breakdown?.map((k, v) => MapEntry(k, v as num)),
      availabilitySlots: slots
          ?.map((s) => AvailabilitySlot.fromJson(s as Map<String, dynamic>))
          .toList(),
      stats: PlayerStats.fromJson(json['stats'] as Map<String, dynamic>),
    );
  }
}

/// Discovery filters. All null means "no filter" — the default search.
class PlayerFilters {
  const PlayerFilters({
    this.maxDistanceKm,
    this.levelMin,
    this.levelMax,
    this.formatPreference,
    this.stylePreference,
    this.clubName,
  });

  final int? maxDistanceKm;
  final double? levelMin;
  final double? levelMax;
  final String? formatPreference;
  final String? stylePreference;
  final String? clubName;

  bool get isEmpty =>
      maxDistanceKm == null &&
      levelMin == null &&
      levelMax == null &&
      formatPreference == null &&
      stylePreference == null &&
      (clubName == null || clubName!.isEmpty);

  PlayerFilters copyWith({
    int? maxDistanceKm,
    double? levelMin,
    double? levelMax,
    String? formatPreference,
    String? stylePreference,
    String? clubName,
    bool clearDistance = false,
    bool clearLevel = false,
    bool clearFormat = false,
    bool clearStyle = false,
  }) => PlayerFilters(
    maxDistanceKm: clearDistance ? null : (maxDistanceKm ?? this.maxDistanceKm),
    levelMin: clearLevel ? null : (levelMin ?? this.levelMin),
    levelMax: clearLevel ? null : (levelMax ?? this.levelMax),
    formatPreference: clearFormat
        ? null
        : (formatPreference ?? this.formatPreference),
    stylePreference: clearStyle
        ? null
        : (stylePreference ?? this.stylePreference),
    clubName: clubName ?? this.clubName,
  );

  Map<String, dynamic> toQuery() => {
    if (maxDistanceKm != null) 'maxDistanceKm': maxDistanceKm,
    if (levelMin != null) 'levelMin': levelMin,
    if (levelMax != null) 'levelMax': levelMax,
    if (formatPreference != null) 'formatPreference': formatPreference,
    if (stylePreference != null) 'stylePreference': stylePreference,
    if (clubName != null && clubName!.isNotEmpty) 'clubName': clubName,
  };
}

class PlayersRepository {
  PlayersRepository(this._dio);

  final Dio _dio;

  Future<List<PlayerSummary>> search(PlayerFilters filters) async {
    final data = await _get('/players', query: filters.toQuery());
    final players = data['players'] as List<dynamic>;
    return players
        .map((p) => PlayerSummary.fromJson(p as Map<String, dynamic>))
        .toList();
  }

  Future<PlayerProfile> findOne(String id) async {
    final data = await _get('/players/$id');
    return PlayerProfile.fromJson(data);
  }

  /// Own Profile (Phase M12) — `GET /players/me`, distinct from [findOne]
  /// because that endpoint gates skill breakdown/availability behind a real
  /// connection, which a viewer never has with themselves.
  Future<PlayerProfile> findOwn() async {
    final data = await _get('/players/me');
    return PlayerProfile.fromJson(data);
  }

  Future<Map<String, dynamic>> _get(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: query);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      final body = e.response?.data;
      final message = body is Map ? body['message'] as Object? : null;
      final text = message is List ? message.join(' ') : message?.toString();
      throw AuthException(text ?? 'Something went wrong. Please try again.');
    }
  }
}

final playersRepositoryProvider = Provider<PlayersRepository>((ref) {
  return PlayersRepository(ref.watch(dioClientProvider));
});
