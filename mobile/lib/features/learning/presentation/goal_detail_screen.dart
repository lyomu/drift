import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../../shared/widgets/drift_status_badge.dart';
import '../application/learning_providers.dart';
import '../data/learning_repository.dart';

const _skillLabels = {
  'FOREHAND': 'Forehand',
  'BACKHAND': 'Backhand',
  'SERVE': 'Serve',
  'RETURN': 'Return',
  'NET_PLAY': 'Net Play',
  'MOVEMENT': 'Movement',
  'MATCH_PLAY': 'Match Play',
};

/// Goal Detail — `foundation/04-screen-inventory.md` §A.7. Status is always
/// server-derived (never a stored field the client could show stale).
class GoalDetailScreen extends ConsumerStatefulWidget {
  const GoalDetailScreen({super.key, required this.goalId});

  final String goalId;

  @override
  ConsumerState<GoalDetailScreen> createState() => _GoalDetailScreenState();
}

class _GoalDetailScreenState extends ConsumerState<GoalDetailScreen> {
  bool _isBusy = false;

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _isBusy = true);
    try {
      await action();
      ref.invalidate(goalDetailProvider(widget.goalId));
      ref.invalidate(goalsProvider);
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final goal = ref.watch(goalDetailProvider(widget.goalId));
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: 'Goal',
      trailing: DriftHeaderSquareButton(
        icon: Icons.delete_outline,
        onTap: () async {
          final confirmed = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Delete this goal?'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  child: const Text('Delete'),
                ),
              ],
            ),
          );
          if (confirmed == true) {
            await ref
                .read(learningRepositoryProvider)
                .deleteGoal(widget.goalId);
            ref.invalidate(goalsProvider);
            if (context.mounted) Navigator.of(context).pop();
          }
        },
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(goalDetailProvider(widget.goalId).future),
        child: switch (goal) {
          AsyncData(:final value) => ListView(
            padding: const EdgeInsets.all(DriftSpacing.s5),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _skillLabels[value.skill] ?? value.skill,
                      style: type.h2,
                    ),
                  ),
                  _StatusBadge(status: value.status),
                ],
              ),
              const SizedBox(height: DriftSpacing.s4),
              DriftCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _Fact(
                      label: 'Baseline',
                      value: '${value.baseline.toStringAsFixed(1)}/6',
                    ),
                    _Fact(
                      label: 'Current',
                      value: value.currentScore != null
                          ? '${value.currentScore!.toStringAsFixed(1)}/6'
                          : 'No data yet',
                    ),
                    _Fact(
                      label: 'Target',
                      value: '${value.target.toStringAsFixed(1)}/6',
                    ),
                    if (value.deadline != null)
                      _Fact(
                        label: 'Deadline',
                        value:
                            '${value.deadline!.day}/${value.deadline!.month}/${value.deadline!.year}',
                      ),
                  ],
                ),
              ),
              if (value.milestones.isNotEmpty) ...[
                const SizedBox(height: DriftSpacing.s5),
                Text('Milestones', style: type.h4),
                const SizedBox(height: DriftSpacing.s3),
                for (final milestone in value.milestones)
                  Padding(
                    padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
                    child: DriftCard(
                      onTap: milestone.achievedAt != null || _isBusy
                          ? null
                          : () => _run(
                              () => ref
                                  .read(learningRepositoryProvider)
                                  .completeMilestone(
                                    widget.goalId,
                                    milestone.id,
                                  ),
                            ),
                      child: Row(
                        children: [
                          Icon(
                            milestone.achievedAt != null
                                ? Icons.check_circle
                                : Icons.radio_button_unchecked,
                            color: milestone.achievedAt != null
                                ? colors.success
                                : colors.textSecondary,
                          ),
                          const SizedBox(width: DriftSpacing.s3),
                          Expanded(
                            child: Text(milestone.label, style: type.body),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
              const SizedBox(height: DriftSpacing.s5),
              if (value.status != 'ACHIEVED')
                DriftButton(
                  label: _isBusy ? 'Saving…' : 'Mark Complete',
                  onPressed: _isBusy
                      ? null
                      : () => _run(
                          () => ref
                              .read(learningRepositoryProvider)
                              .completeGoal(widget.goalId),
                        ),
                ),
            ],
          ),
          AsyncError() => const Center(child: Text('Goal not available.')),
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

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Padding(
      padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
          ),
          Expanded(child: Text(value, style: type.body)),
        ],
      ),
    );
  }
}
