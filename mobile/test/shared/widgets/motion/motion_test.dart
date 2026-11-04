import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/shared/widgets/motion/count_up.dart';
import 'package:drift_tennis/shared/widgets/motion/entrance.dart';

Widget _app(Widget child, {bool reduceMotion = false}) => MaterialApp(
  home: MediaQuery(
    data: MediaQueryData(disableAnimations: reduceMotion),
    child: Scaffold(body: child),
  ),
);

double _opacityOf(WidgetTester tester) {
  final opacity = find.descendant(
    of: find.byType(DriftEntrance),
    matching: find.byType(Opacity),
  );
  return opacity.evaluate().isEmpty
      ? 1
      : tester.widget<Opacity>(opacity.first).opacity;
}

void main() {
  testWidgets('DriftEntrance fades in and ends fully visible', (tester) async {
    await tester.pumpWidget(_app(const DriftEntrance(child: Text('hi'))));
    expect(_opacityOf(tester), lessThan(1));
    await tester.pumpAndSettle();
    expect(_opacityOf(tester), 1);
  });

  testWidgets('DriftEntrance renders in place when motion is reduced', (
    tester,
  ) async {
    await tester.pumpWidget(
      _app(const DriftEntrance(child: Text('hi')), reduceMotion: true),
    );
    expect(_opacityOf(tester), 1);
  });

  testWidgets('DriftEntrance skips the animation once its scope has closed', (
    tester,
  ) async {
    final show = ValueNotifier(false);
    await tester.pumpWidget(
      _app(
        DriftEntranceScope(
          window: Duration.zero,
          child: ValueListenableBuilder<bool>(
            valueListenable: show,
            builder: (_, visible, _) => visible
                ? const DriftEntrance(child: Text('late'))
                : const SizedBox(),
          ),
        ),
      ),
    );
    show.value = true;
    await tester.pump();
    expect(_opacityOf(tester), 1);
  });

  testWidgets('DriftCountUp lands on the target value', (tester) async {
    await tester.pumpWidget(
      _app(DriftCountUp(value: 7, builder: (_, v) => Text('${v.round()}'))),
    );
    expect(find.text('0'), findsOneWidget);
    await tester.pumpAndSettle();
    expect(find.text('7'), findsOneWidget);
  });

  testWidgets('DriftCountUp shows the final value when motion is reduced', (
    tester,
  ) async {
    await tester.pumpWidget(
      _app(
        DriftCountUp(value: 7, builder: (_, v) => Text('${v.round()}')),
        reduceMotion: true,
      ),
    );
    expect(find.text('7'), findsOneWidget);
  });
}
