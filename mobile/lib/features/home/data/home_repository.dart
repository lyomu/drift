import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_client.dart';
import '../../auth/data/auth_repository.dart';
import '../../courts/data/courts_repository.dart';
import '../../players/data/players_repository.dart';

/// How loudly a card should render. Mirrors `backend/src/home/home-card.ts`.
enum HomeCardAccent { urgent, info, success, neutral }

HomeCardAccent _accentFrom(String? raw) => switch (raw) {
  'urgent' => HomeCardAccent.urgent,
  'info' => HomeCardAccent.info,
  'success' => HomeCardAccent.success,
  _ => HomeCardAccent.neutral,
};

class HomeCardAction {
  const HomeCardAction({required this.label, required this.route});

  final String label;
  final String route;

  factory HomeCardAction.fromJson(Map<String, dynamic> json) => HomeCardAction(
    label: json['label'] as String,
    route: json['route'] as String,
  );
}

/// The typed payload a rich card carries, discriminated on `kind` exactly as
/// the backend's `HomeCardData` union is. Unknown kinds parse to
/// [HomeCardData.unknown] rather than throwing — a card type added on the
/// server must never crash an older client, it should just render as its
/// title and body.
class HomeCardData {
  const HomeCardData({
    required this.kind,
    this.players = const [],
    this.courts = const [],
    this.storyId,
    this.headline,
    this.imageUrl,
    this.contentId,
    this.contentType,
    this.contentTitle,
    this.clubId,
    this.clubName,
    this.postId,
    this.earnedCount,
    this.totalCount,
    this.nextTitle,
    this.count,
    this.matchId,
    this.confirmedTime,
    this.courtLabel,
  });

  static const unknown = HomeCardData(kind: 'unknown');

  final String kind;
  final List<PlayerSummary> players;
  final List<CourtSummary> courts;
  final String? storyId;
  final String? headline;
  final String? imageUrl;
  final String? contentId;
  final String? contentType;
  final String? contentTitle;
  final String? clubId;
  final String? clubName;
  final String? postId;
  final int? earnedCount;
  final int? totalCount;
  final String? nextTitle;
  final int? count;
  final String? matchId;
  final DateTime? confirmedTime;
  final String? courtLabel;

  factory HomeCardData.fromJson(Map<String, dynamic> json) {
    final kind = json['kind'] as String? ?? 'unknown';
    switch (kind) {
      case 'players':
        return HomeCardData(
          kind: kind,
          players: (json['players'] as List<dynamic>? ?? [])
              .map((p) => PlayerSummary.fromJson(p as Map<String, dynamic>))
              .toList(),
        );
      case 'courts':
        return HomeCardData(
          kind: kind,
          courts: (json['courts'] as List<dynamic>? ?? [])
              .map((c) => CourtSummary.fromJson(c as Map<String, dynamic>))
              .toList(),
        );
      case 'story':
        return HomeCardData(
          kind: kind,
          storyId: json['storyId'] as String?,
          headline: json['headline'] as String?,
          imageUrl: json['imageUrl'] as String?,
        );
      case 'content':
        return HomeCardData(
          kind: kind,
          contentId: json['contentId'] as String?,
          contentType: json['contentType'] as String?,
          contentTitle: json['title'] as String?,
        );
      case 'announcement':
        return HomeCardData(
          kind: kind,
          clubId: json['clubId'] as String?,
          clubName: json['clubName'] as String?,
          postId: json['postId'] as String?,
        );
      case 'achievement':
        return HomeCardData(
          kind: kind,
          earnedCount: json['earnedCount'] as int?,
          totalCount: json['totalCount'] as int?,
          nextTitle: json['nextTitle'] as String?,
        );
      case 'counts':
        return HomeCardData(kind: kind, count: json['count'] as int?);
      case 'match':
        // Only the few fields Home actually renders are lifted out of the
        // full match DTO. The card links into Match Detail, which fetches
        // the whole thing — duplicating the entire parser here would mean
        // two places to keep in sync for no gain.
        final match = json['match'] as Map<String, dynamic>?;
        final court = match?['court'] as Map<String, dynamic>?;
        final rawTime = match?['confirmedTime'] as String?;
        return HomeCardData(
          kind: kind,
          matchId: match?['id'] as String?,
          confirmedTime: rawTime == null ? null : DateTime.tryParse(rawTime),
          courtLabel:
              (court?['name'] as String?) ?? (match?['courtName'] as String?),
        );
      default:
        return HomeCardData.unknown;
    }
  }
}

