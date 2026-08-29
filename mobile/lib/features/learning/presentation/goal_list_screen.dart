import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../shared/widgets/drift_status_badge.dart';
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

/// Goal List — `foundation/04-screen-inventory.md` §A.7.
class GoalListScreen extends ConsumerWidget {
  const GoalListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final goals = ref.watch(goalsProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: 'Goals',
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/learn/goals/create'),
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(goalsProvider.future),
        child: switch (goals) {
          AsyncData(:final value) =>
            value.isEmpty
                ? ListView(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(DriftSpacing.s6),
                        child: Column(
                          children: [
                            const SizedBox(height: DriftSpacing.s12),
                            Icon(
                              Icons.flag_outlined,
                              size: 40,
                              color: colors.textSecondary,
                            ),
                            const SizedBox(height: DriftSpacing.s3),
                            Text(
                              'Set your first development goal',
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
                    padding: const EdgeInsets.fromLTRB(
                      DriftSpacing.s4,
                      DriftSpacing.s4,
                      DriftSpacing.s4,
                      DriftSpacing.s16,
                    ),
                    itemCount: value.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: DriftSpacing.s3),
                    itemBuilder: (context, index) {
                      final goal = value[index];
                      return DriftCard(
                        onTap: () => context.push('/learn/goals/${goal.id}'),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _skillLabels[goal.skill] ?? goal.skill,
                                    style: type.title,
                                  ),
                                  const SizedBox(height: DriftSpacing.s1),
                                  Text(
                                    'Target ${goal.target.toStringAsFixed(1)}/6',
                                    style: type.bodySmall.copyWith(
                                      color: colors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            _StatusBadge(status: goal.status),
                          ],
                        ),
                      );
                    },
                  ),
          AsyncError() => const Center(child: Text("Couldn't load goals.")),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = switch (status) {
      'ACHIEVED' => ('Achieved', DriftStatusTone.success),
      'BEHIND' => ('Behind', DriftStatusTone.warning),
      _ => ('On track', DriftStatusTone.info),
    };
    return DriftStatusBadge(label: label, tone: tone);
  }
}
