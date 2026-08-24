import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_league_card.dart';
import '../application/competitions_providers.dart';

/// League Detail — `foundation/04-screen-inventory.md` §A.5. Rules link
/// plus every season this league has run, most recent first.
class LeagueDetailScreen extends ConsumerWidget {
  const LeagueDetailScreen({super.key, required this.leagueId});

  final String leagueId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final league = ref.watch(leagueDetailProvider(leagueId));

    return Scaffold(
      appBar: AppBar(title: const Text('League')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(leagueDetailProvider(leagueId));
            await ref.read(leagueDetailProvider(leagueId).future);
          },
          child: switch (league) {
            AsyncData(:final value) => ListView(
              padding: const EdgeInsets.all(DriftSpacing.s5),
              children: [
                Text(
                  value.name,
                  style: Theme.of(context).extension<DriftTypography>()!.h1,
                ),
                const SizedBox(height: DriftSpacing.s1),
                Text(
                  value.format == 'DOUBLES' ? 'Doubles' : 'Singles',
                  style: Theme.of(context)
                      .extension<DriftTypography>()!
                      .bodySmall
                      .copyWith(
                        color: Theme.of(
                          context,
                        ).extension<DriftColors>()!.textSecondary,
                      ),
                ),
                if (value.description != null) ...[
                  const SizedBox(height: DriftSpacing.s3),
                  Text(
                    value.description!,
                    style: Theme.of(context).extension<DriftTypography>()!.body,
                  ),
                ],
                const SizedBox(height: DriftSpacing.s4),
                DriftCard(
                  onTap: () => context.push('/compete/leagues/$leagueId/rules'),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Rules',
                          style: Theme.of(
                            context,
                          ).extension<DriftTypography>()!.title,
                        ),
                      ),
                      Icon(
                        Icons.chevron_right,
                        color: Theme.of(
                          context,
                        ).extension<DriftColors>()!.textSecondary,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: DriftSpacing.s5),
                Text(
                  'Seasons',
                  style: Theme.of(context).extension<DriftTypography>()!.h4,
                ),
                const SizedBox(height: DriftSpacing.s3),
                if (value.seasons.isEmpty)
                  Text(
                    'No seasons yet.',
                    style: Theme.of(context)
                        .extension<DriftTypography>()!
                        .body
                        .copyWith(
                          color: Theme.of(
                            context,
                          ).extension<DriftColors>()!.textSecondary,
                        ),
                  )
                else
                  for (final season in value.seasons)
                    Padding(
                      padding: const EdgeInsets.only(bottom: DriftSpacing.s3),
                      child: DriftSeasonCard(
                        season: season,
                        onTap: () =>
                            context.push('/compete/seasons/${season.id}'),
                      ),
                    ),
              ],
            ),
            AsyncError() => const Center(child: Text('League not available.')),
            _ => const Center(child: CircularProgressIndicator()),
          },
        ),
      ),
    );
  }
}