class HomeCard {
  const HomeCard({
    required this.id,
    required this.type,
    required this.priority,
    required this.title,
    required this.body,
    required this.accent,
    required this.dismissible,
    this.action,
    this.data,
  });

  final String id;
  final String type;
  final int priority;
  final String title;
  final String body;
  final HomeCardAccent accent;
  final bool dismissible;
  final HomeCardAction? action;
  final HomeCardData? data;

  factory HomeCard.fromJson(Map<String, dynamic> json) {
    final action = json['action'] as Map<String, dynamic>?;
    final data = json['data'] as Map<String, dynamic>?;
    return HomeCard(
      id: json['id'] as String,
      type: json['type'] as String,
      priority: json['priority'] as int,
      title: json['title'] as String,
      body: json['body'] as String? ?? '',
      accent: _accentFrom(json['accent'] as String?),
      dismissible: json['dismissible'] as bool? ?? false,
      action: action == null ? null : HomeCardAction.fromJson(action),
      data: data == null ? null : HomeCardData.fromJson(data),
    );
  }
}

/// The identity header above the feed — `GET /home/summary`.
class HomeSummary {
  const HomeSummary({
    required this.firstName,
    required this.level,
    required this.levelLabel,
    required this.singlesRating,
    required this.doublesRating,
    required this.goals,
  });

  final String? firstName;
  final double? level;
  final String? levelLabel;
  final double? singlesRating;
  final double? doublesRating;
  final List<String> goals;

  factory HomeSummary.fromJson(Map<String, dynamic> json) => HomeSummary(
    firstName: json['firstName'] as String?,
    level: (json['level'] as num?)?.toDouble(),
    levelLabel: json['levelLabel'] as String?,
    singlesRating: (json['singlesRating'] as num?)?.toDouble(),
    doublesRating: (json['doublesRating'] as num?)?.toDouble(),
    goals: (json['goals'] as List<dynamic>? ?? [])
        .map((g) => g as String)
        .toList(),
  );
}

class HomeRepository {
  HomeRepository(this._dio);

  final Dio _dio;

  Future<List<HomeCard>> getFeed() async {
    try {
      final response = await _dio.get('/home/feed');
      final data = response.data as Map<String, dynamic>;
      final cards = data['cards'] as List<dynamic>;
      return cards
          .map((c) => HomeCard.fromJson(c as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw AuthException(_message(e));
    }
  }

  Future<HomeSummary> getSummary() async {
    try {
      final response = await _dio.get('/home/summary');
      return HomeSummary.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw AuthException(_message(e));
    }
  }

  Future<void> dismissCard(String cardId, {int? snoozeHours}) async {
    try {
      await _dio.post(
        '/home/cards/$cardId/dismiss',
        data: snoozeHours == null ? null : {'snoozeHours': snoozeHours},
      );
    } on DioException catch (e) {
      throw AuthException(_message(e));
    }
  }

  String _message(DioException e) {
    final body = e.response?.data;
    final message = body is Map ? body['message'] as Object? : null;
    final text = message is List ? message.join(' ') : message?.toString();
    return text ?? 'Something went wrong. Please try again.';
  }
}

final homeRepositoryProvider = Provider<HomeRepository>((ref) {
  return HomeRepository(ref.watch(dioClientProvider));
});
