import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/home/presentation/sections/action_needed_rail.dart';
import 'package:drift_tennis/features/tennis_facts/data/tennis_facts_repository.dart';
import 'package:drift_tennis/features/tennis_facts/presentation/tennis_fact_sheet.dart';

import '../../support/fixtures.dart';
import '../../support/pump.dart';

TennisFact _fact({bool opened = false, String? source}) => TennisFact(
  id: 'f1',
  title: 'The oldest tournament',
  body: 'Wimbledon was first played in 1877.',
  source: source,
  imageUrl: null,
  opened: opened,
);

void main() {
  test('TennisFact.fromJson reads the API shape', () {
    final fact = TennisFact.fromJson({
      'id': 'f1',
      'title': 'T',
      'body': 'B',
      'source': null,
      'imageUrl': '/media/tennis-fact-images/i?v=1',
      'opened': true,
    });
    expect(fact.opened, isTrue);
    expect(fact.imageUrl, '/media/tennis-fact-images/i?v=1');
  });

  group('ActionNeededRail', () {
    testWidgets('titles itself "Today\'s fact" while a fact is unopened', (
      tester,
    ) async {
      await pumpRouted(
        tester,
        Scaffold(
          body: ActionNeededRail(
            cards: const [],
            fact: _fact(),
            onFactTap: () {},
          ),
        ),
      );
      expect(find.text("Today's fact"), findsOneWidget);
      expect(find.text('Needs you'), findsNothing);
      expect(find.text('The oldest tournament'), findsOneWidget);
    });

    testWidgets('falls back to "Needs you" with no fact', (tester) async {
      await pumpRouted(
        tester,
        Scaffold(body: ActionNeededRail(cards: [homeCard()])),
      );
      expect(find.text('Needs you'), findsOneWidget);
      expect(find.text("Today's fact"), findsNothing);
    });

    testWidgets('localizes the title (FR)', (tester) async {
      await pumpScreen(
        tester,
        Scaffold(
          body: ActionNeededRail(
            cards: const [],
            fact: _fact(),
            onFactTap: () {},
          ),
        ),
        locale: const Locale('fr'),
      );
      expect(find.text('Le fait du jour'), findsOneWidget);
    });
  });

  group('TennisFactSheet', () {
    for (final brightness in Brightness.values) {
      testWidgets(
        'renders title, body, source and Got it (${brightness.name})',
        (tester) async {
          await pumpScreen(
            tester,
            Scaffold(
              body: TennisFactSheet(fact: _fact(source: 'ITF')),
            ),
            brightness: brightness,
          );
          expect(find.text('DID YOU KNOW?'), findsOneWidget);
          expect(find.text('The oldest tournament'), findsOneWidget);
          expect(
            find.text('Wimbledon was first played in 1877.'),
            findsOneWidget,
          );
          expect(find.text('Source: ITF'), findsOneWidget);
          expect(find.text('Got it'), findsOneWidget);
          expect(tester.takeException(), isNull);
        },
      );
    }
  });
}
