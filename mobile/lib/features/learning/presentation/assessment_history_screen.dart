import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/learning_providers.dart';
import '../../../core/l10n/l10n.dart';

/// Assessment History — `foundation/04-screen-inventory.md` §A.7. A plain
/// list of past completed assessments; there's no separate historical
/// skill-breakdown view per past assessment (only the current Skill Profile
/// computes a live breakdown) — a documented scope trim, not an oversight.
class AssessmentHistoryScreen extends ConsumerWidget {
  const AssessmentHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(progressReportProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: context.l10n.assessmentHistory,
      body: switch (report) {
        AsyncData(:final value) =>
          value.assessmentHistory.isEmpty
              ? Center(
                  child: Text(
                    context.l10n.assessmentOnlyOne,
                    style: type.body.copyWith(color: colors.textSecondary),
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(DriftSpacing.s4),
                  itemCount: value.assessmentHistory.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(height: DriftSpacing.s3),
                  itemBuilder: (context, index) {
                    final entry = value.assessmentHistory[index];
                    return DriftCard(
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              entry.completedAt != null
                                  ? '${entry.completedAt!.day}/${entry.completedAt!.month}/${entry.completedAt!.year}'
                                  : context.l10n.commonUnknownDate,
                              style: type.body,
                            ),
                          ),
                          if (entry.resultSystemSuggestedLevel != null)
                            Text(
                              context.l10n.commonLevel(
                                entry.resultSystemSuggestedLevel!
                                    .toStringAsFixed(1),
                              ),
                              style: type.label,
                            ),
                        ],
                      ),
                    );
                  },
                ),
        AsyncError() => Center(child: Text(context.l10n.commonNotAvailable)),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}
