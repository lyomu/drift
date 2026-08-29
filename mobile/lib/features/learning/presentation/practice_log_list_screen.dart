import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
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

/// Practice Log List — `foundation/04-screen-inventory.md` §A.7.
class PracticeLogListScreen extends ConsumerWidget {
  const PracticeLogListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessions = ref.watch(practiceSessionsProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftScaffold(
      title: 'Practice Log',
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/learn/practice/add'),
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(practiceSessionsProvider.future),
        child: switch (sessions) {
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
                              Icons.fitness_center_outlined,
                              size: 40,
                              color: colors.textSecondary,
                            ),
                            const SizedBox(height: DriftSpacing.s3),
                            Text(
                              'Log your first practice session',
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
                      final session = value[index];
                      return DriftCard(
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _skillLabels[session.skillFocus] ??
                                        session.skillFocus,
                                    style: type.title,
                                  ),
                                  const SizedBox(height: DriftSpacing.s1),
                                  Text(
                                    '${_formatDate(session.occurredAt)} · ${session.durationMinutes} min',
                                    style: type.bodySmall.copyWith(
                                      color: colors.textSecondary,
                                    ),
                                  ),
                                  if (session.drill != null)
                                    Text(
                                      session.drill!.title,
                                      style: type.caption.copyWith(
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
                      );
                    },
                  ),
          AsyncError() => const Center(
            child: Text("Couldn't load your practice log."),
          ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
