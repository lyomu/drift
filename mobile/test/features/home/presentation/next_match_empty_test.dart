import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/home/presentation/sections/next_match_empty.dart';
import 'package:drift_tennis/features/users/application/current_user_provider.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  const labels = {
    'en': ('Find a match', 'Challenge a friend'),
    'fr': ('Trouver un match', 'Défier un ami'),
    'es': ('Buscar un partido', 'Reta a un amigo'),
  };

  for (final entry in labels.entries) {
    testWidgets('keeps both buttons on one line in ${entry.key}', (
      tester,
    ) async {
      // A narrow phone (320dp) is the worst case for the labels.
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await pumpScreen(
        tester,
        const Scaffold(
          body: Padding(padding: EdgeInsets.all(16), child: NextMatchEmpty()),
        ),
        locale: Locale(entry.key),
        overrides: [
          currentUserProvider.overrideWith((ref) async => userProfile()),
        ],
      );

      final (find1, find2) = entry.value;
      final a = find.text(find1);
      final b = find.text(find2);
      expect(a, findsOneWidget);
      expect(b, findsOneWidget);

      // One line of 14sp text is well under two lines' height.
      expect(tester.getSize(a).height, lessThan(24));
      expect(tester.getSize(b).height, lessThan(24));

      // Same height, side by side.
      final fa = tester.getRect(
        find.ancestor(of: a, matching: find.bySubtype<ButtonStyleButton>()),
      );
      final fb = tester.getRect(
        find.ancestor(of: b, matching: find.bySubtype<ButtonStyleButton>()),
      );
      expect(fa.height, fb.height);
      expect(fa.width, closeTo(fb.width, 0.5));
      expect(tester.takeException(), isNull);
    });
  }
}
