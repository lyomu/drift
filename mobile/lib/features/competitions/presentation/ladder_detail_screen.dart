import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../data/expansion_repository.dart';

/// Ladder standings detail (Wave 6) — rung positions with W/L, the viewer's
/// row highlighted.
class LadderDetailScreen extends ConsumerWidget {
  const LadderDetailScreen({super.key, required this.ladderId});

  final String ladderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(ladderDetailProvider(ladderId));
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(title: const Text('Ladder')),
      body: SafeArea(
        child: switch (detail) {
          AsyncData(:final value) => Builder(builder: (context) {
              final l = value.ladder;
              return ListView(
                padding: const EdgeInsets.all(DriftSpacing.s5),
                children: [
                  Text(l.name, style: type.h1),
                  const SizedBox(height: DriftSpacing.s1),
                  Text(
                    '${l.clubName} · challenge range ${l.entryCount > 0 ? 2 : 2}',
                    style: type.bodySmall.copyWith(color: colors.textSecondary),
                  ),
                  const SizedBox(height: DriftSpacing.s4),
                  for (final e in value.entries)
                    Padding(
                      padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
                      child: DriftCard(
                        child: Row(
                          children: [
                            SizedBox(
                              width: 32,
                              child: Text(
                                '${e.position}',
                                style: type.title.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            const SizedBox(width: DriftSpacing.s2),
                            Expanded(
                              child: Text(
                                e.name.isEmpty ? 'Player' : e.name,
                                style: type.body,
                              ),
                            ),
                            Text(
                              '${e.wins}W ${e.losses}L',
                              style: type.bodySmall.copyWith(
                                color: colors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              );
            }),
          AsyncError() => Center(
              child: Text(
                'Ladder not available.',
                style: type.body.copyWith(color: colors.textSecondary),
              ),
            ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}
