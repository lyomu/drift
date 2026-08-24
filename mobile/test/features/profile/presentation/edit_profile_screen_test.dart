import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/players/data/players_repository.dart';
import 'package:drift_tennis/features/profile/application/profile_providers.dart';
import 'package:drift_tennis/features/profile/presentation/edit_profile_screen.dart';
import 'package:drift_tennis/features/users/application/current_user_provider.dart';
import 'package:drift_tennis/features/users/data/users_repository.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('EditProfileScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the form prefilled in $label', (tester) async {
        await pumpScreen(
          tester,
          const EditProfileScreen(),
          brightness: brightness,
          overrides: [
            currentUserProvider.overrideWith((ref) async => userProfile()),
            ownProfileProvider.overrideWith(
              (ref) => Future.value(playerProfile()),
            ),
          ],
        );

        expect(find.text('Edit Profile'), findsOneWidget);
        // The bio field starts from the stored value.
        expect(
          find.text('Plays weekday evenings.'),
          findsWidgets,
        );
      });
    }

    testWidgets('survives a failed profile without throwing', (tester) async {
      await pumpScreen(
        tester,
        const EditProfileScreen(),
        overrides: [
          currentUserProvider.overrideWith((ref) => failing<UserProfile>()),
          ownProfileProvider.overrideWith((ref) => failing<PlayerProfile>()),
        ],
      );

      expect(find.text("Couldn't load your profile."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
