import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/padel/application/padel_providers.dart';
import 'package:drift_tennis/features/padel/data/padel_repository.dart';
import 'package:drift_tennis/features/padel/presentation/padel_profile_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('PadelProfileScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the padel profile in $label', (tester) async {
        await pumpScreen(
          tester,
          const PadelProfileScreen(),
          brightness: brightness,
          overrides: [
            padelProfileProvider.overrideWith(
              (ref) => Future.value(padelProfile()),
            ),
          ],
        );

        expect(find.text('Padel Profile'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const PadelProfileScreen(),
        settle: false,
        overrides: [
          padelProfileProvider.overrideWith((ref) => pending<PadelProfile?>()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const PadelProfileScreen(),
        overrides: [
          padelProfileProvider.overrideWith((ref) => failing<PadelProfile?>()),
        ],
      );

      expect(find.text("Couldn't load your Padel profile."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
