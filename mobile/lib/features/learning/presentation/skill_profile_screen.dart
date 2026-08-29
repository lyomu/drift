import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/learning_providers.dart';

const _skillLabels = {
  'FOREHAND': 'Forehand',
  'BACKHAND': 'Backhand',
  'SERVE': 'Serve',
  'RETURN': 'Return',
  'NET_PLAY': 'Net Play',
  'MOVEMENT': 'Movement',
  'MATCH_PLAY': 'Match Play',
};

/// Skill Profile — `foundation/04-screen-inventory.md` §A.7. Development
/// percentages are never shown for DIRECTIONAL (assessment-only) data —
/// "Building" reads honestly instead of a falsely precise number, per the
/// design rule in `foundation/03-user-journeys.md` §8.
class SkillProfileScreen extends ConsumerWidget {
  const SkillProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(skillProfileProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: 'Skill Profile',
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(skillProfileProvider.future),
        child: switch (profile) {
          AsyncData(:final value) => ListView(
            padding: const EdgeInsets.all(DriftSpacing.s5),
            children: [
              for (final skill in value.skills)
                Padding(
                  padding: const EdgeInsets.only(bottom: DriftSpacing.s4),
                  child: DriftCard(
                    onTap: () =>
                        context.push('/learn/skill-profile/${skill.skill}'),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    _skillLabels[skill.skill] ?? skill.skill,
                                    style: type.title,
                                  ),
                                  if (skill.skill == value.weakestSkill) ...[
                                    const SizedBox(width: DriftSpacing.s2),
                                    Icon(
                                      Icons.priority_high,
                                      size: 16,
                                      color: colors.warning,
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: DriftSpacing.s2),
                              if (skill.score == null)
                                Text(
                                  'No data yet',
                                  style: type.bodySmall.copyWith(
                                    color: colors.textSecondary,
                                  ),
                                )
                              else ...[
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: LinearProgressIndicator(
                                    value: (skill.score! / 6).clamp(0.0, 1.0),
                                    minHeight: 8,
                                  ),
                                ),
                                const SizedBox(height: DriftSpacing.s1),
                                Text(
                                  skill.maturity == 'DIRECTIONAL'
                                      ? 'Building'
                                      : '${(skill.score! / 6 * 100).round()}%',
                                  style: type.caption.copyWith(
                                    color: colors.textSecondary,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right, color: colors.textSecondary),
                      ],
                    ),
                  ),
                ),
              if (value.recommendations.isNotEmpty) ...[
                const SizedBox(height: DriftSpacing.s2),
                Text('Recommended for you', style: type.h4),
                const SizedBox(height: DriftSpacing.s3),
                for (final rec in value.recommendations)
                  Padding(
                    padding: const EdgeInsets.only(bottom: DriftSpacing.s3),
                    child: DriftCard(
                      onTap: () => context.push('/learn/content/${rec.id}'),
                      child: Row(
                        children: [
                          Expanded(child: Text(rec.title, style: type.body)),
                          Icon(
                            Icons.chevron_right,
                            color: colors.textSecondary,
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
              const SizedBox(height: DriftSpacing.s4),
              Center(
                child: DriftButton(
                  label: 'Retake Assessment',
                  variant: DriftButtonVariant.text,
                  onPressed: () => context.push('/onboarding/assessment'),
                ),
              ),
            ],
          ),
          AsyncError() => const Center(
            child: Text('Skill profile not available.'),
          ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}
