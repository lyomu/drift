import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/courts/application/courts_providers.dart';
import 'package:drift_tennis/features/courts/data/courts_repository.dart';
import 'package:drift_tennis/features/courts/presentation/court_profile_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('CourtProfileScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the court profile in $label', (tester) async {
        await pumpScreen(
          tester,
          const CourtProfileScreen(courtId: 'court-1'),
          brightness: brightness,
          overrides: [
            courtDetailProvider(
              'court-1',
            ).overrideWith((ref) => Future.value(courtProfile())),
          ],
        );

        expect(find.text('Court'), findsOneWidget);
        expect(find.text('Riverside Courts'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const CourtProfileScreen(courtId: 'court-1'),
        settle: false,
        overrides: [
          courtDetailProvider(
            'court-1',
          ).overrideWith((ref) => pending<CourtProfile>()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const CourtProfileScreen(courtId: 'court-1'),
        overrides: [
          courtDetailProvider(
            'court-1',
          ).overrideWith((ref) => failing<CourtProfile>()),
        ],
      );

      expect(find.text('Court not available.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
