import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_icon_tile.dart';
import '../../../shared/widgets/drift_pill.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../application/achievements_providers.dart';
import '../data/achievements_repository.dart';

/// Achievements List — `foundation/04-screen-inventory.md` §A.9 (redesign
/// 2026-08: `App.tsx` `ProfileAchievementsView`). The rule catalogue is
/// transparent: locked rows show exactly what real activity earns them.
class AchievementsScreen extends ConsumerWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final achievements = ref.watch(achievementsProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const DriftBackHeader(title: 'Achievements'),
            Expanded(
              child: switch (achievements) {
                AsyncData(:final value) => _AchievementList(response: value),
                AsyncError() => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          "Couldn't load achievements.",
                          style: type.body,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        TextButton(
                          onPressed: () =>
                              ref.invalidate(achievementsProvider),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                ),
                _ => const Center(child: CircularProgressIndicator()),
              },
            ),
          ],
        ),
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
    final pct = response.totalCount == 0
        ? 0.0
        : response.earnedCount / response.totalCount;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        DriftSoftCard(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Your badges',
                          style: type.title.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${response.earnedCount} of ${response.totalCount} earned',
                          style: type.caption.copyWith(
                            color: colors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '${response.earnedCount}/${response.totalCount}',
                    style: type.h3.copyWith(
                      fontWeight: FontWeight.w800,
                      color: colors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: LinearProgressIndicator(
                  value: pct,
                  minHeight: 6,
                  backgroundColor: colors.primaryLight,
                  valueColor: AlwaysStoppedAnimation(colors.primary),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        for (final achievement in response.achievements) ...[
          _AchievementCard(achievement: achievement),
          const SizedBox(height: 10),
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
        : (achievement.current / achievement.target).clamp(0.0, 1.0);

    return DriftSoftCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      onTap: () => _showAchievementDetail(context, achievement),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DriftIconTile(
            icon: achievement.earned
                ? Icons.check_circle_outline
                : Icons.lock_outline,
            size: 44,
            radius: 12,
            tone: achievement.earned
                ? DriftPillTone.info
                : DriftPillTone.neutral,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        achievement.title,
                        style: type.label.copyWith(
                          fontWeight: FontWeight.w700,
                          color: achievement.earned
                              ? colors.textPrimary
                              : colors.textSecondary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    DriftPill(
                      label: achievement.earned ? 'Earned' : 'Locked',
                      tone: achievement.earned
                          ? DriftPillTone.success
                          : DriftPillTone.warning,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  achievement.description,
                  style: type.caption.copyWith(
                    color: colors.textSecondary,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: LinearProgressIndicator(
                    value: progress.toDouble(),
                    minHeight: 4,
                    backgroundColor: colors.border,
                    valueColor: AlwaysStoppedAnimation(
                      achievement.earned ? colors.primary : colors.textSecondary,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${achievement.current}/${achievement.target}',
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
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  achievement.earned
                      ? Icons.check_circle_outline
                      : Icons.lock_outline,
                  color: colors.primary,
                ),
                const SizedBox(width: 12),
                Expanded(child: Text(achievement.title, style: type.h3)),
              ],
            ),
            const SizedBox(height: 12),
            Text(achievement.description, style: type.body),
            const SizedBox(height: 12),
            Text(
              'Criteria',
              style: type.label.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
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
