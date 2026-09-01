import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_icon_tile.dart';
import '../../../shared/widgets/drift_pill.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../../padel/application/padel_providers.dart';
import '../application/profile_providers.dart';

/// My Sports Hub — `foundation/04-screen-inventory.md` §A.10 (redesign
/// 2026-08: `App.tsx` `ProfileSportsView`). Tennis is always real; Padel
/// (M13) routes to "+ Add Padel" or the Padel profile depending on whether
/// `GET /padel/profile` 404s.
class MySportsHubScreen extends ConsumerWidget {
  const MySportsHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tennisProfile = ref.watch(ownProfileProvider);
    final padelProfile = ref.watch(padelProfileProvider);

    final tennisLevel = switch (tennisProfile) {
      AsyncData(:final value) =>
        value.summary.levelLabel == null
            ? 'Level not yet assessed'
            : 'Level ${value.summary.level!.toStringAsFixed(1)} · ${value.summary.levelLabel}',
      _ => 'Your active profile',
    };

    final padelLevel = switch (padelProfile) {
      AsyncData(:final value) when value != null =>
        value.systemSuggestedLevel == null
            ? 'Level not yet assessed'
            : 'Level ${value.systemSuggestedLevel!.toStringAsFixed(1)} · ${value.levelLabel}',
      AsyncData() => '+ Add Padel',
      AsyncError() => "Couldn't load your Padel profile",
      _ => 'Loading…',
    };
    final padelAssessed = switch (padelProfile) {
      AsyncData(:final value) when value != null =>
        value.systemSuggestedLevel != null,
      _ => false,
    };

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const DriftBackHeader(title: 'My Sports'),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                children: [
                  _SportRow(
                    icon: Icons.sports_tennis_outlined,
                    name: 'Tennis',
                    level: tennisLevel,
                    assessed: true,
                    onTap: () => context.push('/profile/own'),
                  ),
                  const SizedBox(height: 10),
                  _SportRow(
                    icon: Icons.sports_baseball_outlined,
                    name: 'Padel',
                    level: padelLevel,
                    assessed: padelAssessed,
                    onTap: () => switch (padelProfile) {
                      AsyncData(:final value) when value != null =>
                        context.push('/profile/padel'),
                      AsyncData() => context.push('/profile/padel/add'),
                      _ => null,
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SportRow extends StatelessWidget {
  const _SportRow({
    required this.icon,
    required this.name,
    required this.level,
    required this.assessed,
    required this.onTap,
  });

  final IconData icon;
  final String name;
  final String level;
  final bool assessed;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftSoftCard(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      onTap: onTap,
      child: Row(
        children: [
          DriftIconTile(
            icon: icon,
            size: 44,
            radius: 12,
            tone: assessed ? DriftPillTone.info : DriftPillTone.neutral,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: type.title.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 3),
                Text(
                  level,
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: colors.textSecondary),
        ],
      ),
    );
  }
}
