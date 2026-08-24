import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
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

/// Skill Detail — `foundation/04-screen-inventory.md` §A.7. "Historical
/// trend, contributing signals" is shown as the actual list of logged
/// practice sessions rather than a synthesised daily line chart — there's
/// no daily skill-snapshot table, and fabricating a smooth trend from
/// sparse signals would violate the same "never fabricate" discipline M9
/// applied to court data.
class SkillDetailScreen extends ConsumerWidget {
  const SkillDetailScreen({super.key, required this.skill});

  final String skill;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(skillDetailProvider(skill));
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(title: Text(_skillLabels[skill] ?? skill)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(skillDetailProvider(skill).future),
          child: switch (detail) {
            AsyncData(:final value) =>
              value.score == null && value.practiceSessions.isEmpty
                  ? ListView(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(DriftSpacing.s6),
                          child: Column(
                            children: [
                              const SizedBox(height: DriftSpacing.s12),
                              Text(
                                'Not enough data yet — complete a few practice sessions or matches',
                                style: type.body.copyWith(
                                  color: colors.textSecondary,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: DriftSpacing.s4),
                              DriftButton(
                                label: 'Set a Goal',
                                variant: DriftButtonVariant.text,
                                onPressed: () => context.push(
                                  '/learn/goals/create',
                                  extra: skill,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    )
                  : ListView(
                      padding: const EdgeInsets.all(DriftSpacing.s5),
                      children: [
                        if (value.score != null) ...[
                          Text(
                            value.maturity == 'DIRECTIONAL'
                                ? 'Building'
                                : '${(value.score! / 6 * 100).round()}%',
                            style: type.display,
                          ),
                          const SizedBox(height: DriftSpacing.s1),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: (value.score! / 6).clamp(0.0, 1.0),
                              minHeight: 8,
                            ),
                          ),
                          const SizedBox(height: DriftSpacing.s4),
                        ],
                        DriftButton(
                          label: 'Set a Goal',
                          onPressed: () =>
                              context.push('/learn/goals/create', extra: skill),
                        ),
                        if (value.recommendations.isNotEmpty) ...[
                          const SizedBox(height: DriftSpacing.s5),
                          Text('Recommended', style: type.h4),
                          const SizedBox(height: DriftSpacing.s3),
                          for (final rec in value.recommendations)
                            Padding(
                              padding: const EdgeInsets.only(
                                bottom: DriftSpacing.s3,
                              ),
                              child: DriftCard(
                                onTap: () =>
                                    context.push('/learn/content/${rec.id}'),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(rec.title, style: type.body),
                                    ),
                                    Icon(
                                      Icons.chevron_right,
                                      color: colors.textSecondary,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                        if (value.practiceSessions.isNotEmpty) ...[
                          const SizedBox(height: DriftSpacing.s5),
                          Text('Contributing signals', style: type.h4),
                          const SizedBox(height: DriftSpacing.s3),
                          if (value.assessmentBaseline != null)
                            DriftCard(
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      'Onboarding assessment',
                                      style: type.body,
                                    ),
                                  ),
                                  Text(
                                    '${value.assessmentBaseline!.toStringAsFixed(1)}/6',
                                    style: type.label,
                                  ),
                                ],
                              ),
                            ),
                          const SizedBox(height: DriftSpacing.s3),
                          for (final session in value.practiceSessions)
                            Padding(
                              padding: const EdgeInsets.only(
                                bottom: DriftSpacing.s3,
                              ),
                              child: DriftCard(
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            _formatDate(session.occurredAt),
                                            style: type.body,
                                          ),
                                          if (session.drill != null)
                                            Text(
                                              session.drill!.title,
                                              style: type.bodySmall.copyWith(
                                                color: colors.textSecondary,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                    Text(
                                      '${session.perceivedPerformance}/5',
                                      style: type.label,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ],
                    ),
            AsyncError() => const Center(child: Text('Not available.')),
            _ => const Center(child: CircularProgressIndicator()),
          },
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
