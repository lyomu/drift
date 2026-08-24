import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/players/data/players_repository.dart';
import 'package:drift_tennis/features/profile/application/profile_providers.dart';
import 'package:drift_tennis/features/profile/presentation/own_profile_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('OwnProfileScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the viewer profile in $label', (tester) async {
        await pumpScreen(
          tester,
          const OwnProfileScreen(),
          brightness: brightness,
          overrides: [
            ownProfileProvider.overrideWith(
              (ref) => Future.value(playerProfile()),
            ),
          ],
        );

        expect(find.text('Ana Diaz'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const OwnProfileScreen(),
        settle: false,
        overrides: [
          ownProfileProvider.overrideWith((ref) => pending<PlayerProfile>()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const OwnProfileScreen(),
        overrides: [
          ownProfileProvider.overrideWith((ref) => failing<PlayerProfile>()),
        ],
      );

      expect(find.text("Couldn't load your profile."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
