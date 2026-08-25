import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../data/expansion_repository.dart';

/// Ladders segment (Wave 6) — browse and open the rung standings.
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
                            'No ladders yet — ask your club to start one.',
                            textAlign: TextAlign.center,
                            style: type.body.copyWith(color: colors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(DriftSpacing.s4),
                  itemCount: value.length,
                  separatorBuilder: (_, _) => const SizedBox(height: DriftSpacing.s3),
                  itemBuilder: (context, i) {
                    final l = value[i];
                    return DriftCard(
                      onTap: () => context.push('/compete/ladders/${l.id}'),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(l.name, style: type.title),
                                const SizedBox(height: DriftSpacing.s1),
                                Text(
                                  '${l.clubName} · ${l.entryCount} players',
                                  style: type.bodySmall.copyWith(
                                    color: colors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        AsyncError() => ListView(
            children: [
              Padding(
                padding: const EdgeInsets.all(DriftSpacing.s6),
                child: Text(
                  "Couldn't load ladders.",
                  textAlign: TextAlign.center,
                  style: type.body,
                ),
              ),
            ],
          ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );

    if (embedded) return content;
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(DriftSpacing.s4),
            child: Text('Ladders', style: type.display),
          ),
          Expanded(child: content),
        ],
      ),
    );
  }
}
