import 'package:flutter/material.dart';

import '../../core/network/media_url.dart';
import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_spacing.dart';
import '../../core/theme/drift_typography.dart';
import '../../features/coaches/data/coaches_repository.dart';
import 'drift_card.dart';
import 'drift_status_badge.dart';

class DriftCoachCard extends StatelessWidget {
  const DriftCoachCard({super.key, required this.coach, this.onTap});

  final CoachSummary coach;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final clubNames = coach.clubs.map((club) => club.name).join(' · ');
    final photoUrl = driftMediaUrl(coach.photoUrl);

    return DriftCard(
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 26,
            backgroundImage: photoUrl == null ? null : NetworkImage(photoUrl),
            child: photoUrl == null
                ? const Icon(Icons.sports_tennis_outlined)
                : null,
          ),
          const SizedBox(width: DriftSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(coach.displayName, style: type.title)),
                    if (coach.verificationStatus ==
                        CoachVerificationStatus.verified)
                      const DriftStatusBadge(
                        label: 'Verified',
                        tone: DriftStatusTone.success,
                        icon: Icons.verified_outlined,
                      ),
                  ],
                ),
                if (coach.specialisations.isNotEmpty) ...[
                  const SizedBox(height: DriftSpacing.s1),
                  Text(
                    coach.specialisations.take(3).join(' · '),
                    style: type.bodySmall.copyWith(color: colors.textSecondary),
                  ),
                ],
                if (coach.levels.isNotEmpty) ...[
                  const SizedBox(height: DriftSpacing.s1),
                  Text(
                    coach.levels.map((level) => level.label).join(', '),
                    style: type.caption.copyWith(color: colors.textSecondary),
                  ),
                ],
                if (clubNames.isNotEmpty) ...[
                  const SizedBox(height: DriftSpacing.s2),
                  Row(
                    children: [
                      Icon(
                        Icons.groups_outlined,
                        size: 16,
                        color: colors.textSecondary,
                      ),
                      const SizedBox(width: DriftSpacing.s1),
                      Expanded(
                        child: Text(
                          clubNames,
                          style: type.caption.copyWith(
                            color: colors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
