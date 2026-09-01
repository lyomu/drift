import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';
import '../../players/data/players_repository.dart';
import 'player_stats.dart';

/// Mirrors the backend `MatchState` enum. The post-play states (settled by
/// M7's result flow) were declared in M6 because Doc 6 §1 models matches as
/// one entity.
enum MatchState {
  proposed,
  scheduling,
  scheduled,
  rescheduled,
  cancelled,
  expired,
  completed,
  walkover,
  retired,
  disputed;

  static MatchState fromJson(String value) => MatchState.values.firstWhere(
    (s) => s.name.toUpperCase() == value,
    orElse: () => MatchState.proposed,
  );

  String get label => switch (this) {
    MatchState.proposed => 'Awaiting reply',
    MatchState.scheduling => 'Agreeing a time',
    MatchState.scheduled => 'Scheduled',
    MatchState.rescheduled => 'Rescheduling',
    MatchState.cancelled => 'Cancelled',
    MatchState.expired => 'Expired',
    MatchState.completed => 'Played',
    MatchState.walkover => 'Walkover',
    MatchState.retired => 'Retired',
    MatchState.disputed => 'Disputed',
  };
}

enum ParticipantStatus {
  invited,
  accepted,
  declined;

  static ParticipantStatus fromJson(String value) =>
      ParticipantStatus.values.firstWhere(
        (s) => s.name.toUpperCase() == value,
        orElse: () => ParticipantStatus.invited,
      );
}

class MatchParticipant {
  const MatchParticipant({
    required this.userId,
    required this.side,
    required this.role,
    required this.status,
    required this.player,
  });

  final String userId;
  final String side;
  final String role;
  final ParticipantStatus status;
  final PlayerSummary player;

  factory MatchParticipant.fromJson(Map<String, dynamic> json) =>
      MatchParticipant(
        userId: json['userId'] as String,
        side: json['side'] as String,
        role: json['role'] as String,
        status: ParticipantStatus.fromJson(json['status'] as String),
        player: PlayerSummary.fromJson(json['player'] as Map<String, dynamic>),
      );
}

class TimeOption {
  const TimeOption({required this.id, required this.startsAt});

  final String id;
  final DateTime startsAt;

  factory TimeOption.fromJson(Map<String, dynamic> json) => TimeOption(
    id: json['id'] as String,
    startsAt: DateTime.parse(json['startsAt'] as String).toLocal(),
  );
}

class TimeProposal {
  const TimeProposal({
    required this.id,
    required this.round,
    required this.status,
    required this.proposedById,
    required this.acceptedOptionId,
    required this.options,
  });

  final String id;
  final int round;
  final String status;
  final String proposedById;
  final String? acceptedOptionId;
  final List<TimeOption> options;

  bool get isPending => status == 'PENDING';

  factory TimeProposal.fromJson(Map<String, dynamic> json) => TimeProposal(
    id: json['id'] as String,
    round: json['round'] as int,
    status: json['status'] as String,
    proposedById: json['proposedById'] as String,
    acceptedOptionId: json['acceptedOptionId'] as String?,
    options: (json['options'] as List<dynamic>)
        .map((o) => TimeOption.fromJson(o as Map<String, dynamic>))
        .toList(),
  );
}

/// A single set. No ITF-style legality validation — mirrors the backend's
/// "trust the score as entered" stance (`matches/score.ts`).
class SetScore {
  const SetScore({
    required this.sideAGames,
    required this.sideBGames,
    this.sideATiebreak,
    this.sideBTiebreak,
  });

  final int sideAGames;
  final int sideBGames;
  final int? sideATiebreak;
  final int? sideBTiebreak;

  factory SetScore.fromJson(Map<String, dynamic> json) => SetScore(
    sideAGames: json['sideAGames'] as int,
    sideBGames: json['sideBGames'] as int,
    sideATiebreak: json['sideATiebreak'] as int?,
    sideBTiebreak: json['sideBTiebreak'] as int?,
  );

