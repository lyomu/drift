import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/home/data/home_repository.dart';
import 'package:drift_tennis/features/home/presentation/sections/home_stat_card.dart';
import 'package:drift_tennis/features/users/application/current_user_provider.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  // The three visual treatments are cycled with a long-press in debug builds
  // (tests run in debug). Each must lay out without an exception — a layout
  // error silently blanks the card on a device.
  const progress = LevelProgress(percent: 62, nextLevel: 4.5);

  HomeSummary withProgress() => HomeSummary(
    firstName: 'Ana',
    level: 4.0,
    levelLabel: 'Intermediate',
    singlesRating: 4.2,
    doublesRating: null,
    goals: const [],
    levelProgress: progress,
  );

  final cases = {
    'with progress': withProgress(),
    'unrated': homeSummary(level: null, singlesRating: null),
    'loading (null summary)': null,
  };

  for (final brightness in Brightness.values) {
    for (final entry in cases.entries) {
      testWidgets('renders every style ${entry.key} in ${brightness.name}', (
        tester,
      ) async {
        await pumpScreen(
          tester,
          Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(16),
              child: HomeStatCard(summary: entry.value),
            ),
          ),
          brightness: brightness,
          overrides: [
            currentUserProvider.overrideWith((ref) async => userProfile()),
          ],
        );

        for (var i = 0; i < 3; i++) {
          expect(tester.takeException(), isNull);
          // Every style shows the three headings and has real height.
          expect(find.text('LEVEL'), findsWidgets);
          expect(find.text('SINGLES'), findsWidgets);
          expect(find.text('DOUBLES'), findsWidgets);
          expect(
            tester.getSize(find.byType(HomeStatCard)).height,
            greaterThan(100),
          );

          await tester.longPress(find.byType(HomeStatCard));
          await tester.pumpAndSettle();
        }
      });
    }
  }
}
