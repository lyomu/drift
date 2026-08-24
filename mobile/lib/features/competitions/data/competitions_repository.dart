import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';
import '../../matches/data/matches_repository.dart';
import '../../players/data/players_repository.dart';

/// Mirrors the backend's derived `SeasonState` (`competitions/season-state.ts`)
/// — `RegistrationClosed` folds into `scheduled` there, since nothing
/// distinguishes the two once registration is purely time-derived.
enum SeasonState {
  draft,
  registrationOpen,
  scheduled,
  active,
  completed,
  cancelled;

  static SeasonState fromJson(String value) => switch (value) {
    'REGISTRATION_OPEN' => SeasonState.registrationOpen,
    'SCHEDULED' => SeasonState.scheduled,
    'ACTIVE' => SeasonState.active,
    'COMPLETED' => SeasonState.completed,
    'CANCELLED' => SeasonState.cancelled,
    _ => SeasonState.draft,
  };

  String get label => switch (this) {
    SeasonState.draft => 'Not yet open',
    SeasonState.registrationOpen => 'Registration open',
    SeasonState.scheduled => 'Starting soon',
    SeasonState.active => 'In progress',
    SeasonState.completed => 'Completed',
    SeasonState.cancelled => 'Cancelled',
  };
}

enum SeasonRegistrationStatus {
  enrolled,
  waitlisted,
  withdrawn;

  static SeasonRegistrationStatus fromJson(String value) => switch (value) {
    'WAITLISTED' => SeasonRegistrationStatus.waitlisted,
    'WITHDRAWN' => SeasonRegistrationStatus.withdrawn,
    _ => SeasonRegistrationStatus.enrolled,
  };
}

class LeagueSeasonRef {
  const LeagueSeasonRef({required this.id, required this.label});

  final String id;
  final String label;

  factory LeagueSeasonRef.fromJson(Map<String, dynamic> json) =>
      LeagueSeasonRef(id: json['id'] as String, label: json['label'] as String);
}

class League {
  const League({
    required this.id,
    required this.sport,
    required this.name,
    required this.description,
    required this.rulesText,
    required this.format,
    required this.seasons,
  });

  final String id;
  final String sport;
  final String name;
  final String? description;
  final String? rulesText;
  final String format;
  final List<LeagueSeasonRef> seasons;

  factory League.fromJson(Map<String, dynamic> json) => League(
    id: json['id'] as String,
    sport: json['sport'] as String,
    name: json['name'] as String,
    description: json['description'] as String?,
    rulesText: json['rulesText'] as String?,
    format: json['format'] as String,
    seasons: (json['seasons'] as List<dynamic>)
        .map((s) => LeagueSeasonRef.fromJson(s as Map<String, dynamic>))
        .toList(),
  );
}

class SeasonDetail {
  const SeasonDetail({
    required this.id,
    required this.leagueId,
    required this.leagueName,
    required this.label,
    required this.state,
    required this.registrationOpensAt,
    required this.registrationClosesAt,
    required this.startsAt,
    required this.roundCount,
    required this.enrolledCount,
    required this.capacity,
    required this.viewerRegistrationStatus,
  });

  final String id;
  final String leagueId;
  final String leagueName;
  final String label;
  final SeasonState state;
  final DateTime registrationOpensAt;
  final DateTime registrationClosesAt;
  final DateTime startsAt;
  final int roundCount;
  final int enrolledCount;
  final int? capacity;
  final SeasonRegistrationStatus? viewerRegistrationStatus;

  bool get isRegistered =>
      viewerRegistrationStatus == SeasonRegistrationStatus.enrolled ||
      viewerRegistrationStatus == SeasonRegistrationStatus.waitlisted;

  factory SeasonDetail.fromJson(Map<String, dynamic> json) => SeasonDetail(
    id: json['id'] as String,
    leagueId: json['leagueId'] as String,
    leagueName: json['leagueName'] as String,
    label: json['label'] as String,
    state: SeasonState.fromJson(json['state'] as String),
    registrationOpensAt: DateTime.parse(
      json['registrationOpensAt'] as String,
    ).toLocal(),
    registrationClosesAt: DateTime.parse(
      json['registrationClosesAt'] as String,
    ).toLocal(),
    startsAt: DateTime.parse(json['startsAt'] as String).toLocal(),
    roundCount: json['roundCount'] as int,
    enrolledCount: json['enrolledCount'] as int,
    capacity: json['capacity'] as int?,
    viewerRegistrationStatus: json['viewerRegistrationStatus'] == null
        ? null
        : SeasonRegistrationStatus.fromJson(
            json['viewerRegistrationStatus'] as String,
          ),
  );
}

class RegisteredPlayer {
  const RegisteredPlayer({required this.status, required this.player});

  final SeasonRegistrationStatus status;
  final PlayerSummary player;

  factory RegisteredPlayer.fromJson(Map<String, dynamic> json) =>
      RegisteredPlayer(
        status: SeasonRegistrationStatus.fromJson(json['status'] as String),
        player: PlayerSummary.fromJson(json['player'] as Map<String, dynamic>),
      );
}

class MySeasonSummary {
  const MySeasonSummary({
    required this.seasonId,
    required this.leagueId,
    required this.leagueName,
    required this.label,
    required this.state,
    required this.registrationStatus,
  });

  final String seasonId;
  final String leagueId;
  final String leagueName;
  final String label;
  final SeasonState state;
  final SeasonRegistrationStatus registrationStatus;

