import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:drift_tennis/core/theme/app_theme.dart';
import 'package:drift_tennis/shared/widgets/drift_news_image.dart';

void main() {
  testWidgets('uses Drift artwork when publisher imagery is unavailable', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: const SizedBox(height: 180, child: DriftNewsImage(url: null)),
      ),
    );
    expect(find.byIcon(Icons.sports_tennis), findsOneWidget);
    expect(find.byType(Image), findsNothing);
  });

  testWidgets('rejects an unsafe image URL before any network image is built', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: const SizedBox(
          height: 180,
          child: DriftNewsImage(url: 'http://publisher.example/image.jpg'),
        ),
      ),
    );
    expect(find.byIcon(Icons.sports_tennis), findsOneWidget);
    expect(find.byType(Image), findsNothing);
  });
}
