import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_player_card.dart';
import '../../players/data/players_repository.dart';
import '../application/profile_providers.dart';

const _pillarLabels = {
  'FOREHAND': 'Forehand',
  'BACKHAND': 'Backhand',
  'SERVE': 'Serve',
  'RETURN': 'Return',
  'NET_PLAY': 'Net Play',
  'MOVEMENT': 'Movement',
  'MATCH_PLAY': 'Match Play',
  'COMPETITION_EXPERIENCE': 'Competition Experience',
};

const _dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/// Own Profile — `foundation/04-screen-inventory.md` §A.10. Reuses the same
/// `PlayerProfile` shape as the other-player screen, but via
/// `GET /players/me`, which never gates skill breakdown/availability behind
/// a connection (there isn't one with yourself).
class OwnProfileScreen extends ConsumerWidget {
  const OwnProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(ownProfileProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: [
          IconButton(
            onPressed: () => context.push('/profile/edit'),
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Edit Profile',
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(ownProfileProvider.future),
          child: switch (profile) {
            AsyncData(:final value) => _ProfileBody(profile: value),
            AsyncError() => ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.all(DriftSpacing.s6),
                  child: Text(
                    "Couldn't load your profile.",
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

  final PlayerProfile profile;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final summary = profile.summary;
    final breakdown = profile.skillBreakdown ?? const {};
    final slots = profile.availabilitySlots ?? const [];

    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s5),
      children: [
        Row(
          children: [
            DriftPlayerAvatar(player: summary, radius: 34),
            const SizedBox(width: DriftSpacing.s4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(summary.displayName, style: type.h2),
                  if (summary.generalLocation != null) ...[
                    const SizedBox(height: DriftSpacing.s1),
                    Text(
                      summary.generalLocation!,
                      style: type.bodySmall.copyWith(
                        color: colors.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: DriftSpacing.s5),

        DriftCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('At a glance', style: type.h4),
              const SizedBox(height: DriftSpacing.s3),
              if (summary.level != null)
                _Fact(
                  label: 'Level',
                  value:
                      '${summary.level!.toStringAsFixed(1)} · ${summary.levelLabel}',
                ),
              if (profile.dominantHand != null)
                _Fact(
                  label: 'Plays',
                  value: '${_titleCase(profile.dominantHand!)} handed',
                ),
              if (summary.preferredClubName != null)
                _Fact(label: 'Club', value: summary.preferredClubName!),
              if (summary.formatPreference != null)
                _Fact(
                  label: 'Format',
                  value: _titleCase(summary.formatPreference!),
                ),
              if (summary.stylePreference != null)
                _Fact(
                  label: 'Style',
                  value: _titleCase(summary.stylePreference!),
                ),
            ],
          ),
        ),
        const SizedBox(height: DriftSpacing.s4),

        DriftButton(
          label: 'View Stats',
          variant: DriftButtonVariant.text,
          onPressed: () => context.push(
            '/stats',
            extra: (title: 'My Stats', stats: profile.stats),
          ),
        ),
        const SizedBox(height: DriftSpacing.s2),
        DriftButton(
          label: 'View Achievements',
          variant: DriftButtonVariant.text,
          onPressed: () => context.push('/profile/achievements'),
        ),
        const SizedBox(height: DriftSpacing.s2),
        DriftButton(
          label: 'My Sports Hub',
          variant: DriftButtonVariant.text,
          onPressed: () => context.push('/profile/sports-hub'),
        ),
        const SizedBox(height: DriftSpacing.s4),

        if (breakdown.isNotEmpty) ...[
          DriftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Development areas', style: type.h4),
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
        ],

        if (slots.isNotEmpty)
          DriftCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Availability', style: type.h4),
                const SizedBox(height: DriftSpacing.s2),
                for (final slot in slots)
                  Padding(
                    padding: const EdgeInsets.only(bottom: DriftSpacing.s1),
                    child: Text(
                      '${_dayNames[slot.dayOfWeek]} · ${_titleCase(slot.timeBlock)}',
                      style: type.body.copyWith(color: colors.textSecondary),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

String _titleCase(String enumValue) {
  return enumValue
      .split('_')
      .map((w) => w.isEmpty ? w : w[0] + w.substring(1).toLowerCase())
      .join(' ');
}

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Padding(
      padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
          ),
          Expanded(child: Text(value, style: type.body)),
        ],
      ),
    );
  }
}
