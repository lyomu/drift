import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/messaging/application/messaging_providers.dart';
import 'package:drift_tennis/features/messaging/data/messaging_repository.dart';
import 'package:drift_tennis/features/messaging/presentation/inbox_screen.dart';
import 'package:drift_tennis/features/users/application/current_user_provider.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('InboxScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders conversations in $label', (tester) async {
        await pumpScreen(
          tester,
          const InboxScreen(),
          brightness: brightness,
          overrides: [
            conversationsProvider.overrideWith(
              (ref) => Future.value([conversation()]),
            ),
            currentUserProvider.overrideWith((ref) async => userProfile()),
          ],
        );

        expect(find.text('Messages'), findsOneWidget);
        expect(find.text('See you Saturday'), findsOneWidget);
      });

      testWidgets('renders its empty state in $label', (tester) async {
        await pumpScreen(
          tester,
          const InboxScreen(),
          brightness: brightness,
          overrides: [
            conversationsProvider.overrideWith(
              (ref) => Future.value(<Conversation>[]),
            ),
            currentUserProvider.overrideWith((ref) async => userProfile()),
          ],
        );

        expect(
          find.text(
            'No conversations yet — connect with a player to start one',
          ),
          findsOneWidget,
        );
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const InboxScreen(),
        settle: false,
        overrides: [
          conversationsProvider.overrideWith(
            (ref) => pending<List<Conversation>>(),
          ),
          currentUserProvider.overrideWith((ref) async => userProfile()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const InboxScreen(),
        overrides: [
          conversationsProvider.overrideWith(
            (ref) => failing<List<Conversation>>(),
          ),
          currentUserProvider.overrideWith((ref) async => userProfile()),
        ],
      );

      expect(find.text("Couldn't load your messages."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('search filters by participant name', (tester) async {
      final ben = conversation(
        id: 'conv-ben',
        participants: [
          playerSummary(id: 'u1'),
          playerSummary(id: 'u2', firstName: 'Ben', lastName: 'Lee'),
        ],
      );
      final cara = conversation(
        id: 'conv-cara',
        participants: [
          playerSummary(id: 'u1'),
          playerSummary(id: 'u3', firstName: 'Cara', lastName: 'Diaz'),
        ],
      );

      await pumpScreen(
        tester,
        const InboxScreen(),
        overrides: [
          conversationsProvider.overrideWith(
            (ref) => Future.value([ben, cara]),
          ),
          currentUserProvider.overrideWith(
            (ref) async => userProfile(id: 'u1'),
          ),
        ],
      );

      expect(find.text('Ben Lee'), findsOneWidget);
      expect(find.text('Cara Diaz'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'Ben');
      await tester.pumpAndSettle();

      expect(find.text('Ben Lee'), findsOneWidget);
      expect(find.text('Cara Diaz'), findsNothing);
    });

    testWidgets('search filters by last-message preview', (tester) async {
      final saturday = conversation(
        id: 'conv-sat',
        participants: [
          playerSummary(id: 'u1'),
          playerSummary(id: 'u2', firstName: 'Ben', lastName: 'Lee'),
        ],
      );
      final match = conversation(
        id: 'conv-match',
        participants: [
          playerSummary(id: 'u1'),
          playerSummary(id: 'u3', firstName: 'Cara', lastName: 'Diaz'),
        ],
        lastMessage: chatMessage(body: 'Great match today'),
      );

      await pumpScreen(
        tester,
        const InboxScreen(),
        overrides: [
          conversationsProvider.overrideWith(
            (ref) => Future.value([saturday, match]),
          ),
          currentUserProvider.overrideWith(
            (ref) async => userProfile(id: 'u1'),
          ),
        ],
      );

      await tester.enterText(find.byType(TextField), 'Saturday');
      await tester.pumpAndSettle();

      expect(find.text('Ben Lee'), findsOneWidget);
      expect(find.text('Cara Diaz'), findsNothing);
    });

    testWidgets('Unread tab hides read conversations', (tester) async {
      final read = conversation(
        id: 'conv-read',
        unread: 0,
        participants: [
          playerSummary(id: 'u1'),
          playerSummary(id: 'u2', firstName: 'Ben', lastName: 'Lee'),
        ],
      );
      final unread = conversation(
        id: 'conv-unread',
        unread: 3,
        participants: [
          playerSummary(id: 'u1'),
          playerSummary(id: 'u3', firstName: 'Cara', lastName: 'Diaz'),
        ],
      );

      await pumpScreen(
        tester,
        const InboxScreen(),
        overrides: [
          conversationsProvider.overrideWith(
            (ref) => Future.value([read, unread]),
          ),
          currentUserProvider.overrideWith(
            (ref) async => userProfile(id: 'u1'),
          ),
        ],
      );

      expect(find.text('Ben Lee'), findsOneWidget);
      expect(find.text('Cara Diaz'), findsOneWidget);

      await tester.tap(find.text('Unread'));
      await tester.pumpAndSettle();

      expect(find.text('Ben Lee'), findsNothing);
      expect(find.text('Cara Diaz'), findsOneWidget);

      await tester.tap(find.text('All'));
      await tester.pumpAndSettle();

      expect(find.text('Ben Lee'), findsOneWidget);
      expect(find.text('Cara Diaz'), findsOneWidget);
    });

    testWidgets('avatar renders the other participant\'s initials', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const InboxScreen(),
        overrides: [
          conversationsProvider.overrideWith(
            (ref) => Future.value([
              conversation(
                participants: [
                  playerSummary(id: 'u1'),
                  playerSummary(id: 'u2', firstName: 'Ben', lastName: 'Lee'),
                ],
              ),
            ]),
          ),
          currentUserProvider.overrideWith(
            (ref) async => userProfile(id: 'u1'),
          ),
        ],
      );

      expect(find.text('BL'), findsOneWidget);
    });

    testWidgets('renders a relative timestamp for the last message', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const InboxScreen(),
        overrides: [
          conversationsProvider.overrideWith(
            (ref) => Future.value([
              conversation(lastMessageAt: DateTime(2026, 8, 23, 10)),
            ]),
          ),
          currentUserProvider.overrideWith((ref) async => userProfile()),
        ],
      );

      expect(find.text('Aug 23'), findsOneWidget);
    });

    testWidgets('shows a no-results state for a non-matching search', (
      tester,
    ) async {
      await pumpScreen(
        tester,
        const InboxScreen(),
        overrides: [
          conversationsProvider.overrideWith(
            (ref) => Future.value([conversation()]),
          ),
          currentUserProvider.overrideWith((ref) async => userProfile()),
        ],
      );

      await tester.enterText(find.byType(TextField), 'zzz-no-match');
      await tester.pumpAndSettle();

      expect(find.text('No conversations match your search'), findsOneWidget);
    });
  });
}
