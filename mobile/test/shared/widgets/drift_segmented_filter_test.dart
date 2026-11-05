import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/shared/widgets/drift_segmented_filter.dart';

import '../../support/pump.dart';

void main() {
  for (final brightness in Brightness.values) {
    testWidgets('renders every segment and reports taps (${brightness.name})', (
      tester,
    ) async {
      var selected = 1;
      await pumpScreen(
        tester,
        Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) => Padding(
              padding: const EdgeInsets.all(16),
              child: DriftSegmentedFilter(
                labels: const ['Challenges', 'Active', 'History'],
                selected: selected,
                onChanged: (i) => setState(() => selected = i),
              ),
            ),
          ),
        ),
        brightness: brightness,
      );

      expect(find.text('Challenges'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
      expect(find.text('History'), findsOneWidget);

      await tester.tap(find.text('History'));
      await tester.pumpAndSettle();
      expect(selected, 2);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('segments meet the 44dp touch-target height', (tester) async {
    await pumpScreen(
      tester,
      Scaffold(
        body: DriftSegmentedFilter(
          labels: const ['A', 'B'],
          selected: 0,
          onChanged: (_) {},
        ),
      ),
    );
    expect(
      tester.getSize(find.byType(DriftSegmentedFilter)).height,
      greaterThanOrEqualTo(44),
    );
  });
}
