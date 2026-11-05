import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/courts/application/courts_providers.dart';
import 'package:drift_tennis/features/courts/data/court_bookings.dart';
import 'package:drift_tennis/features/courts/presentation/court_booking_screen.dart';
import 'package:drift_tennis/features/courts/presentation/my_bookings_screen.dart';

import '../../../support/pump.dart';

/// A slot at local [hour] in Nairobi (UTC+3, no DST), so the UTC instant is 3h earlier.
BookingSlot slot(int hour, {bool available = true}) => BookingSlot(
  startsAt: DateTime.utc(2030, 1, 1, hour - 3),
  endsAt: DateTime.utc(2030, 1, 1, hour - 2),
  timezone: 'Africa/Nairobi',
  remaining: available ? 1 : 0,
  available: available,
);

CourtAvailability availability({
  List<BookingSlot>? slots,
  List<BookingSurface>? groups,
}) => CourtAvailability(
  courtName: 'Riverside Courts',
  timezone: 'Africa/Nairobi',
  slotMinutes: 60,
  maxSlots: 3,
  advanceDays: 30,
  groups:
      groups ??
      const [
        BookingSurface(
          id: 'g1',
          surface: 'HARD',
          indoor: false,
          lighting: true,
          count: 2,
        ),
      ],
  groupId: 'g1',
  date: '2030-01-01',
  slots: slots ?? [slot(8), slot(9), slot(10, available: false)],
);

CourtBooking booking({
  String id = 'b1',
  CourtBookingStatus status = CourtBookingStatus.pending,
  bool completed = false,
  bool byClub = false,
}) => CourtBooking(
  id: id,
  status: status,
  completed: completed,
  startsAt: DateTime.utc(2030, 1, 1, 8),
  endsAt: DateTime.utc(2030, 1, 1, 9),
  timezone: 'Africa/Nairobi',
  courtId: 'c1',
  courtName: 'Riverside Courts',
  surface: 'HARD',
  decisionNote: 'See you there',
  cancelledByClub: byClub,
);

void main() {
  group('CourtBookingScreen', () {
    Future<void> pump(
      WidgetTester tester,
      CourtAvailability data, {
      Brightness brightness = Brightness.light,
    }) => pumpScreen(
      tester,
      const CourtBookingScreen(courtId: 'c1'),
      brightness: brightness,
      overrides: [
        courtAvailabilityProvider.overrideWith((ref, key) async => data),
      ],
    );

    for (final brightness in Brightness.values) {
      testWidgets(
        'requires a start time before submitting in ${brightness.name}',
        (tester) async {
          await pump(tester, availability(), brightness: brightness);

          expect(find.text('Riverside Courts'), findsOneWidget);
          expect(find.text('08:00'), findsOneWidget);
          expect(find.text('Pick a start time'), findsOneWidget);

          await tester.tap(find.text('08:00'));
          await tester.pump();

          expect(
            find.textContaining('Request booking · 08:00–09:00'),
            findsOneWidget,
          );
          expect(tester.takeException(), isNull);
        },
      );
    }

    testWidgets('only offers durations that fit consecutive free slots', (
      tester,
    ) async {
      await pump(tester, availability());
      // 10:00 is taken, so from 08:00 the longest booking is two slots.
      await tester.tap(find.text('08:00'));
      await tester.pump();

      expect(find.text('60 min'), findsOneWidget);
      expect(find.text('120 min'), findsOneWidget);
      expect(find.text('180 min'), findsNothing);

      await tester.tap(find.text('120 min'));
      await tester.pump();
      expect(find.textContaining('08:00–10:00'), findsOneWidget);
    });

    testWidgets('unavailable slots cannot be picked', (tester) async {
      await pump(tester, availability());
      await tester.tap(find.text('10:00'), warnIfMissed: false);
      await tester.pump();
      expect(find.text('Pick a start time'), findsOneWidget);
    });

    testWidgets('hides the surface picker when there is one surface', (
      tester,
    ) async {
      await pump(tester, availability());
      expect(find.text('Surface'), findsNothing);
    });

    testWidgets('shows a surface picker when there are several', (
      tester,
    ) async {
      await pump(
        tester,
        availability(
          groups: const [
            BookingSurface(
              id: 'g1',
              surface: 'HARD',
              indoor: false,
              lighting: true,
              count: 2,
            ),
            BookingSurface(
              id: 'g2',
              surface: 'CLAY',
              indoor: false,
              lighting: false,
              count: 1,
            ),
          ],
        ),
      );
      expect(find.text('Surface'), findsOneWidget);
      expect(find.text('Clay'), findsOneWidget);
    });

    testWidgets('explains an empty day', (tester) async {
      await pump(tester, availability(slots: const []));
      expect(find.text('No times available on this day.'), findsOneWidget);
    });
  });

  group('MyBookingsScreen', () {
    Future<void> pump(WidgetTester tester, List<CourtBooking> data) =>
        pumpScreen(
          tester,
          const MyBookingsScreen(),
          overrides: [myBookingsProvider.overrideWith((ref) async => data)],
        );

    testWidgets('shows the empty state', (tester) async {
      await pump(tester, const []);
      expect(find.text('No bookings yet'), findsOneWidget);
    });

    testWidgets('lists requests with status, club note and cancel', (
      tester,
    ) async {
      await pump(tester, [
        booking(),
        booking(id: 'b2', status: CourtBookingStatus.approved, completed: true),
        booking(id: 'b3', status: CourtBookingStatus.cancelled, byClub: true),
      ]);

      expect(find.text('Upcoming'), findsOneWidget);
      expect(find.text('Past'), findsOneWidget);
      expect(find.text('Pending'), findsOneWidget);
      expect(find.text('Completed'), findsOneWidget);
      expect(find.text('Cancelled by the club'), findsOneWidget);
      // Only the open, upcoming request can be cancelled.
      expect(find.text('Cancel booking'), findsOneWidget);
    });
  });

  group('court booking models', () {
    test('CourtBooking.fromJson reads server-local labels', () {
      final b = CourtBooking.fromJson({
        'id': 'b1',
        'status': 'APPROVED',
        'completed': false,
        'startsAt': '2030-01-01T08:00:00.000Z',
        'endsAt': '2030-01-01T09:00:00.000Z',
        'court': {
          'id': 'c1',
          'name': 'Riverside',
          'timezone': 'Africa/Nairobi',
        },
        'courtGroup': {'surface': 'HARD'},
        'cancelledBy': null,
      });
      expect(b.status, CourtBookingStatus.approved);
      // 08:00Z in Nairobi (UTC+3, no DST) is 11:00 local.
      expect(b.localStart, '11:00');
      expect(b.localDate, '2030-01-01');
      expect(b.cancellable, isTrue);
    });
  });
}
