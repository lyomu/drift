import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/messaging/application/messaging_providers.dart';
import 'package:drift_tennis/features/messaging/data/messaging_repository.dart';
import 'package:drift_tennis/features/messaging/presentation/inbox_screen.dart';

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
          ],
        );

        expect(
          find.text('No conversations yet — connect with a player to start one'),
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
        ],
      );

      expect(find.text("Couldn't load your messages."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
