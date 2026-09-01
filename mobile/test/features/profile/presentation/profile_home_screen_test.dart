import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/players/data/players_repository.dart';
import 'package:drift_tennis/features/profile/application/profile_providers.dart';
import 'package:drift_tennis/features/profile/presentation/profile_home_screen.dart';
import 'package:drift_tennis/features/users/application/current_user_provider.dart';
import 'package:drift_tennis/features/users/data/users_repository.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  // The screen has no Scaffold of its own — it lives inside a shell tab.
  Widget screen() => const Scaffold(body: ProfileHomeScreen());

  group('ProfileHomeScreen', () {
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

        expect(find.text('Profile'), findsOneWidget);
        expect(find.text('My Sports Hub'), findsOneWidget);
        expect(find.text('Settings'), findsOneWidget);
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

        // Falls back to a placeholder name rather than crashing.
        expect(find.text('My Profile'), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    }
  });
}
