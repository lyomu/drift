import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_league_card.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../application/competitions_providers.dart';

/// League Detail — `foundation/04-screen-inventory.md` §A.5 (redesign
/// 2026-08). Rules link plus every season this league has run.
class LeagueDetailScreen extends ConsumerWidget {
  const LeagueDetailScreen({super.key, required this.leagueId});

  final String leagueId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final league = ref.watch(leagueDetailProvider(leagueId));
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const DriftBackHeader(title: 'League'),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(leagueDetailProvider(leagueId));
                  await ref.read(leagueDetailProvider(leagueId).future);
                },
                child: switch (league) {
                  AsyncData(:final value) => ListView(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                    children: [
                      Text(
                        value.name,
                        style: type.h2.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        value.format == 'DOUBLES' ? 'Doubles' : 'Singles',
                        style: type.body.copyWith(color: colors.textSecondary),
                      ),
                      if (value.description != null &&
                          value.description!.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Text(
                          value.description!,
                          style: type.body.copyWith(height: 1.55),
                        ),
                      ],
                      const SizedBox(height: 16),
                      DriftSoftCard(
                        onTap: () =>
                            context.push('/compete/leagues/$leagueId/rules'),
                        child: _LinkRow(label: 'Rules'),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        'Seasons',
                        style: type.title.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 10),
                      if (value.seasons.isEmpty)
                        Text(
                          'No seasons yet.',
                          style: type.body.copyWith(
                            color: colors.textSecondary,
                          ),
                        )
                      else
                        for (final season in value.seasons) ...[
                          DriftSeasonCard(
                            season: season,
                            onTap: () => context.push(
                              '/compete/seasons/${season.id}',
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],
                    ],
                  ),
                  AsyncError() => const Center(
                    child: Text('League not available.'),
                  ),
                  _ => const Center(child: CircularProgressIndicator()),
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LinkRow extends StatelessWidget {
  const _LinkRow({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: type.body.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
        Icon(Icons.chevron_right, color: colors.textSecondary),
      ],
    );
  }
}
