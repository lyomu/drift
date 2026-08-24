import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_standings_table.dart';
import '../../users/application/current_user_provider.dart';
import '../application/competitions_providers.dart';

/// Standings — `foundation/04-screen-inventory.md` §A.5.
class StandingsScreen extends ConsumerWidget {
  const StandingsScreen({super.key, required this.seasonId});

  final String seasonId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final standings = ref.watch(standingsProvider(seasonId));
    final viewer = ref.watch(currentUserProvider).valueOrNull;

    return Scaffold(
      appBar: AppBar(title: const Text('Standings')),
      body: SafeArea(
        child: switch (standings) {
          AsyncData(:final value) =>
            value.isEmpty
                ? const _EmptyState()
                : RefreshIndicator(
                    onRefresh: () =>
                        ref.refresh(standingsProvider(seasonId).future),
                    child: ListView(
                      padding: const EdgeInsets.all(DriftSpacing.s4),
                      children: [
                        DriftStandingsTable(
                          rows: value,
                          highlightUserId: viewer?.id,
                          onTapRow: (userId) =>
                              context.push('/players/$userId'),
                        ),
                      ],
                    ),
                  ),
          AsyncError() => const Center(child: Text("Couldn't load standings.")),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(DriftSpacing.s6),
        child: Text(
          'Standings appear once the first round is played',
          style: type.body.copyWith(color: colors.textSecondary),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
