import 'package:timezone/data/latest_10y.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

/// Court-local wall-clock time. Bookings travel as UTC instants plus the
/// court's IANA zone (`Africa/Nairobi`); this turns them into the time a
/// player standing at the court would read. Uses the bundled IANA database
/// (10-year window, ample for a 180-day booking horizon).
bool _ready = false;

tz.Location _location(String zone) {
  if (!_ready) {
    tzdata.initializeTimeZones();
    _ready = true;
  }
  try {
    return tz.getLocation(zone);
  } catch (_) {
    // An unknown zone name must not crash the screen; UTC is the honest fallback.
    return tz.UTC;
  }
}

String _two(int n) => n.toString().padLeft(2, '0');

/// `HH:mm` of [instant] on [zone]'s wall clock.
String courtLocalTime(DateTime instant, String zone) {
  final t = tz.TZDateTime.from(instant, _location(zone));
  return '${_two(t.hour)}:${_two(t.minute)}';
}

/// `YYYY-MM-DD` of [instant] on [zone]'s wall clock.
String courtLocalDate(DateTime instant, String zone) {
  final t = tz.TZDateTime.from(instant, _location(zone));
  return '${t.year.toString().padLeft(4, '0')}-${_two(t.month)}-${_two(t.day)}';
}
