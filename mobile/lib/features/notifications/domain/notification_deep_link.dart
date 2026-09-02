/// Maps a notification's related entity to the route that opens it.
///
/// Shared deliberately: a notification arrives by two routes — a row in the
/// Notification Centre and a push tap — and they must land in the same place.
/// Two copies of this mapping would drift the moment a new entity type is
/// added on one path and not the other.
///
/// Takes the raw wire fields rather than a model, because a push payload
/// carries only strings and never becomes a `DriftNotification`.
///
/// Returns null when there is nothing to open, which the caller should say out
/// loud rather than silently swallowing — a tap that does nothing reads as a
/// broken tap.
String? notificationDeepLink({
  required String? relatedEntityType,
  required String? relatedEntityId,
}) {
  final id = relatedEntityId;
  return switch (relatedEntityType) {
    'MATCH' when id != null => '/matches/$id',
    'CONNECTION' => '/connections/pending',
    'CONVERSATION' when id != null => '/messages/$id',
    'LEAGUE' when id != null => '/compete/leagues/$id',
    'SEASON' when id != null => '/compete/leagues/$id',
    // Both carry the club id — an announcement deep link opens that
    // club's Announcements list, where the new item sorts to the top.
    'CLUB' when id != null => '/discover/clubs/$id',
    'CLUB_ANNOUNCEMENT' when id != null => '/discover/clubs/$id/announcements',
    _ => null,
  };
}
