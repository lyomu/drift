import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../padel/application/padel_providers.dart';
import '../application/profile_providers.dart';

/// My Sports Hub — `foundation/04-screen-inventory.md` §A.10. Tennis is
/// always real; Padel (M13) becomes real once added — the card routes to
/// "+ Add Padel" or "Open Padel Profile" depending on whether
/// `GET /padel/profile` 404s.
class MySportsHubScreen extends ConsumerWidget {
  const MySportsHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tennisProfile = ref.watch(ownProfileProvider);
    final padelProfile = ref.watch(padelProfileProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(title: const Text('My Sports')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(DriftSpacing.s5),
          children: [
            DriftCard(
              onTap: () => context.push('/profile/own'),
              child: Row(
                children: [
                  Icon(Icons.sports_tennis, color: colors.primary),
                  const SizedBox(width: DriftSpacing.s3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Tennis', style: type.title),
                        const SizedBox(height: DriftSpacing.s1),
                        Text(
                          switch (tennisProfile) {
                            AsyncData(:final value) =>
                              value.summary.levelLabel == null
                                  ? 'Level not yet assessed'
                                  : 'Level ${value.summary.level!.toStringAsFixed(1)} · ${value.summary.levelLabel}',
                            _ => 'Your active profile',
                          },
                          style: type.bodySmall.copyWith(
                            color: colors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right, color: colors.textSecondary),
                ],
              ),
            ),
            const SizedBox(height: DriftSpacing.s3),
            DriftCard(
              onTap: () => switch (padelProfile) {
                AsyncData(:final value) when value != null => context.push(
                  '/profile/padel',
                ),
                AsyncData() => context.push('/profile/padel/add'),
                _ => null,
              },
              child: Row(
                children: [
                  Icon(Icons.sports_baseball_outlined, color: colors.primary),
                  const SizedBox(width: DriftSpacing.s3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Padel', style: type.title),
                        const SizedBox(height: DriftSpacing.s1),
                        Text(
                          switch (padelProfile) {
                            AsyncData(:final value) when value != null =>
                              value.systemSuggestedLevel == null
                                  ? 'Level not yet assessed'
                                  : 'Level ${value.systemSuggestedLevel!.toStringAsFixed(1)} · ${value.levelLabel}',
                            AsyncData() => '+ Add Padel',
                            AsyncError() => "Couldn't load your Padel profile",
                            _ => 'Loading…',
                          },
                          style: type.bodySmall.copyWith(
                            color: colors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right, color: colors.textSecondary),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
