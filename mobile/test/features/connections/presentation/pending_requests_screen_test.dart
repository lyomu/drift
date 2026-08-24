import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/connections/application/connections_providers.dart';
import 'package:drift_tennis/features/connections/data/connections_repository.dart';
import 'package:drift_tennis/features/connections/presentation/pending_requests_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('PendingRequestsScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders incoming and outgoing requests in $label',
          (tester) async {
        await pumpScreen(
          tester,
          const PendingRequestsScreen(),
          brightness: brightness,
          overrides: [
            pendingRequestsProvider.overrideWith(
              (ref) => Future.value(pendingRequests()),
            ),
          ],
        );

        expect(find.text('Requests'), findsOneWidget);
        expect(find.text('Incoming'), findsOneWidget);
        expect(find.text('Sent'), findsOneWidget);
        expect(find.text('Accept'), findsOneWidget);
        expect(find.text('Cancel request'), findsOneWidget);
      });

      testWidgets('renders its empty state in $label', (tester) async {
        await pumpScreen(
          tester,
          const PendingRequestsScreen(),
          brightness: brightness,
          overrides: [
            pendingRequestsProvider.overrideWith(
              (ref) => Future.value(
                const PendingRequests(incoming: [], outgoing: []),
              ),
            ),
          ],
        );

        expect(find.text('No pending requests'), findsOneWidget);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const PendingRequestsScreen(),
        settle: false,
        overrides: [
          pendingRequestsProvider.overrideWith(
            (ref) => pending<PendingRequests>(),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const PendingRequestsScreen(),
        overrides: [
          pendingRequestsProvider.overrideWith(
            (ref) => failing<PendingRequests>(),
          ),
        ],
      );

      expect(find.text("Couldn't load your requests."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
