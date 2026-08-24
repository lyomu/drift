import 'package:flutter/material.dart';

import '../../features/courts/data/courts_repository.dart';
import 'drift_status_badge.dart';

/// Court Availability Chip — `foundation/05-design-system.md` §7. Booking
/// availability, never fabricated — "Unknown" is a real, styled state, not
/// an omitted chip (`foundation/06-domain-technical-architecture.md` §2).
class DriftCourtAvailabilityChip extends StatelessWidget {
  const DriftCourtAvailabilityChip({super.key, required this.bookingType});

  final CourtBookingType bookingType;

  @override
  Widget build(BuildContext context) {
    final (label, tone, icon) = switch (bookingType) {
      CourtBookingType.externalLink => (
        'Book online',
        DriftStatusTone.success,
        Icons.link,
      ),
      CourtBookingType.contactOnly => (
        'Contact to book',
        DriftStatusTone.info,
        Icons.call_outlined,
      ),
      CourtBookingType.nativePartner => (
        'Booking coming soon',
        DriftStatusTone.warning,
        Icons.hourglass_empty,
      ),
      CourtBookingType.unknown => (
        'Booking unknown',
        DriftStatusTone.neutral,
        Icons.help_outline,
      ),
    };

    return DriftStatusBadge(label: label, tone: tone, icon: icon);
  }
}
