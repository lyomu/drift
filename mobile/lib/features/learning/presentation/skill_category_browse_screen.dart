import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
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

/// Skill Category Browse — `foundation/04-screen-inventory.md` §A.7.
class SkillCategoryBrowseScreen extends ConsumerWidget {
  const SkillCategoryBrowseScreen({super.key, required this.skill});

  final String skill;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final content = ref.watch(
      contentBrowseProvider((type: null, targetSkill: skill)),
    );
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(title: Text(_skillLabels[skill] ?? skill)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(
            contentBrowseProvider((type: null, targetSkill: skill)).future,
          ),
          child: switch (content) {
            AsyncData(:final value) =>
              value.isEmpty
                  ? ListView(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(DriftSpacing.s6),
                          child: Column(
                            children: [
                              const SizedBox(height: DriftSpacing.s12),
                              Text(
                                'No content yet for this filter',
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
                  : ListView.separated(
                      padding: const EdgeInsets.all(DriftSpacing.s4),
                      itemCount: value.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: DriftSpacing.s3),
                      itemBuilder: (context, index) {
                        final item = value[index];
                        return DriftCard(
                          onTap: () => context.push(
                            item.isTrainingPlan
                                ? '/learn/plans/${item.id}'
                                : '/learn/content/${item.id}',
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(item.title, style: type.title),
                                    if (item.summary != null) ...[
                                      const SizedBox(height: DriftSpacing.s1),
                                      Text(
                                        item.summary!,
                                        style: type.bodySmall.copyWith(
                                          color: colors.textSecondary,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              Icon(
                                Icons.chevron_right,
                                color: colors.textSecondary,
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            AsyncError() => const Center(child: Text("Couldn't load content.")),
            _ => const Center(child: CircularProgressIndicator()),
          },
        ),
      ),
    );
  }
}
