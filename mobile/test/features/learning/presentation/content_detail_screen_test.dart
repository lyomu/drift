import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/learning/application/learning_providers.dart';
import 'package:drift_tennis/features/learning/data/learning_repository.dart';
import 'package:drift_tennis/features/learning/presentation/content_detail_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('ContentDetailScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders the drill in $label', (tester) async {
        await pumpScreen(
          tester,
          const ContentDetailScreen(contentId: 'c1'),
          brightness: brightness,
          overrides: [
            contentDetailProvider(
              'c1',
            ).overrideWith((ref) async => contentDetail()),
          ],
        );

        expect(find.text('Serve placement ladder'), findsOneWidget);
        expect(find.text('10 min'), findsOneWidget);
        expect(
          find.text('Stand side-on and swing up through the ball.'),
          findsOneWidget,
        );
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const ContentDetailScreen(contentId: 'c1'),
        settle: false,
        overrides: [
          contentDetailProvider(
            'c1',
          ).overrideWith((ref) => pending<ContentDetail>()),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const ContentDetailScreen(contentId: 'c1'),
        overrides: [
          contentDetailProvider(
            'c1',
          ).overrideWith((ref) => failing<ContentDetail>()),
        ],
      );

      expect(find.text('Content not available.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
