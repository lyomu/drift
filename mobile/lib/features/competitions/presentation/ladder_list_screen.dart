import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_pill.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../data/expansion_repository.dart';

/// Ladders segment — browse and open the rung standings.
class LadderListScreen extends ConsumerWidget {
  const LadderListScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ladders = ref.watch(laddersListProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    final content = RefreshIndicator(
      onRefresh: () => ref.refresh(laddersListProvider.future),
      child: switch (ladders) {
        AsyncData(:final value) when value.isEmpty => _message(
          context,
          'No ladders yet — ask your club to start one.',
        ),
        AsyncData(:final value) => ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
          itemCount: value.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, i) {
            final l = value[i];
            return DriftSoftCard(
              onTap: () => context.push('/compete/ladders/${l.id}'),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l.name,
                          style: type.title.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          l.clubName,
                          style: type.caption.copyWith(
                            color: colors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  DriftPill(
                    label: '${l.entryCount} players',
                    tone: DriftPillTone.neutral,
                  ),
                ],
              ),
            );
          },
        ),
        AsyncError() => _message(context, "Couldn't load ladders."),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );

    if (embedded) return content;
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Ladders',
              style: type.h2.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
          Expanded(child: content),
        ],
      ),
    );
  }

  Widget _message(BuildContext context, String text) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 64, 24, 24),
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: type.body.copyWith(color: colors.textSecondary),
          ),
        ),
      ],
    );
  }
}
