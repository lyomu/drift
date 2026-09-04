import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/core/shell/drift_app_drawer.dart';
import 'package:drift_tennis/features/players/data/players_repository.dart';
import 'package:drift_tennis/features/profile/application/profile_providers.dart';
import 'package:drift_tennis/features/users/application/current_user_provider.dart';
import 'package:drift_tennis/features/users/data/users_repository.dart';

import '../../support/fixtures.dart';
import '../../support/pump.dart';

void main() {
  // Successor to the old `ProfileHomeScreen` test — the 2026-09 redesign moved
  // that navigation surface into the app drawer. Rendered directly rather than
  // opened through a Scaffold: a `Drawer` is an ordinary widget, and the
  // opening gesture is Material's business, not ours.
  Widget screen() => const Scaffold(body: DriftAppDrawer());

  group('DriftAppDrawer', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the navigation hub in $label', (tester) async {
        await pumpScreen(
          tester,
          screen(),
          brightness: brightness,
          overrides: [
            ownProfileProvider.overrideWith(
              (ref) => Future.value(playerProfile()),
            ),
            currentUserProvider.overrideWith((ref) async => userProfile()),
          ],
        );

        expect(find.text('My Profile'), findsOneWidget);
        expect(find.text('My Sports Hub'), findsOneWidget);
        expect(find.text('Settings'), findsOneWidget);
        expect(find.text('Log out'), findsOneWidget);
        // Learn is a bottom-nav tab now, not a drawer row.
        expect(find.text('Learn'), findsNothing);
      });

      testWidgets("survives failed profiles without throwing in $label", (
        tester,
      ) async {
        await pumpScreen(
          tester,
          screen(),
          brightness: brightness,
          overrides: [
            ownProfileProvider.overrideWith((ref) => failing<PlayerProfile>()),
            currentUserProvider.overrideWith((ref) => failing<UserProfile>()),
          ],
        );

        // Falls back to placeholder identity text rather than crashing.
        expect(find.text('View your profile'), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    }
  });
}
