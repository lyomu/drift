import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/connections/application/connections_providers.dart';
import 'package:drift_tennis/features/connections/data/connections_repository.dart';
import 'package:drift_tennis/features/connections/presentation/connections_list_screen.dart';

import '../../../support/fixtures.dart';
import '../../../support/pump.dart';

void main() {
  group('ConnectionsListScreen', () {
    for (final brightness in Brightness.values) {
      final label = brightness.name;

      testWidgets('renders connections in $label', (tester) async {
        await pumpScreen(
          tester,
          const ConnectionsListScreen(),
          brightness: brightness,
          overrides: [
            connectionsProvider.overrideWith(
              (ref) => Future.value([connectionEntry()]),
            ),
            pendingRequestsProvider.overrideWith(
              (ref) => Future.value(pendingRequests(incoming: 1, outgoing: 0)),
            ),
          ],
        );

        expect(find.text('Connections'), findsOneWidget);
        expect(find.text('Ana Diaz'), findsOneWidget);
      });

      testWidgets('renders its empty state in $label', (tester) async {
        await pumpScreen(
          tester,
          const ConnectionsListScreen(),
          brightness: brightness,
          overrides: [
            connectionsProvider.overrideWith(
              (ref) => Future.value(<ConnectionEntry>[]),
            ),
            pendingRequestsProvider.overrideWith(
              (ref) => Future.value(
                const PendingRequests(incoming: [], outgoing: []),
              ),
            ),
          ],
        );

        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpScreen(
        tester,
        const ConnectionsListScreen(),
        settle: false,
        overrides: [
          connectionsProvider.overrideWith(
            (ref) => pending<List<ConnectionEntry>>(),
          ),
          pendingRequestsProvider.overrideWith(
            (ref) =>
                Future.value(const PendingRequests(incoming: [], outgoing: [])),
          ),
        ],
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('survives an error without throwing', (tester) async {
      await pumpScreen(
        tester,
        const ConnectionsListScreen(),
        overrides: [
          connectionsProvider.overrideWith(
            (ref) => failing<List<ConnectionEntry>>(),
          ),
          pendingRequestsProvider.overrideWith(
            (ref) =>
                Future.value(const PendingRequests(incoming: [], outgoing: [])),
          ),
        ],
      );

      expect(find.text("Couldn't load your connections."), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