  Map<String, dynamic> toJson() => {
    'sideAGames': sideAGames,
    'sideBGames': sideBGames,
    if (sideATiebreak != null) 'sideATiebreak': sideATiebreak,
    if (sideBTiebreak != null) 'sideBTiebreak': sideBTiebreak,
  };
}

/// Mirrors the backend `MatchResultOutcome` enum — "Report walkover/
/// retirement instead" is the alternative to a scored result.
enum ResultOutcome {
  score,
  walkover,
  retirement;

  String get wireValue => switch (this) {
    ResultOutcome.score => 'SCORE',
    ResultOutcome.walkover => 'WALKOVER',
    ResultOutcome.retirement => 'RETIREMENT',
  };

  static ResultOutcome fromJson(String value) => switch (value) {
    'WALKOVER' => ResultOutcome.walkover,
    'RETIREMENT' => ResultOutcome.retirement,
    _ => ResultOutcome.score,
  };
}

/// One row per match — mirrors `MatchResult` in the backend, which holds
/// both the submitted and (if disputed) the disputer's version rather than
/// a full submission history.
class MatchResult {
  const MatchResult({
    required this.status,
    required this.outcome,
    required this.sets,
    required this.winningSide,
    required this.submittedById,
    required this.disputedById,
    required this.disputantOutcome,
    required this.disputantSets,
    required this.disputantWinningSide,
    required this.ratingDeltaA,
    required this.ratingDeltaB,
  });

  final String status;
  final ResultOutcome outcome;
  final List<SetScore>? sets;
  final String? winningSide;
  final String submittedById;
  final String? disputedById;
  final ResultOutcome? disputantOutcome;
  final List<SetScore>? disputantSets;
  final String? disputantWinningSide;
  final double? ratingDeltaA;
  final double? ratingDeltaB;

  bool get isPendingConfirmation => status == 'PENDING_CONFIRMATION';
  bool get isDisputed => status == 'DISPUTED';

  static List<SetScore>? _sets(dynamic raw) => raw == null
      ? null
      : (raw as List<dynamic>)
            .map((s) => SetScore.fromJson(s as Map<String, dynamic>))
            .toList();

  factory MatchResult.fromJson(Map<String, dynamic> json) => MatchResult(
    status: json['status'] as String,
    outcome: ResultOutcome.fromJson(json['outcome'] as String),
    sets: _sets(json['sets']),
    winningSide: json['winningSide'] as String?,
    submittedById: json['submittedById'] as String,
    disputedById: json['disputedById'] as String?,
    disputantOutcome: json['disputantOutcome'] == null
        ? null
        : ResultOutcome.fromJson(json['disputantOutcome'] as String),
    disputantSets: _sets(json['disputantSets']),
    disputantWinningSide: json['disputantWinningSide'] as String?,
    ratingDeltaA: (json['ratingDeltaA'] as num?)?.toDouble(),
    ratingDeltaB: (json['ratingDeltaB'] as num?)?.toDouble(),
  );
}

/// Doc 6 §1's "competitionContext" hook — present only for fixture-generated
/// matches (Phase M8).
class MatchCompetitionContext {
  const MatchCompetitionContext({
    required this.leagueId,
    required this.leagueName,
    required this.roundId,
    required this.roundIndex,
  });

  final String leagueId;
  final String leagueName;
  final String roundId;
  final int roundIndex;

  factory MatchCompetitionContext.fromJson(Map<String, dynamic> json) =>
      MatchCompetitionContext(
        leagueId: json['leagueId'] as String,
        leagueName: json['leagueName'] as String,
        roundId: json['roundId'] as String,
        roundIndex: json['roundIndex'] as int,
      );
}

class DriftMatch {
  const DriftMatch({
    required this.id,
    required this.sport,
    required this.format,
    required this.state,
    required this.createdById,
    required this.confirmedTime,
    required this.courtName,
    required this.courtNote,
    required this.roundsRemaining,
    required this.conversationId,
    required this.viewerRole,
    required this.viewerStatus,
    required this.participants,
    required this.latestProposal,
    required this.cancelReason,
    required this.result,
    required this.competitionContext,
  });

