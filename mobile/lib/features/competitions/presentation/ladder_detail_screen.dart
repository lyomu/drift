import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_standings_table.dart';
import '../../users/application/current_user_provider.dart';
import '../data/competitions_repository.dart' show StandingRow;
import '../data/expansion_repository.dart';

/// Ladder standings detail — the ranked rung table (MP / W / L / Pts), the
/// viewer's row highlighted, top-3 ranks coloured. Same table as league
/// standings; ladder points are 3 per win.
class LadderDetailScreen extends ConsumerWidget {
  const LadderDetailScreen({super.key, required this.ladderId});

  final String ladderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(ladderDetailProvider(ladderId));
    final viewerId = ref.watch(currentUserProvider).valueOrNull?.id;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const DriftBackHeader(title: 'Ladder'),
            Expanded(
              child: switch (detail) {
                AsyncData(:final value) => ListView(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  children: [
                    Text(value.ladder.name, style: type.h2),
                    const SizedBox(height: 4),
                    Text(
                      '${value.ladder.clubName} · Active',
                      style: type.body.copyWith(color: colors.textSecondary),
                    ),
                    const SizedBox(height: 16),
                    DriftStandingsTable(
                      rows: [
                        for (final e in value.entries)
                          StandingRow(
                            userId: e.userId,
                            displayName: e.name.isEmpty ? 'Player' : e.name,
                            rank: e.position,
                            points: e.wins * 3,
                            wins: e.wins,
                            losses: e.losses,
                            previousRank: null,
                          ),
                      ],
                      highlightUserId: viewerId,
                      onTapRow: (userId) => context.push('/players/$userId'),
                    ),
                  ],
                ),
                AsyncError() => Center(
                  child: Text(
                    'Ladder not available.',
                    style: type.body.copyWith(color: colors.textSecondary),
                  ),
                ),
                _ => const Center(child: CircularProgressIndicator()),
              },
            ),
          ],
        ),
      ),
    );
  }
}
