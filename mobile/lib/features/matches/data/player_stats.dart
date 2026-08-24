/// Mirrors the backend's `PlayerStats` (`matches/stats.util.ts`). Its own
/// file rather than living in `matches_repository.dart` or
/// `players_repository.dart` — both need it (my stats via `GET /me/stats`,
/// someone else's via their profile response), and those two files already
/// import each other for `PlayerSummary`/match participants, so a third
/// shared type has to sit outside either to avoid a cycle.
library;

class FormatStats {
  const FormatStats({
    required this.rating,
    required this.ratingLabel,
    required this.wins,
    required this.losses,
  });

  final double? rating;
  final String? ratingLabel;
  final int wins;
  final int losses;

  factory FormatStats.fromJson(Map<String, dynamic> json) => FormatStats(
    rating: (json['rating'] as num?)?.toDouble(),
    ratingLabel: json['ratingLabel'] as String?,
    wins: json['wins'] as int,
    losses: json['losses'] as int,
  );
}

class PlayerStats {
  const PlayerStats({
    required this.singles,
    required this.doubles,
    required this.recentForm,
  });

  final FormatStats singles;
  final FormatStats doubles;

  /// Most recent first.
  final List<String> recentForm;

  factory PlayerStats.fromJson(Map<String, dynamic> json) => PlayerStats(
    singles: FormatStats.fromJson(json['singles'] as Map<String, dynamic>),
    doubles: FormatStats.fromJson(json['doubles'] as Map<String, dynamic>),
    recentForm: (json['recentForm'] as List<dynamic>).cast<String>(),
  );
}
