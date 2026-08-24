import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/settings/application/settings_providers.dart';
import 'package:drift_tennis/features/settings/presentation/blocked_users_screen.dart';
import 'package:drift_tennis/features/safety/data/safety_repository.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('BlockedUsersScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders blocked users in $label', (tester) async {
        await pumpScreen(
          tester,
          const BlockedUsersScreen(),
          brightness: brightness,
          overrides: [
            blockedUsersProvider.overrideWith(
              (ref) => Future.value([blockedPlayer()]),
            ),
          ],
        );

        expect(find.text('Blocked Users'), findsOneWidget);
        expect(find.text('Ana Diaz'), findsOneWidget);
      });

      testWidgets('renders its empty state in $label', (tester) async {
        await pumpScreen(
          tester,
          const BlockedUsersScreen(),
          brightness: brightness,
          overrides: [
            blockedUsersProvider.overrideWith(
              (ref) => Future.value(<BlockedPlayer>[]),
            ),
          ],
        );

        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const BlockedUsersScreen(),
        settle: false,
        overrides: [
          blockedUsersProvider.overrideWith(
            (ref) => pending<List<BlockedPlayer>>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const BlockedUsersScreen(),
        overrides: [
          blockedUsersProvider.overrideWith(
            (ref) => failing<List<BlockedPlayer>>(),
          ),
        ],
      );

      expect(find.text("Couldn't load your blocked users."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
