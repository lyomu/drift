import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/drift_section_header.dart';
import '../../../../shared/widgets/drift_soft_card.dart';
import '../../../achievements/application/achievements_providers.dart';
import 'home_empty_state.dart';

/// "Your progress" — achievements earned so far and the next one to chase.
/// Reads the achievements list directly (always available) rather than the
/// feed card, which the server only sends once the user has earned one.
class ProgressSection extends ConsumerWidget {
  const ProgressSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final data = ref.watch(achievementsProvider).valueOrNull;

    if (data == null) return const SizedBox.shrink();

    final earned = data.earnedCount;
    final total = data.totalCount;
    final nextLocked = data.achievements
        .where((a) => a.state != 'EARNED')
        .firstOrNull;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DriftSectionHeader(
            title: 'Your progress',
            actionLabel: 'View all',
            onAction: () => context.push('/profile/achievements'),
          ),
          const SizedBox(height: 12),
          if (earned == 0)
            HomeEmptyState(
              icon: Icons.emoji_events_outlined,
              message: 'Play matches and log practice to start earning '
                  'achievements.',
              actionLabel: 'View',
              onAction: () => context.push('/profile/achievements'),
            )
          else
            DriftSoftCard(
              onTap: () => context.push('/profile/achievements'),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Achievements',
                        style: type.body.copyWith(fontWeight: FontWeight.w600),
                      ),
                      Text(
                        '$earned / $total',
                        style: type.body.copyWith(
                          color: colors.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: total == 0 ? 0 : earned / total,
                      minHeight: 6,
                      backgroundColor: colors.primaryLight,
                      valueColor: AlwaysStoppedAnimation<Color>(colors.primary),
                    ),
                  ),
                  if (nextLocked != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Next: ${nextLocked.title} — ${nextLocked.criteria}',
                      style: type.caption.copyWith(
                        color: colors.textSecondary,
                      ),
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
