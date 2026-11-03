import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/clubs/application/clubs_providers.dart';
import 'package:drift_tennis/features/courts/application/courts_providers.dart';
import 'package:drift_tennis/features/players/application/players_providers.dart';
import 'package:drift_tennis/features/discover/presentation/discover_hub_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  // The hubs' embedded segments start real provider fetches on mount; pin
  // them all to resolved futures so no Dio timer outlives the test. Their
  // loading indicators also never settle under fake async, so pump once.
  final overrides = <Override>[
    playerSearchProvider.overrideWith((ref) => Future.value([])),
    courtSearchProvider.overrideWith(
      (ref) => Future.value(courtSearchResult()),
    ),
    clubSearchProvider.overrideWith((ref) => Future.value(clubSearchResult())),
  ];

  final screens = <String, Widget Function()>{
    'DiscoverHubScreen': () => const DiscoverHubScreen(),
  };

  for (final entry in screens.entries) {
    group(entry.key, () {
      for (final brightness in Brightness.values) {
        testWidgets('renders without throwing in ${brightness.name}', (
          tester,
        ) async {
          await pumpScreen(
            tester,
            Scaffold(body: entry.value()),
            settle: false,
            brightness: brightness,
            overrides: overrides,
          );
          await tester.pump();

          expect(tester.takeException(), isNull);
        });
      }
    });
  }

  testWidgets('Discover labels its player segment Find players', (
    tester,
  ) async {
    await pumpScreen(
      tester,
      const Scaffold(body: DiscoverHubScreen()),
      settle: false,
      overrides: overrides,
    );
    await tester.pump();
    expect(find.text('Find players'), findsOneWidget);
  });

  for (final locale in const [Locale('fr'), Locale('es')]) {
    testWidgets(
      'Discover player label is translated in ${locale.languageCode}',
      (tester) async {
        await pumpScreen(
          tester,
          const Scaffold(body: DiscoverHubScreen()),
          settle: false,
          locale: locale,
          overrides: overrides,
        );
        expect(
          find.text(
            locale.languageCode == 'fr'
                ? 'Trouver des joueurs'
                : 'Buscar jugadores',
          ),
          findsOneWidget,
        );
      },
    );
  }
}
