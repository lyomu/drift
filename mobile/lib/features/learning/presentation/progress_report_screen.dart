import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
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

/// Progress Report — `foundation/04-screen-inventory.md` §A.7.
class ProgressReportScreen extends ConsumerWidget {
  const ProgressReportScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(progressReportProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(title: const Text('Progress Report')),
      body: SafeArea(
        child: RefreshIndicator(
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
                                'Your progress report builds up as you play and practice',
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
                                    _skillLabels[skill.skill] ?? skill.skill,
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
                          label: 'Assessment History',
                          variant: DriftButtonVariant.text,
                          onPressed: () => context.push('/learn/assessments'),
                        ),
                      ],
                    ),
            AsyncError() => const Center(child: Text('Not available.')),
            _ => const Center(child: CircularProgressIndicator()),
          },
        ),
      ),
    );
  }
}
