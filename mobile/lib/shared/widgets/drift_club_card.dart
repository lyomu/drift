import 'package:flutter/material.dart';

import '../../core/theme/drift_typography.dart';
import '../../features/clubs/data/clubs_repository.dart';
import '../../features/courts/data/courts_repository.dart';
import 'drift_card.dart';
import 'drift_detail_row.dart';
import 'drift_status_badge.dart';

/// Club Card — no `foundation/05-design-system.md` §7 spec row exists for
/// this (only Court Card/Availability Chip/Surface Chip are specified), so
/// this follows the `DriftLeagueCard`/`DriftPlayerCard` precedent directly.
class DriftClubCard extends StatelessWidget {
  const DriftClubCard({super.key, required this.club, this.onTap});

  final ClubSummary club;
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
              Expanded(child: Text(club.name, style: type.title)),
              if (club.verificationStatus == ListingVerificationStatus.verified)
                const DriftStatusBadge(
                  label: 'Verified',
                  tone: DriftStatusTone.success,
                  icon: Icons.verified_outlined,
                ),
            ],
          ),
          if (club.distanceKm != null || club.address != null)
            DriftDetailRow(
              icon: Icons.place_outlined,
              text: club.distanceKm != null
                  ? '${club.distanceKm!.toStringAsFixed(1)} km away'
                  : club.address!,
            ),
          DriftDetailRow(
            icon: Icons.sports_tennis_outlined,
            text: club.courtCount == 0
                ? 'No courts listed'
                : '${club.courtCount} court${club.courtCount == 1 ? '' : 's'}',
          ),
        ],
      ),
    );
  }
}
