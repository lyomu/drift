import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/learning_providers.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/enum_labels.dart';

/// Progress Report — `foundation/04-screen-inventory.md` §A.7.
class ProgressReportScreen extends ConsumerWidget {
  const ProgressReportScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(progressReportProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: context.l10n.learnProgressReport,
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(progressReportProvider.future),
        child: switch (report) {
          AsyncData(:final value) =>
            value.skills.every((s) => s.score == null)
                ? ListView(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(DriftSpacing.s6),
                        child: Column(
                          children: [
                            const SizedBox(height: DriftSpacing.s12),
                            Text(
                              context.l10n.progressEmpty,
                              style: type.body.copyWith(
                                color: colors.textSecondary,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ],
                  )
                : ListView(
                    padding: const EdgeInsets.all(DriftSpacing.s5),
                    children: [
                      for (final skill in value.skills)
                        if (skill.score != null)
                          Padding(
                            padding: const EdgeInsets.only(
                              bottom: DriftSpacing.s3,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  pillarLabel(context.l10n, skill.skill),
                                  style: type.label,
                                ),
                                const SizedBox(height: DriftSpacing.s1),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: LinearProgressIndicator(
                                    value: (skill.score! / 6).clamp(0.0, 1.0),
                                    minHeight: 8,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      const SizedBox(height: DriftSpacing.s4),
                      DriftButton(
                        label: context.l10n.assessmentHistory,
                        variant: DriftButtonVariant.text,
                        onPressed: () => context.push('/learn/assessments'),
                      ),
                    ],
                  ),
          AsyncError() => Center(child: Text(context.l10n.commonNotAvailable)),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}
