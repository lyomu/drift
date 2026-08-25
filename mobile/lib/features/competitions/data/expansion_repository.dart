import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';

/// Wave 6 — tournaments + ladders data layer. Reuses the competitions
/// Dio client; models are minimal on purpose (the draw/standings detail
/// comes back nested from the API).
class TournamentSummary {
  const TournamentSummary({
    required this.id,
    required this.name,
    required this.state,
    required this.clubName,
    required this.drawSize,
    required this.entryCount,
  });

  final String id;
  final String name;
  final String state;
  final String clubName;
  final int drawSize;
  final int entryCount;

  factory TournamentSummary.fromJson(Map<String, dynamic> json) =>
      TournamentSummary(
        id: json['id'] as String,
        name: json['name'] as String,
        state: json['state'] as String,
        clubName: (json['club'] as Map<String, dynamic>)['name'] as String? ?? '',
        drawSize: json['drawSize'] as int,
        entryCount: (json['_count'] as Map<String, dynamic>)['entries'] as int? ?? 0,
      );
}

class LadderSummary {
  const LadderSummary({
    required this.id,
    required this.name,
    required this.clubName,
    required this.entryCount,
  });

  final String id;
  final String name;
  final String clubName;
  final int entryCount;

  factory LadderSummary.fromJson(Map<String, dynamic> json) => LadderSummary(
        id: json['id'] as String,
        name: json['name'] as String,
        clubName: (json['club'] as Map<String, dynamic>)['name'] as String? ?? '',
        entryCount: (json['_count'] as Map<String, dynamic>)['entries'] as int? ?? 0,
      );
}

class TournamentDetail {
  const TournamentDetail({required this.tournament, required this.rounds});

  final TournamentSummary tournament;
  final List<TournamentRoundData> rounds;

  factory TournamentDetail.fromJson(Map<String, dynamic> json) =>
      TournamentDetail(
        tournament: TournamentSummary.fromJson(json['tournament']),
        rounds: (json['tournament']['rounds'] as List<dynamic>)
            .map((r) => TournamentRoundData.fromJson(r))
            .toList(),
      );
}

class TournamentRoundData {
  const TournamentRoundData({required this.index, required this.fixtures});

  final int index;
  final List<TournamentFixtureData> fixtures;

  factory TournamentRoundData.fromJson(Map<String, dynamic> json) =>
      TournamentRoundData(
        index: json['index'] as int,
        fixtures: (json['fixtures'] as List<dynamic>)
            .map((f) => TournamentFixtureData.fromJson(f))
            .toList(),
      );
}

class TournamentFixtureData {
  const TournamentFixtureData({
    required this.slotIndex,
    required this.isBye,
    this.sideAName,
    this.sideBName,
    this.winnerUserId,
    this.matchId,
  });

  final int slotIndex;
  final bool isBye;
  final String? sideAName;
  final String? sideBName;
  final String? winnerUserId;
  final String? matchId;

  factory TournamentFixtureData.fromJson(Map<String, dynamic> json) {
    String? name(Map<String, dynamic>? u) => u == null
        ? null
        : [u['firstName'], u['lastName']].whereType<String>().join(' ');
    return TournamentFixtureData(
      slotIndex: json['slotIndex'] as int,
      isBye: json['isBye'] as bool,
      sideAName: name(json['sideA']),
      sideBName: name(json['sideB']),
      winnerUserId: json['winnerUserId'] as String?,
      matchId: json['matchId'] as String?,
    );
  }
}

class LadderDetail {
  const LadderDetail({required this.ladder, required this.entries});

  final LadderSummary ladder;
  final List<LadderEntryData> entries;

  factory LadderDetail.fromJson(Map<String, dynamic> json) => LadderDetail(
        ladder: LadderSummary.fromJson(json['ladder']),
        entries: (json['ladder']['entries'] as List<dynamic>)
            .map((e) => LadderEntryData.fromJson(e))
            .toList(),
      );
}

class LadderEntryData {
  const LadderEntryData({
    required this.userId,
    required this.position,
    required this.wins,
    required this.losses,
    required this.name,
    required this.isMe,
  });

  final String userId;
  final int position;
  final int wins;
  final int losses;
  final String name;
  final bool isMe;

  factory LadderEntryData.fromJson(Map<String, dynamic> json) {
    final u = json['user'] as Map<String, dynamic>;
    return LadderEntryData(
      userId: u['id'] as String,
      position: json['position'] as int,
      wins: json['wins'] as int,
      losses: json['losses'] as int,
      name: [u['firstName'], u['lastName']].whereType<String>().join(' '),
      isMe: false,
    );
  }
}

// ---------------------------------------------------------------- providers

final tournamentsListProvider =
    FutureProvider.autoDispose<List<TournamentSummary>>((ref) async {
  final dio = ref.watch(dioClientProvider);
  final data = await dio.get('/tournaments');
  return (data.data['tournaments'] as List<dynamic>)
      .map((t) => TournamentSummary.fromJson(t as Map<String, dynamic>))
      .toList();
});

final tournamentDetailProvider =
    FutureProvider.autoDispose.family<TournamentDetail, String>((ref, id) async {
  final dio = ref.watch(dioClientProvider);
  final data = await dio.get('/tournaments/$id');
  return TournamentDetail.fromJson(data.data);
});

final laddersListProvider =
    FutureProvider.autoDispose<List<LadderSummary>>((ref) async {
  final dio = ref.watch(dioClientProvider);
  final data = await dio.get('/ladders');
  return (data.data['ladders'] as List<dynamic>)
      .map((l) => LadderSummary.fromJson(l as Map<String, dynamic>))
      .toList();
});

final ladderDetailProvider =
    FutureProvider.autoDispose.family<LadderDetail, String>((ref, id) async {
  final dio = ref.watch(dioClientProvider);
  final data = await dio.get('/ladders/$id');
  return LadderDetail.fromJson(data.data);
});

