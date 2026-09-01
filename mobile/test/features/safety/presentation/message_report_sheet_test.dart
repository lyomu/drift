import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:drift_tennis/features/auth/data/auth_repository.dart';
import 'package:drift_tennis/features/safety/data/safety_repository.dart';
import 'package:drift_tennis/features/safety/presentation/message_report_sheet.dart';

import '../../../support/mocks.dart';
import '../../../support/pump.dart';

/// The endpoint behind this sheet has existed and been tested since M12,
/// but had no caller until Wave 2 — so nothing has ever driven it.
void main() {
  late MockSafetyRepository safety;

  setUpAll(() {
    registerFallbackValue(ReportReason.other);
  });

  setUp(() {
    safety = MockSafetyRepository();
  });

  /// Opens the sheet the way the chat thread does — from a tap inside a
  /// screen that has a Riverpod scope and a Navigator.
  Future<void> openSheet(WidgetTester tester) async {
    await pumpScreen(
      tester,
      Consumer(
        builder: (context, ref, _) => Scaffold(
          body: Center(
            child: ElevatedButton(
              onPressed: () =>
                  showMessageReportSheet(context, ref, messageId: 'msg-1'),
              child: const Text('open'),
            ),
          ),
        ),
      ),
      overrides: [safetyRepositoryProvider.overrideWithValue(safety)],
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
  }

  testWidgets('offers every report reason', (tester) async {
    await openSheet(tester);

    expect(find.text('Report this message'), findsOneWidget);
    for (final reason in ReportReason.values) {
      expect(find.text(reason.label), findsOneWidget, reason: reason.name);
    }
  });

  testWidgets('keeps submit disabled until a reason is picked', (tester) async {
    await openSheet(tester);

    final button = tester.widget<ElevatedButton>(
      find.widgetWithText(ElevatedButton, 'Submit report'),
    );
    expect(button.onPressed, isNull);
  });

  testWidgets('submits the chosen reason for the right message', (
    tester,
  ) async {
    when(
      () => safety.reportMessage(
        messageId: any(named: 'messageId'),
        reason: any(named: 'reason'),
        notes: any(named: 'notes'),
      ),
    ).thenAnswer((_) async {});

    await openSheet(tester);

    await tester.tap(find.text(ReportReason.harassment.label));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Submit report'));
    await tester.pumpAndSettle();

    verify(
      () => safety.reportMessage(
        messageId: 'msg-1',
        reason: ReportReason.harassment,
        notes: any(named: 'notes'),
      ),
    ).called(1);
  });

  testWidgets('passes the optional notes through', (tester) async {
    when(
      () => safety.reportMessage(
        messageId: any(named: 'messageId'),
        reason: any(named: 'reason'),
        notes: any(named: 'notes'),
      ),
    ).thenAnswer((_) async {});

    await openSheet(tester);

    await tester.tap(find.text(ReportReason.spam.label));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Repeated adverts');
    await tester.tap(find.text('Submit report'));
    await tester.pumpAndSettle();

    verify(
      () => safety.reportMessage(
        messageId: 'msg-1',
        reason: ReportReason.spam,
        notes: 'Repeated adverts',
      ),
    ).called(1);
  });

  testWidgets('closes and confirms on success', (tester) async {
    when(
      () => safety.reportMessage(
        messageId: any(named: 'messageId'),
        reason: any(named: 'reason'),
        notes: any(named: 'notes'),
      ),
    ).thenAnswer((_) async {});

    await openSheet(tester);

    await tester.tap(find.text(ReportReason.cheating.label));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Submit report'));
    await tester.pumpAndSettle();

    expect(find.text('Report this message'), findsNothing);
    expect(find.text('Thanks — this message was reported.'), findsOneWidget);
  });

  // The server rejects reporting your own message; that has to surface in
  // the sheet rather than closing as though it worked.
  testWidgets('keeps the sheet open and shows the error on failure', (
    tester,
  ) async {
    when(
      () => safety.reportMessage(
        messageId: any(named: 'messageId'),
        reason: any(named: 'reason'),
        notes: any(named: 'notes'),
      ),
    ).thenThrow(const AuthException('You cannot report your own message.'));

    await openSheet(tester);

    await tester.tap(find.text(ReportReason.other.label));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Submit report'));
    await tester.pumpAndSettle();

    expect(find.text('You cannot report your own message.'), findsOneWidget);
    expect(find.text('Report this message'), findsOneWidget);
  });
}
