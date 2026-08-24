import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../application/padel_providers.dart';
import '../data/padel_repository.dart';

const _pillarLabels = {
  'RALLY_CONSISTENCY': 'Rally Consistency',
  'FOREHAND': 'Forehand',
  'BACKHAND': 'Backhand',
  'SERVE': 'Serve',
  'RETURN': 'Return',
  'VOLLEY': 'Volley',
  'OVERHEAD': 'Overhead',
  'BANDEJA': 'Bandeja',
  'VIBORA': 'Vibora',
  'SMASH': 'Smash',
  'WALL_USAGE': 'Wall Usage',
  'POSITIONING': 'Positioning',
  'NET_CONTROL': 'Net Control',
  'TRANSITION': 'Transition',
  'PARTNER_COMMUNICATION': 'Partner Communication',
  'TACTICAL_AWARENESS': 'Tactical Awareness',
};

/// Padel Profile — `foundation/04-screen-inventory.md` §A.10. Fully
/// independent of Tennis Profile — its own rating, skill profile,
/// preferences, and goals.
class PadelProfileScreen extends ConsumerWidget {
  const PadelProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(padelProfileProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Padel Profile'),
        actions: [
          IconButton(
            onPressed: () => context.push('/profile/padel/preferences'),
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Preferences & Goals',
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(padelProfileProvider.future),
          child: switch (profile) {
            AsyncData(:final value) when value != null => _ProfileBody(
              profile: value,
            ),
            AsyncData() => ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.all(DriftSpacing.s6),
                  child: Text(
                    "Padel hasn't been added yet.",
                    style: type.body,
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
            AsyncError() => ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.all(DriftSpacing.s6),
                  child: Text(
                    "Couldn't load your Padel profile.",
                    style: type.body,
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
            _ => const Center(child: CircularProgressIndicator()),
          },
        ),
      ),
    );
  }
}

class _ProfileBody extends StatelessWidget {
  const _ProfileBody({required this.profile});

  final PadelProfile profile;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final breakdown = profile.skillBreakdown ?? const {};

    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s5),
      children: [
        DriftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Rating', style: type.h4),
              const SizedBox(height: DriftSpacing.s2),
              Text(
                profile.systemSuggestedLevel == null
                    ? 'Complete the assessment to get a rating'
                    : '${profile.systemSuggestedLevel!.toStringAsFixed(1)} · ${profile.levelLabel}',
                style: type.body,
              ),
            ],
          ),
        ),
        const SizedBox(height: DriftSpacing.s3),
        DriftButton(
          label: 'Padel Match History',
          variant: DriftButtonVariant.text,
          onPressed: () => context.push('/profile/padel/history'),
        ),
        const SizedBox(height: DriftSpacing.s4),
        if (breakdown.isNotEmpty)
          DriftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Skill profile', style: type.h4),
                const SizedBox(height: DriftSpacing.s3),
                for (final entry in breakdown.entries) ...[
                  Text(
                    _pillarLabels[entry.key] ?? entry.key,
                    style: type.label,
                  ),
                  const SizedBox(height: DriftSpacing.s1),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: (entry.value / 6).clamp(0.0, 1.0).toDouble(),
                      minHeight: 8,
                    ),
                  ),
                  const SizedBox(height: DriftSpacing.s3),
                ],
              ],
            ),
          ),
        const SizedBox(height: DriftSpacing.s4),
        DriftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Preferences', style: type.h4),
              const SizedBox(height: DriftSpacing.s2),
              Text(
                'Preferred side: ${profile.preferredSide?.label ?? 'Not set'}',
                style: type.body.copyWith(color: colors.textSecondary),
              ),
              if (profile.partnerPreference != null &&
                  profile.partnerPreference!.isNotEmpty) ...[
                const SizedBox(height: DriftSpacing.s1),
                Text(
                  'Partner preference: ${profile.partnerPreference}',
                  style: type.body.copyWith(color: colors.textSecondary),
                ),
              ],
              if (profile.goals.isNotEmpty) ...[
                const SizedBox(height: DriftSpacing.s2),
                Text('Goals', style: type.label),
                for (final goal in profile.goals)
                  Padding(
                    padding: const EdgeInsets.only(top: DriftSpacing.s1),
                    child: Text('• $goal', style: type.body),
                  ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
