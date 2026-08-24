import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_status_badge.dart';
import '../application/competitions_providers.dart';
import '../data/competitions_repository.dart';

/// My Seasons — `foundation/04-screen-inventory.md` §A.5. Reuses Play
/// Hub's segmented-list visual pattern (a plain refreshable list here,
/// since there's only one segment worth of data).
class MySeasonsScreen extends ConsumerWidget {
  const MySeasonsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final seasons = ref.watch(mySeasonsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My Seasons')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(mySeasonsProvider.future),
          child: switch (seasons) {
            AsyncData(:final value) =>
              value.isEmpty
                  ? const _EmptyState()
                  : ListView.separated(
                      padding: const EdgeInsets.all(DriftSpacing.s4),
                      itemCount: value.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: DriftSpacing.s3),
                      itemBuilder: (context, index) {
                        final season = value[index];
                        return DriftCard(
                          onTap: () => context.push(
                            '/compete/seasons/${season.seasonId}',
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      season.label,
                                      style: Theme.of(
                                        context,
                                      ).extension<DriftTypography>()!.title,
                                    ),
                                    const SizedBox(height: DriftSpacing.s1),
                                    Text(
                                      season.leagueName,
                                      style: Theme.of(context)
                                          .extension<DriftTypography>()!
                                          .bodySmall
                                          .copyWith(
                                            color: Theme.of(context)
                                                .extension<DriftColors>()!
                                                .textSecondary,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                              DriftStatusBadge(
                                label: season.state.label,
                                tone: season.state == SeasonState.active
                                    ? DriftStatusTone.success
                                    : DriftStatusTone.neutral,
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            AsyncError() => const Center(
              child: Text("Couldn't load your seasons."),
            ),
            _ => const Center(child: CircularProgressIndicator()),
          },
        ),
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
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(DriftSpacing.s6),
          child: Column(
            children: [
              const SizedBox(height: DriftSpacing.s12),
              Icon(
                Icons.emoji_events_outlined,
                size: 40,
                color: colors.textSecondary,
              ),
              const SizedBox(height: DriftSpacing.s3),
              Text(
                "You haven't joined a season yet",
                style: type.body.copyWith(color: colors.textSecondary),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
