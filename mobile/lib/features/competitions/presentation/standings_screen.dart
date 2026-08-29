import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_standings_table.dart';
import '../../users/application/current_user_provider.dart';
import '../application/competitions_providers.dart';

/// Standings — `foundation/04-screen-inventory.md` §A.5 (redesign 2026-08).
class StandingsScreen extends ConsumerWidget {
  const StandingsScreen({super.key, required this.seasonId});

  final String seasonId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final standings = ref.watch(standingsProvider(seasonId));
    final season = ref.watch(seasonDetailProvider(seasonId)).valueOrNull;
    final viewer = ref.watch(currentUserProvider).valueOrNull;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const DriftBackHeader(title: 'Standings'),
            Expanded(
              child: switch (standings) {
                AsyncData(:final value) when value.isEmpty => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      'Standings appear once the first round is played.',
                      textAlign: TextAlign.center,
                      style: type.body.copyWith(color: colors.textSecondary),
                    ),
                  ),
                ),
                AsyncData(:final value) => RefreshIndicator(
                  onRefresh: () =>
                      ref.refresh(standingsProvider(seasonId).future),
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    children: [
                      if (season != null) ...[
                        Text(
                          season.label,
                          style: type.h3.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          season.leagueName,
                          style: type.caption.copyWith(
                            color: colors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                      DriftStandingsTable(
                        rows: value,
                        highlightUserId: viewer?.id,
                        onTapRow: (userId) => context.push('/players/$userId'),
                      ),
                    ],
                  ),
                ),
                AsyncError() => const Center(
                  child: Text("Couldn't load standings."),
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
