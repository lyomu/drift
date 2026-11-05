import 'package:drift_tennis/core/router/app_router.dart';
import 'package:drift_tennis/features/matches/application/matches_providers.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('legacy Play links', () {
    test('tab=compete opens the merged Play tab', () {
      expect(homeTabIndex(Uri.parse('/home?tab=compete')), 1);
    });

    test('tab=play with play=find redirects into Discover players', () {
      expect(
        legacyHomeRedirect(Uri.parse('/home?tab=play&play=find')),
        '/home?tab=discover&discover=players',
      );
    });

    test('bare play=active opens Play with the Active match filter', () {
      final uri = Uri.parse('/home?play=active');
      expect(homeTabIndex(uri), 1);
      expect(homeMatchFilter(uri), MatchSegment.active);
    });

    test('bare play=find also redirects into Discover players', () {
      expect(
        legacyHomeRedirect(Uri.parse('/home?play=find')),
        '/home?tab=discover&discover=players',
      );
    });
  });
}