  final String id;
  final String sport;
  final String format;
  final MatchState state;
  final String createdById;
  final DateTime? confirmedTime;
  final String? courtName;
  final String? courtNote;
  final int roundsRemaining;
  final String? conversationId;
  final String? viewerRole;
  final ParticipantStatus? viewerStatus;
  final List<MatchParticipant> participants;
  final TimeProposal? latestProposal;
  final String? cancelReason;
  final MatchResult? result;
  final MatchCompetitionContext? competitionContext;

  bool get isDoubles => format == 'DOUBLES';

  /// Everyone except the viewer — who the match is *against* (and with).
  List<MatchParticipant> othersFor(String viewerId) =>
      participants.where((p) => p.userId != viewerId).toList();

  /// The headline opponent, for compact list rendering.
  MatchParticipant? opponentFor(String viewerId) {
    final viewer = participants.where((p) => p.userId == viewerId).firstOrNull;
    if (viewer == null) return othersFor(viewerId).firstOrNull;
    return participants.where((p) => p.side != viewer.side).firstOrNull;
  }

  factory DriftMatch.fromJson(Map<String, dynamic> json) => DriftMatch(
    id: json['id'] as String,
    sport: json['sport'] as String,
    format: json['format'] as String,
    state: MatchState.fromJson(json['state'] as String),
    createdById: json['createdById'] as String,
    confirmedTime: json['confirmedTime'] == null
        ? null
        : DateTime.parse(json['confirmedTime'] as String).toLocal(),
    courtName: json['courtName'] as String?,
    courtNote: json['courtNote'] as String?,
    roundsRemaining: json['roundsRemaining'] as int? ?? 0,
    conversationId: json['conversationId'] as String?,
    viewerRole: json['viewerRole'] as String?,
    viewerStatus: json['viewerStatus'] == null
        ? null
        : ParticipantStatus.fromJson(json['viewerStatus'] as String),
    participants: (json['participants'] as List<dynamic>)
        .map((p) => MatchParticipant.fromJson(p as Map<String, dynamic>))
        .toList(),
    latestProposal: json['latestProposal'] == null
        ? null
        : TimeProposal.fromJson(json['latestProposal'] as Map<String, dynamic>),
    cancelReason: json['cancelReason'] as String?,
    result: json['result'] == null
        ? null
        : MatchResult.fromJson(json['result'] as Map<String, dynamic>),
    competitionContext: json['competitionContext'] == null
        ? null
        : MatchCompetitionContext.fromJson(
            json['competitionContext'] as Map<String, dynamic>,
          ),
  );
}

class MatchesRepository {
  MatchesRepository(this._dio);

  final Dio _dio;

  /// `sport` is only meaningful as `'PADEL'` — omitted (the default)
  /// returns every sport, matching this route's behavior from before M13.
  Future<List<DriftMatch>> list({String segment = 'all', String? sport}) async {
    final data = await _send(
      () => _dio.get(
        '/matches',
        queryParameters: {
          'segment': segment,
          if (sport != null) 'sport': sport,
        },
      ),
    );
    return (data['matches'] as List<dynamic>)
        .map((m) => DriftMatch.fromJson(m as Map<String, dynamic>))
        .toList();
  }

  Future<DriftMatch> findOne(String id) async =>
      DriftMatch.fromJson(await _send(() => _dio.get('/matches/$id')));

  /// `sport` omitted defaults to Tennis server-side — only sent when the
  /// challenger picked Padel (M13).
  Future<DriftMatch> challenge({
    required String opponentId,
    required String format,
    String? partnerId,
    String? note,
    String? sport,
  }) async => DriftMatch.fromJson(
    await _send(
      () => _dio.post(
        '/matches',
        data: {
          'opponentId': opponentId,
          'format': format,
          if (partnerId != null) 'partnerId': partnerId,
          if (note != null && note.isNotEmpty) 'note': note,
          if (sport != null) 'sport': sport,
        },
      ),
    ),
  );

