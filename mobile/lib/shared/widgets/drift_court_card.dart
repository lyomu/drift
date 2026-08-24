import 'package:flutter/material.dart';

import '../../core/theme/drift_spacing.dart';
import '../../core/theme/drift_typography.dart';
import '../../features/courts/data/courts_repository.dart';
import 'drift_card.dart';
import 'drift_court_surface_chip.dart';
import 'drift_detail_row.dart';
import 'drift_status_badge.dart';

/// Court Card — `foundation/05-design-system.md` §7. Court summary in
/// list/map results: name, distance, surface breakdown, verification.
class DriftCourtCard extends StatelessWidget {
  const DriftCourtCard({super.key, required this.court, this.onTap});

  final CourtSummary court;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return DriftCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(court.name, style: type.title)),
              _VerificationBadge(status: court.verificationStatus),
            ],
          ),
          if (court.distanceKm != null || court.address != null)
            DriftDetailRow(
              icon: Icons.place_outlined,
              text: court.distanceKm != null
                  ? '${court.distanceKm!.toStringAsFixed(1)} km away'
                  : court.address!,
            ),
          if (court.clubName != null)
            DriftDetailRow(icon: Icons.groups_outlined, text: court.clubName!),
          if (court.surfaces.isNotEmpty) ...[
            const SizedBox(height: DriftSpacing.s2),
            Wrap(
              spacing: DriftSpacing.s2,
              runSpacing: DriftSpacing.s2,
              children: [
                for (final surface in court.surfaces)
                  DriftCourtSurfaceChip(label: surface),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _VerificationBadge extends StatelessWidget {
  const _VerificationBadge({required this.status});

  final ListingVerificationStatus status;

  @override
  Widget build(BuildContext context) {
    if (status == ListingVerificationStatus.unverified) {
      // Unverified is the common, unremarkable default — showing a badge
      // for every card would be noise. Verified/Pending are the states
      // worth calling out.
      return const SizedBox.shrink();
    }
    final (tone, icon) = switch (status) {
      ListingVerificationStatus.verified => (
        DriftStatusTone.success,
        Icons.verified_outlined,
      ),
      ListingVerificationStatus.pending => (
        DriftStatusTone.warning,
        Icons.hourglass_empty,
      ),
      ListingVerificationStatus.unverified => (
        DriftStatusTone.neutral,
        Icons.circle_outlined,
      ),
    };
    return DriftStatusBadge(label: status.label, tone: tone, icon: icon);
  }
}
