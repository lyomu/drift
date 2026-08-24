import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/padel/application/padel_providers.dart';
import 'package:drift_tennis/features/padel/data/padel_repository.dart';
import 'package:drift_tennis/features/profile/application/profile_providers.dart';
import 'package:drift_tennis/features/profile/presentation/my_sports_hub_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('MySportsHubScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders both sports with levels in $label',
          (tester) async {
        await pumpScreen(
          tester,
          const MySportsHubScreen(),
          brightness: brightness,
          overrides: [
            ownProfileProvider.overrideWith(
              (ref) => Future.value(playerProfile()),
            ),
            padelProfileProvider.overrideWith(
              (ref) => Future.value(padelProfile()),
            ),
          ],
        );

        expect(find.text('My Sports'), findsOneWidget);
        expect(find.text('Tennis'), findsOneWidget);
        expect(find.text('Padel'), findsOneWidget);
        expect(find.text('Level 4.0 · 4.0'), findsOneWidget);
        expect(find.text('Level 3.0 · 3.0'), findsOneWidget);
      });

      testWidgets("offers Add Padel when there's no profile in $label",
          (tester) async {
        await pumpScreen(
          tester,
          const MySportsHubScreen(),
          brightness: brightness,
          overrides: [
            ownProfileProvider.overrideWith(
              (ref) => Future.value(playerProfile()),
            ),
            padelProfileProvider.overrideWith((ref) => Future.value(null)),
          ],
        );

        expect(find.text('+ Add Padel'), findsOneWidget);
      });
    }

    testWidgets('survives a failed padel load without throwing',
        (tester) async {
      await pumpScreen(
        tester,
        const MySportsHubScreen(),
        overrides: [
          ownProfileProvider.overrideWith((ref) => Future.value(playerProfile())),
          padelProfileProvider.overrideWith((ref) => failing<PadelProfile?>()),
        ],
      );

      expect(find.text("Couldn't load your Padel profile"), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
