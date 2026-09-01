import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:drift_tennis/features/auth/data/auth_repository.dart';
import 'package:drift_tennis/features/clubs/application/clubs_providers.dart';
import 'package:drift_tennis/features/clubs/data/clubs_repository.dart';
import 'package:drift_tennis/features/clubs/presentation/club_profile_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/mocks.dart';
import '../../../support/pump.dart';

/// The membership actions are the Wave 2 entry point to the whole community
/// surface (Doc 2 §67). Getting the state machine wrong either hides the
/// club from a member or offers links that 403.
void main() {
  const clubId = 'club-1';
  late MockClubsRepository clubs;

  setUp(() {
    clubs = MockClubsRepository();
  });

  List<Override> overridesFor(ClubMembership membership) => [
    clubsRepositoryProvider.overrideWithValue(clubs),
    clubDetailProvider(
      clubId,
    ).overrideWith((ref) async => clubProfile(membership: membership)),
  ];

  Future<void> pumpProfile(
    WidgetTester tester,
    ClubMembership membership, {
    Brightness brightness = Brightness.light,
  }) => pumpScreen(
    tester,
    const ClubProfileScreen(clubId: clubId),
    overrides: overridesFor(membership),
    brightness: brightness,
  );

  group('membership actions', () {
    testWidgets('offers a non-member the option to request', (tester) async {
      await pumpProfile(tester, ClubMembership.none);

      expect(find.text('Request to join'), findsOneWidget);
      expect(find.text('Announcements'), findsNothing);
      expect(find.text('Club Feed'), findsNothing);
    });

    testWidgets('sends the join request', (tester) async {
      when(() => clubs.requestToJoin(any())).thenAnswer((_) async {});

      await pumpProfile(tester, ClubMembership.none);
      await tester.tap(find.text('Request to join'));
      await tester.pumpAndSettle();

      verify(() => clubs.requestToJoin(clubId)).called(1);
    });

    testWidgets('tells a pending applicant to wait, and offers withdraw', (
      tester,
    ) async {
      await pumpProfile(tester, ClubMembership.pending);

      expect(
        find.text('Your request is waiting for a club admin.'),
        findsOneWidget,
      );
      expect(find.text('Withdraw request'), findsOneWidget);
      // Still gated — these 403 until an admin approves.
      expect(find.text('Announcements'), findsNothing);
    });

    testWidgets('withdraws a pending request', (tester) async {
      when(() => clubs.leave(any())).thenAnswer((_) async {});

      await pumpProfile(tester, ClubMembership.pending);
      await tester.tap(find.text('Withdraw request'));
      await tester.pumpAndSettle();

      verify(() => clubs.leave(clubId)).called(1);
    });

    testWidgets('opens the community to an active member', (tester) async {
      await pumpProfile(tester, ClubMembership.active);

      expect(find.text('Announcements'), findsOneWidget);
      expect(find.text('Club Feed'), findsOneWidget);
      expect(find.text('Leave club'), findsOneWidget);
      expect(find.text('Request to join'), findsNothing);
    });

    testWidgets('explains a suspended membership and offers nothing', (
      tester,
    ) async {
      await pumpProfile(tester, ClubMembership.suspended);

      expect(
        find.text('Your membership of this club is suspended.'),
        findsOneWidget,
      );
      expect(find.text('Announcements'), findsNothing);
      expect(find.text('Request to join'), findsNothing);
    });

    testWidgets('treats an invitation as not-yet-joined', (tester) async {
      await pumpProfile(tester, ClubMembership.invited);

      expect(find.text('You have been invited to this club.'), findsOneWidget);
      expect(find.text('Announcements'), findsNothing);
    });

    testWidgets('surfaces a failed join inline', (tester) async {
      when(
        () => clubs.requestToJoin(any()),
      ).thenThrow(const AuthException('You are already a member.'));

      await pumpProfile(tester, ClubMembership.none);
      await tester.tap(find.text('Request to join'));
      await tester.pumpAndSettle();

      expect(find.text('You are already a member.'), findsOneWidget);
    });
  });

  group('rendering', () {
    for (final brightness in Brightness.values) {
      testWidgets('renders the profile in ${brightness.name}', (tester) async {
        await pumpProfile(
          tester,
          ClubMembership.active,
          brightness: brightness,
        );

        expect(find.text('Riverside Tennis'), findsOneWidget);
        expect(find.text('A friendly club'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const ClubProfileScreen(clubId: clubId),
        settle: false,
        overrides: [
          clubsRepositoryProvider.overrideWithValue(clubs),
          clubDetailProvider(
            clubId,
          ).overrideWith((ref) => pending<ClubProfile>()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an unavailable club', (tester) async {
      await pumpScreen(
        tester,
        const ClubProfileScreen(clubId: clubId),
        overrides: [
          clubsRepositoryProvider.overrideWithValue(clubs),
          clubDetailProvider(
            clubId,
          ).overrideWith((ref) => failing<ClubProfile>()),
        ],
      );

      expect(tester.takeException(), isNull);
      expect(find.text('Club not available.'), findsOneWidget);
    });
  });
}
