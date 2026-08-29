import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/learning_providers.dart';

/// Training Plan Detail — `foundation/04-screen-inventory.md` §A.7. An
/// ordered, read-only list of real Lesson/Drill steps. Enrollment/progress
/// tracking is deliberately not modelled — Doc 3 §8's journey text never
/// walks through Training Plans, only the screen-inventory row does (see
/// `TrainingPlanStep`'s schema comment) — so "Start Plan" is just "open the
/// first step" rather than a persisted enrollment state.
class TrainingPlanDetailScreen extends ConsumerWidget {
  const TrainingPlanDetailScreen({super.key, required this.planId});

  final String planId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plan = ref.watch(contentDetailProvider(planId));
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: 'Training Plan',
      body: switch (plan) {
        AsyncData(:final value) => ListView(
          padding: const EdgeInsets.all(DriftSpacing.s5),
          children: [
            Text(value.summary.title, style: type.h2),
            if (value.summary.summary != null) ...[
              const SizedBox(height: DriftSpacing.s2),
              Text(value.summary.summary!, style: type.body),
            ],
            const SizedBox(height: DriftSpacing.s5),
            Text('Steps', style: type.h4),
            const SizedBox(height: DriftSpacing.s3),
            for (var i = 0; i < value.steps.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: DriftSpacing.s3),
                child: DriftCard(
                  onTap: () =>
                      context.push('/learn/content/${value.steps[i].id}'),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 14,
                        backgroundColor: colors.primaryLight,
                        child: Text(
                          '${i + 1}',
                          style: type.label.copyWith(
                            color: colors.primaryDark,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: DriftSpacing.s3),
                      Expanded(
                        child: Text(value.steps[i].title, style: type.title),
                      ),
                      Icon(Icons.chevron_right, color: colors.textSecondary),
                    ],
                  ),
                ),
              ),
          ],
        ),
        AsyncError() => const Center(child: Text('Plan not available.')),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}
