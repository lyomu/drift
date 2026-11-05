import 'package:flutter/material.dart';

import '../../features/courts/data/courts_repository.dart';
import 'drift_status_badge.dart';
import '../../core/l10n/l10n.dart';

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
        context.l10n.availBookOnline,
        DriftStatusTone.success,
        Icons.link,
      ),
      CourtBookingType.contactOnly => (
        context.l10n.availContactToBook,
        DriftStatusTone.info,
        Icons.call_outlined,
      ),
      CourtBookingType.nativePartner => (
        context.l10n.availComingSoon,
        DriftStatusTone.warning,
        Icons.hourglass_empty,
      ),
      CourtBookingType.unknown => (
        context.l10n.availUnknown,
        DriftStatusTone.neutral,
        Icons.help_outline,
      ),
    };

    return DriftStatusBadge(label: label, tone: tone, icon: icon);
  }
}
