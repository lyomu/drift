import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/drift_pill.dart';
import '../../../../shared/widgets/drift_section_header.dart';
import '../../../../shared/widgets/drift_soft_card.dart';
import '../../../courts/data/courts_repository.dart';
import 'home_empty_state.dart';

/// "Courts near you" section — a short list of nearby courts, or a prompt to
/// browse when the feed surfaced none (usually because location isn't set).
class CourtsNearYouSection extends StatelessWidget {
  const CourtsNearYouSection({super.key, required this.courts});

  final List<CourtSummary> courts;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DriftSectionHeader(
            title: 'Courts near you',
            actionLabel: 'Map view',
            onAction: () => context.go('/home?tab=discover&discover=courts'),
          ),
          const SizedBox(height: 12),
          if (courts.isEmpty)
            HomeEmptyState(
              icon: Icons.place_outlined,
              message: 'No courts nearby yet.',
              actionLabel: 'Browse',
              onAction: () => context.go('/home?tab=discover&discover=courts'),
            )
          else
            for (final court in courts) ...[
              DriftSoftCard(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                onTap: () => context.push('/discover/courts/${court.id}'),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: colors.primaryLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Icons.sports_tennis,
                        size: 18,
                        color: colors.primary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            court.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: type.body.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            court.indoorAvailable ? 'Indoor' : 'Outdoor',
                            style: type.caption.copyWith(
                              color: colors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    DriftPill(
                      label: court.distanceKm == null
                          ? 'Nearby'
                          : '${court.distanceKm!.toStringAsFixed(1)} km',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],
        ],
      ),
    );
  }
}
