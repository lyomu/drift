import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/courts/presentation/court_photos_gallery_screen.dart';

import '../../../support/pump.dart';

void main() {
  group('CourtPhotosGalleryScreen', () {
    for (final brightness in Brightness.values) {
      testWidgets('renders without throwing in ${brightness.name}',
          (tester) async {
        await pumpScreen(
          tester,
          const Scaffold(
            body: CourtPhotosGalleryScreen(
              photoUrls: ['https://example.test/a.jpg'],
            ),
          ),
          brightness: brightness,
        );

        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('handles an empty gallery without throwing', (tester) async {
      await pumpScreen(
        tester,
        const Scaffold(body: CourtPhotosGalleryScreen(photoUrls: [])),
      );

      expect(tester.takeException(), isNull);
    });
  });
}
