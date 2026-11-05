/// Native court booking models — mirror `GET /courts/:id/availability` and
/// `GET /me/bookings`. Times are UTC instants plus the court's IANA zone;
/// the local wall-clock labels are derived here (see `court_time.dart`).
library;

import 'court_time.dart';

class BookingSlot {
  const BookingSlot({
    required this.startsAt,
    required this.endsAt,
    required this.timezone,
    required this.remaining,
    required this.available,
  });

  final DateTime startsAt;
  final DateTime endsAt;

  /// The court's IANA zone.
  final String timezone;
  final int remaining;
  final bool available;

  /// Court-local `HH:mm`.
  String get localStart => courtLocalTime(startsAt, timezone);
  String get localEnd => courtLocalTime(endsAt, timezone);

  factory BookingSlot.fromJson(Map<String, dynamic> json, String timezone) =>
      BookingSlot(
        startsAt: DateTime.parse(json['startsAt'] as String),
        endsAt: DateTime.parse(json['endsAt'] as String),
        timezone: timezone,
        remaining: json['remaining'] as int,
        available: json['available'] as bool,
      );
}

class BookingSurface {
  const BookingSurface({
    required this.id,
    required this.surface,
    required this.indoor,
    required this.lighting,
    required this.count,
  });

  final String id;
  final String surface;
  final bool indoor;
  final bool lighting;
  final int count;

  factory BookingSurface.fromJson(Map<String, dynamic> json) => BookingSurface(
    id: json['id'] as String,
    surface: json['surface'] as String,
    indoor: (json['indoor'] as bool?) ?? false,
    lighting: (json['lighting'] as bool?) ?? false,
    count: (json['count'] as int?) ?? 1,
  );
}

class CourtAvailability {
  const CourtAvailability({
    required this.courtName,
    required this.timezone,
    required this.slotMinutes,
    required this.maxSlots,
    required this.advanceDays,
    required this.groups,
    required this.groupId,
    required this.date,
    required this.slots,
  });

  final String courtName;
  final String timezone;
  final int slotMinutes;
  final int maxSlots;
  final int advanceDays;
  final List<BookingSurface> groups;
  final String groupId;
  final String date;
  final List<BookingSlot> slots;

  factory CourtAvailability.fromJson(Map<String, dynamic> json) {
    final court = json['court'] as Map<String, dynamic>;
    final timezone = court['timezone'] as String;
    return CourtAvailability(
      courtName: court['name'] as String,
      timezone: timezone,
      slotMinutes: court['slotMinutes'] as int,
      maxSlots: court['maxSlots'] as int,
      advanceDays: court['advanceDays'] as int,
      groups: (json['groups'] as List<dynamic>)
          .map((g) => BookingSurface.fromJson(g as Map<String, dynamic>))
          .toList(),
      groupId: json['groupId'] as String,
      date: json['date'] as String,
      slots: (json['slots'] as List<dynamic>)
          .map((s) => BookingSlot.fromJson(s as Map<String, dynamic>, timezone))
          .toList(),
    );
  }
}

enum CourtBookingStatus {
  pending,
  approved,
  declined,
  cancelled;

  static CourtBookingStatus fromJson(String value) => switch (value) {
    'APPROVED' => CourtBookingStatus.approved,
    'DECLINED' => CourtBookingStatus.declined,
    'CANCELLED' => CourtBookingStatus.cancelled,
    _ => CourtBookingStatus.pending,
  };
}

class CourtBooking {
  const CourtBooking({
    required this.id,
    required this.status,
    required this.completed,
    required this.startsAt,
    required this.endsAt,
    required this.timezone,
    required this.courtId,
    required this.courtName,
    required this.surface,
    this.note,
    this.decisionNote,
    this.cancelledByClub = false,
  });

  final String id;
  final CourtBookingStatus status;

  /// Derived by the server: approved and already finished.
  final bool completed;
  final DateTime startsAt;
  final DateTime endsAt;

  /// The court's IANA zone.
  final String timezone;

  /// Court-local `YYYY-MM-DD`, `HH:mm`, `HH:mm`.
  String get localDate => courtLocalDate(startsAt, timezone);
  String get localStart => courtLocalTime(startsAt, timezone);
  String get localEnd => courtLocalTime(endsAt, timezone);
  final String courtId;
  final String courtName;
  final String surface;
  final String? note;
  final String? decisionNote;
  final bool cancelledByClub;

  /// Still worth cancelling: open (pending/approved) and not yet over.
  bool get cancellable =>
      (status == CourtBookingStatus.pending ||
          status == CourtBookingStatus.approved) &&
      !completed;

  factory CourtBooking.fromJson(Map<String, dynamic> json) {
    final court = json['court'] as Map<String, dynamic>;
    final group = json['courtGroup'] as Map<String, dynamic>;
    return CourtBooking(
      id: json['id'] as String,
      status: CourtBookingStatus.fromJson(json['status'] as String),
      completed: (json['completed'] as bool?) ?? false,
      startsAt: DateTime.parse(json['startsAt'] as String),
      endsAt: DateTime.parse(json['endsAt'] as String),
      timezone: court['timezone'] as String,
      courtId: court['id'] as String,
      courtName: court['name'] as String,
      surface: group['surface'] as String,
      note: json['note'] as String?,
      decisionNote: json['decisionNote'] as String?,
      cancelledByClub: json['cancelledBy'] == 'CLUB',
    );
  }
}
