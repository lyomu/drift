import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_status_badge.dart';
import '../application/achievements_providers.dart';
import '../data/achievements_repository.dart';

/// Achievements List - `foundation/04-screen-inventory.md` A.9. The rule
/// catalogue is transparent: locked rows show exactly what real activity
/// will earn them, and earned rows are derived from backend facts.
class AchievementsScreen extends ConsumerWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final achievements = ref.watch(achievementsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Achievements')),
      body: SafeArea(
        child: switch (achievements) {
          AsyncData(:final value) => _AchievementList(response: value),
          AsyncError(:final error) => _ErrorState(
            message: error.toString(),
            onRetry: () => ref.invalidate(achievementsProvider),
          ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _AchievementList extends StatelessWidget {
  const _AchievementList({required this.response});

  final AchievementsResponse response;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s5),
      children: [
        Text('Your badges', style: type.h2),
        const SizedBox(height: DriftSpacing.s1),
        Text(
          '${response.earnedCount} of ${response.totalCount} earned',
          style: type.body.copyWith(color: colors.textSecondary),
        ),
        const SizedBox(height: DriftSpacing.s4),
        LinearProgressIndicator(
          value: response.totalCount == 0
              ? 0
              : response.earnedCount / response.totalCount,
        ),
        const SizedBox(height: DriftSpacing.s5),
        for (final achievement in response.achievements) ...[
          _AchievementCard(achievement: achievement),
          const SizedBox(height: DriftSpacing.s3),
        ],
      ],
    );
  }
}

class _AchievementCard extends StatelessWidget {
  const _AchievementCard({required this.achievement});

  final Achievement achievement;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final progress = achievement.target == 0
        ? 0.0
        : achievement.current / achievement.target;

    return DriftCard(
      onTap: () => _showAchievementDetail(context, achievement),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: achievement.earned
                ? colors.primaryLight
                : colors.border.withValues(alpha: 0.45),
            child: Icon(
              _iconFor(achievement.icon),
              color: achievement.earned
                  ? colors.primaryDark
                  : colors.textSecondary,
            ),
          ),
          const SizedBox(width: DriftSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(achievement.title, style: type.title)),
                    DriftStatusBadge(
                      label: achievement.earned ? 'Earned' : 'Locked',
                      tone: achievement.earned
                          ? DriftStatusTone.success
                          : DriftStatusTone.warning,
                      icon: achievement.earned
                          ? Icons.check_circle_outline
                          : Icons.lock_outline,
                    ),
                  ],
                ),
                const SizedBox(height: DriftSpacing.s2),
                Text(
                  achievement.description,
                  style: type.bodySmall.copyWith(color: colors.textSecondary),
                ),
                const SizedBox(height: DriftSpacing.s3),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress.clamp(0, 1),
                    minHeight: 8,
                  ),
                ),
                const SizedBox(height: DriftSpacing.s1),
                Text(
                  '${achievement.current}/${achievement.target} - ${achievement.criteria}',
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

void _showAchievementDetail(BuildContext context, Achievement achievement) {
  final type = Theme.of(context).extension<DriftTypography>()!;
  final colors = Theme.of(context).extension<DriftColors>()!;

  showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (context) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          DriftSpacing.s5,
          0,
          DriftSpacing.s5,
          DriftSpacing.s5,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(_iconFor(achievement.icon), color: colors.primary),
                const SizedBox(width: DriftSpacing.s3),
                Expanded(child: Text(achievement.title, style: type.h3)),
              ],
            ),
            const SizedBox(height: DriftSpacing.s3),
            Text(achievement.description, style: type.body),
            const SizedBox(height: DriftSpacing.s3),
            Text('Criteria', style: type.label),
            const SizedBox(height: DriftSpacing.s1),
            Text(
              achievement.criteria,
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
          ],
        ),
      ),
    ),
  );
}

IconData _iconFor(String icon) => switch (icon) {
  'emoji_events' => Icons.emoji_events_outlined,
  'fitness_center' => Icons.fitness_center,
  'school' => Icons.school_outlined,
  'flag' => Icons.flag_outlined,
  'groups' => Icons.groups_outlined,
  'leaderboard' => Icons.leaderboard_outlined,
  _ => Icons.sports_tennis,
};

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(DriftSpacing.s6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, color: colors.error),
            const SizedBox(height: DriftSpacing.s3),
            Text(message, style: type.body, textAlign: TextAlign.center),
            const SizedBox(height: DriftSpacing.s3),
            TextButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
