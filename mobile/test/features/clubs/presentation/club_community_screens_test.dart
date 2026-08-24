import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/clubs/application/clubs_providers.dart';
import 'package:drift_tennis/features/clubs/data/clubs_repository.dart';
import 'package:drift_tennis/features/clubs/presentation/club_announcements_screen.dart';
import 'package:drift_tennis/features/clubs/presentation/club_feed_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

/// Both screens shipped in Wave 2 and have never been run on a device —
/// only compiled. These are the first thing to actually render them.
void main() {
  const clubId = 'club-1';

  group('ClubAnnouncementsScreen', () {
    for (final brightness in Brightness.values) {
      testWidgets('renders published announcements in ${brightness.name}', (
        tester,
      ) async {
        await pumpScreen(
          tester,
          const ClubAnnouncementsScreen(clubId: clubId),
          brightness: brightness,
          overrides: [
            clubAnnouncementsProvider(
              clubId,
            ).overrideWith((ref) async => [announcement()]),
          ],
        );

        expect(find.text('Announcements'), findsOneWidget);
        expect(find.text('Court closed'), findsOneWidget);
        expect(find.text('Court 3 is shut for maintenance.'), findsOneWidget);
      });
    }

    testWidgets('marks a pinned announcement', (tester) async {
      await pumpScreen(
        tester,
        const ClubAnnouncementsScreen(clubId: clubId),
        overrides: [
          clubAnnouncementsProvider(
            clubId,
          ).overrideWith((ref) async => [announcement(pinned: true)]),
        ],
      );

      expect(find.byIcon(Icons.push_pin), findsOneWidget);
    });

    testWidgets('does not show a pin on an ordinary announcement', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const ClubAnnouncementsScreen(clubId: clubId),
        overrides: [
          clubAnnouncementsProvider(
            clubId,
          ).overrideWith((ref) async => [announcement()]),
        ],
      );

      expect(find.byIcon(Icons.push_pin), findsNothing);
    });

    testWidgets('shows the empty state for a club with no announcements', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const ClubAnnouncementsScreen(clubId: clubId),
        overrides: [
          clubAnnouncementsProvider(clubId).overrideWith((ref) async => []),
        ],
      );

      expect(find.text('No announcements yet'), findsOneWidget);
    });

    // A non-member gets a 403 from the membership guard. That must read as
    // "join to see this", not as a crash.
    testWidgets('explains itself when the viewer is not a member', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const ClubAnnouncementsScreen(clubId: clubId),
        overrides: [
          clubAnnouncementsProvider(
            clubId,
          ).overrideWith((ref) => failing<List<Announcement>>()),
        ],
      );

      expect(tester.takeException(), isNull);
      expect(
        find.text('Join this club to see its announcements.'),
        findsOneWidget,
      );
    });

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const ClubAnnouncementsScreen(clubId: clubId),
        settle: false,
        overrides: [
          clubAnnouncementsProvider(
            clubId,
          ).overrideWith((ref) => pending<List<Announcement>>()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });

  group('ClubFeedScreen', () {
    for (final brightness in Brightness.values) {
      testWidgets('renders posts in ${brightness.name}', (tester) async {
        await pumpScreen(
          tester,
          const ClubFeedScreen(clubId: clubId),
          brightness: brightness,
          overrides: [
            clubFeedProvider(clubId).overrideWith((ref) async => [clubPost()]),
          ],
        );

        expect(find.text('Club Feed'), findsOneWidget);
        expect(find.text('Anyone up for doubles Saturday?'), findsOneWidget);
        expect(find.text('Ana Diaz'), findsOneWidget);
      });
    }

    // The backend nulls authorId with SetNull on account deletion so the
    // thread stays readable; the screen has to render that, not blow up.
    testWidgets('labels a post whose author deleted their account', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const ClubFeedScreen(clubId: clubId),
        overrides: [
          clubFeedProvider(
            clubId,
          ).overrideWith((ref) async => [clubPost(author: null)]),
        ],
      );

      expect(find.text('Former member'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('offers Delete only on your own post', (tester) async {
      await pumpScreen(
        tester,
        const ClubFeedScreen(clubId: clubId),
        overrides: [
          clubFeedProvider(
            clubId,
          ).overrideWith((ref) async => [clubPost(isMine: true)]),
        ],
      );

      expect(find.text('Delete'), findsOneWidget);
    });

    testWidgets('hides Delete on someone else’s post', (tester) async {
      await pumpScreen(
        tester,
        const ClubFeedScreen(clubId: clubId),
        overrides: [
          clubFeedProvider(
            clubId,
          ).overrideWith((ref) async => [clubPost(isMine: false)]),
        ],
      );

      expect(find.text('Delete'), findsNothing);
    });

    testWidgets('shows the composer once the feed loads', (tester) async {
      await pumpScreen(
        tester,
        const ClubFeedScreen(clubId: clubId),
        overrides: [
          clubFeedProvider(clubId).overrideWith((ref) async => []),
        ],
      );

      expect(find.text('Share something with the club'), findsOneWidget);
    });

    testWidgets('shows the empty state but still allows posting', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const ClubFeedScreen(clubId: clubId),
        overrides: [
          clubFeedProvider(clubId).overrideWith((ref) async => []),
        ],
      );

      expect(find.text('No posts yet'), findsOneWidget);
      expect(find.byIcon(Icons.send), findsOneWidget);
    });

    testWidgets('tells a non-member to join, and hides the composer', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const ClubFeedScreen(clubId: clubId),
        overrides: [
          clubFeedProvider(
            clubId,
          ).overrideWith((ref) => failing<List<ClubPost>>()),
        ],
      );

      expect(tester.takeException(), isNull);
      expect(
        find.text('Join this club to see and post to its feed.'),
        findsOneWidget,
      );
      // No composer for someone who can't post.
      expect(find.byIcon(Icons.send), findsNothing);
    });

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const ClubFeedScreen(clubId: clubId),
        settle: false,
        overrides: [
          clubFeedProvider(
            clubId,
          ).overrideWith((ref) => pending<List<ClubPost>>()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });
}