  Future<DriftMatch> accept(String id, {String? partnerId}) async =>
      DriftMatch.fromJson(
        await _send(
          () => _dio.patch(
            '/matches/$id/accept',
            data: {if (partnerId != null) 'partnerId': partnerId},
          ),
        ),
      );

  Future<DriftMatch> decline(String id) async => DriftMatch.fromJson(
    await _send(() => _dio.patch('/matches/$id/decline')),
  );

  Future<DriftMatch> proposeTimes(String id, List<DateTime> options) async =>
      DriftMatch.fromJson(
        await _send(
          () => _dio.post(
            '/matches/$id/proposals',
            data: {
              'options': options
                  .map((o) => o.toUtc().toIso8601String())
                  .toList(),
            },
          ),
        ),
      );

  Future<DriftMatch> acceptTime(String id, String optionId) async =>
      DriftMatch.fromJson(
        await _send(
          () => _dio.patch(
            '/matches/$id/proposals/accept',
            data: {'optionId': optionId},
          ),
        ),
      );

  Future<DriftMatch> suggestCourt(
    String id, {
    required String courtName,
    String? courtNote,
  }) async => DriftMatch.fromJson(
    await _send(
      () => _dio.patch(
        '/matches/$id/court',
        data: {
          'courtName': courtName,
          if (courtNote != null && courtNote.isNotEmpty) 'courtNote': courtNote,
        },
      ),
    ),
  );

  Future<DriftMatch> reschedule(String id) async => DriftMatch.fromJson(
    await _send(() => _dio.patch('/matches/$id/reschedule')),
  );

  Future<DriftMatch> cancel(String id, {String? reason}) async =>
      DriftMatch.fromJson(
        await _send(
          () => _dio.patch(
            '/matches/$id/cancel',
            data: {if (reason != null && reason.isNotEmpty) 'reason': reason},
          ),
        ),
      );

  Future<DriftMatch> submitResult(
    String id, {
    required ResultOutcome outcome,
    List<SetScore>? sets,
    String? winningSide,
  }) async => DriftMatch.fromJson(
    await _send(
      () => _dio.post(
        '/matches/$id/results',
        data: _resultBody(outcome, sets, winningSide),
      ),
    ),
  );

  Future<DriftMatch> confirmResult(String id) async => DriftMatch.fromJson(
    await _send(() => _dio.patch('/matches/$id/results/confirm')),
  );

  Future<DriftMatch> disputeResult(
    String id, {
    required ResultOutcome outcome,
    List<SetScore>? sets,
    String? winningSide,
  }) async => DriftMatch.fromJson(
    await _send(
      () => _dio.patch(
        '/matches/$id/results/dispute',
        data: _resultBody(outcome, sets, winningSide),
      ),
    ),
  );

  Future<DriftMatch> resubmitResult(
    String id, {
    required ResultOutcome outcome,
    List<SetScore>? sets,
    String? winningSide,
  }) async => DriftMatch.fromJson(
    await _send(
      () => _dio.patch(
        '/matches/$id/results/resubmit',
        data: _resultBody(outcome, sets, winningSide),
      ),
    ),
  );

  Future<void> submitReflection(
    String id, {
    required int confidence,
    String? notes,
  }) => _send(
    () => _dio.post(
      '/matches/$id/reflection',
      data: {
        'confidence': confidence,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
    ),
  );

  Future<PlayerStats> getMyStats({String? sport}) async => PlayerStats.fromJson(
    await _send(
      () => _dio.get(
        '/me/stats',
        queryParameters: sport != null ? {'sport': sport} : null,
      ),
    ),
  );

  Map<String, dynamic> _resultBody(
    ResultOutcome outcome,
    List<SetScore>? sets,
    String? winningSide,
  ) => {
    'outcome': outcome.wireValue,
    if (sets != null) 'sets': sets.map((s) => s.toJson()).toList(),
    if (winningSide != null) 'winningSide': winningSide,
  };

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

final matchesRepositoryProvider = Provider<MatchesRepository>((ref) {
  return MatchesRepository(ref.watch(dioClientProvider));
});
