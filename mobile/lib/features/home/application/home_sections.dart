import '../data/home_repository.dart';

/// Buckets the flat, priority-ordered `/home/feed` into the redesigned
/// Home's fixed sections. The server still decides *what* to surface; this
/// only decides *where each card goes* in the new layout.
class HomeSections {
  const HomeSections(this.cards);

  final List<HomeCard> cards;

  /// Prompts that need the user to act — rendered as the "Action needed" rail.
  static const _actionTypes = {
    'UNCONFIRMED_RESULT',
    'INCOMING_CHALLENGE',
    'LEAGUE_ROUND_DEADLINE',
    'PENDING_CONNECTION',
    'UNREAD_MESSAGES',
  };

  List<HomeCard> get actionNeeded =>
      cards.where((c) => _actionTypes.contains(c.type)).toList();

  HomeCard? get nextMatch => _first((c) => c.type == 'UPCOMING_MATCH');

  // Matched on `type`, not `data.kind`: PENDING_CONNECTION also carries a
  // `players` payload, and it must not stand in for the suggested opponents.
  HomeCard? get players => _first((c) => c.type == 'SUGGESTED_OPPONENTS');
  HomeCard? get courts => _first((c) => c.type == 'NEARBY_COURTS');

  HomeCard? _first(bool Function(HomeCard) test) {
    for (final card in cards) {
      if (test(card)) return card;
    }
    return null;
  }
}
