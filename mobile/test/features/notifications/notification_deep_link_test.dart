import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/notifications/domain/notification_deep_link.dart';

/// This mapping is shared by the Notification Centre row and a push tap. The
/// point of the tests is that both paths resolve identically — a push that
/// opened somewhere else would be a confusing, hard-to-reproduce bug.
void main() {
  String? link(String? type, String? id) =>
      notificationDeepLink(relatedEntityType: type, relatedEntityId: id);

  test('maps every entity type the backend sends', () {
    expect(link('MATCH', 'm1'), '/matches/m1');
    expect(link('CONNECTION', null), '/connections/pending');
    expect(link('CONVERSATION', 'c1'), '/messages/c1');
    expect(link('LEAGUE', 'l1'), '/compete/leagues/l1');
    expect(link('SEASON', 's1'), '/compete/leagues/s1');
    expect(link('CLUB', 'club1'), '/discover/clubs/club1');
    expect(
      link('CLUB_ANNOUNCEMENT', 'club1'),
      '/discover/clubs/club1/announcements',
    );
  });

  test('returns null when an id is required but missing', () {
    // Better a caller that can say "nothing to open" than a route like
    // /matches/null, which renders an error screen.
    expect(link('MATCH', null), isNull);
    expect(link('CONVERSATION', null), isNull);
    expect(link('CLUB', null), isNull);
  });

  test('returns null for an unknown type rather than throwing', () {
    // A newer backend may send a type this build has never heard of. The tap
    // should fall back to "nothing to open", never crash the handler.
    expect(link('SOMETHING_NEW', 'x1'), isNull);
    expect(link(null, null), isNull);
  });

  test('CONNECTION ignores the id, since the route is a list', () {
    expect(link('CONNECTION', 'anything'), '/connections/pending');
  });
}
