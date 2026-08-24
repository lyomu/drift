import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/connections/application/connections_providers.dart';
import 'package:drift_tennis/features/connections/data/connections_repository.dart';
import 'package:drift_tennis/features/matches/presentation/challenge_composer_screen.dart';
import 'package:drift_tennis/features/padel/application/padel_providers.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('ChallengeComposerScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders a tennis challenge in $label', (tester) async {
        await pumpScreen(
          tester,
          ChallengeComposerScreen(opponent: playerSummary()),
          brightness: brightness,
          overrides: [
            connectionsProvider.overrideWith(
              (ref) => Future.value(<ConnectionEntry>[]),
            ),
            padelProfileProvider.overrideWith((ref) => Future.value(null)),
          ],
        );

        expect(find.text('Challenge'), findsOneWidget);
        expect(find.text('Ana Diaz'), findsOneWidget);
        expect(find.text('Tennis'), findsNothing);
      });

      testWidgets('offers the sport toggle with a padel profile in $label',
          (tester) async {
        await pumpScreen(
          tester,
          ChallengeComposerScreen(opponent: playerSummary()),
          brightness: brightness,
          overrides: [
            connectionsProvider.overrideWith(
              (ref) => Future.value(<ConnectionEntry>[]),
            ),
            padelProfileProvider.overrideWith(
              (ref) => Future.value(padelProfile()),
            ),
          ],
        );

        expect(find.text('Sport'), findsOneWidget);
        expect(find.text('Padel'), findsOneWidget);
      });
    }

    testWidgets('explains missing connections when picking a doubles partner',
        (tester) async {
      await pumpScreen(
        tester,
        ChallengeComposerScreen(opponent: playerSummary()),
        overrides: [
          connectionsProvider.overrideWith(
            (ref) => Future.value(<ConnectionEntry>[]),
          ),
          padelProfileProvider.overrideWith((ref) => Future.value(null)),
        ],
      );

      await tester.tap(find.text('Doubles'));
      await tester.pumpAndSettle();

      expect(
        find.text('Connect with a player first to partner with them.'),
        findsOneWidget,
      );
    });

    testWidgets("survives a failed connections load without throwing",
        (tester) async {
      await pumpScreen(
        tester,
        ChallengeComposerScreen(opponent: playerSummary()),
        overrides: [
          connectionsProvider.overrideWith(
            (ref) => failing<List<ConnectionEntry>>(),
          ),
          padelProfileProvider.overrideWith((ref) => Future.value(null)),
        ],
      );

      await tester.tap(find.text('Doubles'));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
    });
  });
}