  factory MySeasonSummary.fromJson(Map<String, dynamic> json) =>
      MySeasonSummary(
        seasonId: json['seasonId'] as String,
        leagueId: json['leagueId'] as String,
        leagueName: json['leagueName'] as String,
        label: json['label'] as String,
        state: SeasonState.fromJson(json['state'] as String),
        registrationStatus: SeasonRegistrationStatus.fromJson(
          json['registrationStatus'] as String,
        ),
      );
}

class Fixture {
  const Fixture({
    required this.id,
    required this.sideA,
    required this.sideB,
    required this.isBye,
    required this.match,
  });

  final String id;
  final PlayerSummary sideA;
  final PlayerSummary? sideB;
  final bool isBye;
  final DriftMatch? match;

  factory Fixture.fromJson(Map<String, dynamic> json) => Fixture(
    id: json['id'] as String,
    sideA: PlayerSummary.fromJson(json['sideA'] as Map<String, dynamic>),
    sideB: json['sideB'] == null
        ? null
        : PlayerSummary.fromJson(json['sideB'] as Map<String, dynamic>),
    isBye: json['isBye'] as bool,
    match: json['match'] == null
        ? null
        : DriftMatch.fromJson(json['match'] as Map<String, dynamic>),
  );
}

class CompetitionRound {
  const CompetitionRound({
    required this.id,
    required this.seasonId,
    required this.index,
    required this.deadline,
    required this.openedAt,
    required this.closedAt,
    required this.fixtures,
  });

  final String id;
  final String seasonId;
  final int index;
  final DateTime deadline;
  final DateTime? openedAt;
  final DateTime? closedAt;
  final List<Fixture> fixtures;

  factory CompetitionRound.fromJson(Map<String, dynamic> json) =>
      CompetitionRound(
        id: json['id'] as String,
        seasonId: json['seasonId'] as String,
        index: json['index'] as int,
        deadline: DateTime.parse(json['deadline'] as String).toLocal(),
        openedAt: json['openedAt'] == null
            ? null
            : DateTime.parse(json['openedAt'] as String).toLocal(),
        closedAt: json['closedAt'] == null
            ? null
            : DateTime.parse(json['closedAt'] as String).toLocal(),
        fixtures: (json['fixtures'] as List<dynamic>)
            .map((f) => Fixture.fromJson(f as Map<String, dynamic>))
            .toList(),
      );
}

class StandingRow {
  const StandingRow({
    required this.userId,
    required this.displayName,
    required this.rank,
    required this.points,
    required this.wins,
    required this.losses,
    required this.previousRank,
  });

  final String userId;
  final String displayName;
  final int rank;
  final int points;
  final int wins;
  final int losses;
  final int? previousRank;

  /// Positive means moved up (a lower rank number is better).
  int get movement => previousRank == null ? 0 : previousRank! - rank;

  factory StandingRow.fromJson(Map<String, dynamic> json) => StandingRow(
    userId: json['userId'] as String,
    displayName: json['displayName'] as String,
    rank: json['rank'] as int,
    points: json['points'] as int,
    wins: json['wins'] as int,
    losses: json['losses'] as int,
    previousRank: json['previousRank'] as int?,
  );
}

class CompetitionsRepository {
  CompetitionsRepository(this._dio);

  final Dio _dio;

  Future<List<League>> listLeagues() async {
    final data = await _send(() => _dio.get('/leagues'));
    return (data['leagues'] as List<dynamic>)
        .map((l) => League.fromJson(l as Map<String, dynamic>))
        .toList();
  }

  Future<League> getLeague(String id) async =>
      League.fromJson(await _send(() => _dio.get('/leagues/$id')));

  Future<SeasonDetail> getSeason(String id) async =>
      SeasonDetail.fromJson(await _send(() => _dio.get('/seasons/$id')));

  Future<List<RegisteredPlayer>> getRegisteredPlayers(String seasonId) async {
    final data = await _send(
      () => _dio.get('/seasons/$seasonId/registrations'),
    );
    return (data['players'] as List<dynamic>)
        .map((p) => RegisteredPlayer.fromJson(p as Map<String, dynamic>))
        .toList();
  }

  Future<SeasonRegistrationStatus> register(String seasonId) async {
    final data = await _send(() => _dio.post('/seasons/$seasonId/register'));
    return SeasonRegistrationStatus.fromJson(data['status'] as String);
  }

  Future<void> withdraw(String seasonId) =>
      _send(() => _dio.delete('/seasons/$seasonId/register'));

  Future<List<MySeasonSummary>> getMySeasons() async {
    final data = await _send(() => _dio.get('/me/seasons'));
    return (data['seasons'] as List<dynamic>)
        .map((s) => MySeasonSummary.fromJson(s as Map<String, dynamic>))
        .toList();
  }

  Future<CompetitionRound?> getCurrentRound(String seasonId) async {
    final data = await _send(
      () => _dio.get('/seasons/$seasonId/rounds/current'),
    );
    return data['round'] == null
        ? null
        : CompetitionRound.fromJson(data['round'] as Map<String, dynamic>);
  }

  Future<CompetitionRound> getRound(String seasonId, String roundId) async {
    final data = await _send(
      () => _dio.get('/seasons/$seasonId/rounds/$roundId'),
    );
    return CompetitionRound.fromJson(data['round'] as Map<String, dynamic>);
  }

  Future<List<StandingRow>> getStandings(String seasonId) async {
    final data = await _send(() => _dio.get('/seasons/$seasonId/standings'));
    return (data['standings'] as List<dynamic>)
        .map((s) => StandingRow.fromJson(s as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> _send(
    Future<Response<dynamic>> Function() call,
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

final competitionsRepositoryProvider = Provider<CompetitionsRepository>((ref) {
  return CompetitionsRepository(ref.watch(dioClientProvider));
});
