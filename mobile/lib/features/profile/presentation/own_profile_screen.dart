import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_primary_button.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../../matches/data/player_stats.dart';
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

/// Own Profile — `foundation/04-screen-inventory.md` §A.10 (redesign 2026-08:
/// `App.tsx` `ProfileDetailView`). `GET /players/me` never gates skill
/// breakdown/availability behind a connection.
class OwnProfileScreen extends ConsumerWidget {
  const OwnProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(ownProfileProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(ownProfileProvider.future),
        child: switch (profile) {
          AsyncData(:final value) => _ProfileBody(profile: value),
          AsyncError() => ListView(
            children: [
              const _GradientHeader(name: 'My Profile', location: null),
              Padding(
                padding: const EdgeInsets.all(24),
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

    final facts = <(String, String)>[
      if (summary.level != null)
        (
          'Level',
          '${summary.level!.toStringAsFixed(1)} · ${summary.levelLabel}',
        ),
      if (profile.dominantHand != null)
        ('Plays', '${_titleCase(profile.dominantHand!)} handed'),
      if (summary.formatPreference != null)
        ('Format', _titleCase(summary.formatPreference!)),
      if (summary.stylePreference != null)
        ('Style', _titleCase(summary.stylePreference!)),
    ];

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        _GradientHeader(
          name: summary.displayName,
          location: summary.generalLocation,
          initials: _initials(summary),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              DriftSoftCard(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AT A GLANCE',
                      style: type.caption.copyWith(
                        fontWeight: FontWeight.w700,
                        color: colors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    for (var i = 0; i < facts.length; i++)
                      _Fact(
                        label: facts[i].$1,
                        value: facts[i].$2,
                        last: i == facts.length - 1,
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              _ViewStatsLink(stats: profile.stats),
              const SizedBox(height: 10),

              if (breakdown.isNotEmpty) ...[
                DriftSoftCard(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Development areas',
                        style: type.title.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 14),
                      for (final entry in breakdown.entries) ...[
                        Text(
                          _pillarLabels[entry.key] ?? entry.key,
                          style: type.caption.copyWith(
                            color: colors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 5),
                        _SkillBar(
                          value: (entry.value / 6).clamp(0.0, 1.0).toDouble(),
                        ),
                        const SizedBox(height: 11),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              if (slots.isNotEmpty)
                DriftSoftCard(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Availability',
                        style: type.title.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final slot in slots)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 7,
                              ),
                              decoration: BoxDecoration(
                                color: colors.primaryLight,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                '${_dayNames[slot.dayOfWeek]} · ${_titleCase(slot.timeBlock)}',
                                style: type.caption.copyWith(
                                  color: colors.primary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _GradientHeader extends StatelessWidget {
  const _GradientHeader({
    required this.name,
    required this.location,
    this.initials = 'AR',
  });

  final String name;
  final String? location;
  final String initials;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Container(
      padding: EdgeInsets.fromLTRB(
        16,
        MediaQuery.of(context).padding.top + 8,
        16,
        26,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [colors.primary, colors.primaryDark],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _GlassButton(
                icon: Icons.chevron_left,
                onTap: () {
                  if (context.canPop()) context.pop();
                },
              ),
              const Spacer(),
              Text(
                'My Profile',
                style: type.title.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              _GlassButton(
                icon: Icons.edit_outlined,
                onTap: () => context.push('/profile/edit'),
              ),
            ],
          ),
          const SizedBox(height: 22),
          Row(
            children: [
              Container(
                width: 70,
                height: 70,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.2),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.45),
                    width: 3,
                  ),
                ),
                child: Text(
                  initials,
                  style: type.h3.copyWith(color: Colors.white),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: type.h2.copyWith(color: Colors.white)),
                    if (location != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        location!,
                        style: type.bodySmall.copyWith(
                          color: Colors.white.withValues(alpha: 0.75),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _GlassButton extends StatelessWidget {
  const _GlassButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.2),
      borderRadius: BorderRadius.circular(10),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: SizedBox(
          width: 36,
          height: 36,
          child: Icon(icon, size: 20, color: Colors.white),
        ),
      ),
    );
  }
}

class _SkillBar extends StatelessWidget {
  const _SkillBar({required this.value});

  final double value;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return ClipRRect(
      borderRadius: BorderRadius.circular(3),
      child: Stack(
        children: [
          Container(height: 5, color: colors.primaryLight),
          FractionallySizedBox(
            widthFactor: value,
            child: Container(
              height: 5,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [colors.primaryDark, colors.primary],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ViewStatsLink extends StatelessWidget {
  const _ViewStatsLink({required this.stats});

  final PlayerStats stats;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.center,
      child: DriftTextLink(
        label: 'View Stats',
        onPressed: () =>
            context.push('/stats', extra: (title: 'My Stats', stats: stats)),
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact({required this.label, required this.value, this.last = false});

  final String label;
  final String value;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 9),
      decoration: BoxDecoration(
        border: last ? null : Border(bottom: BorderSide(color: colors.border)),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 84,
            child: Text(
              label,
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: type.bodySmall.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

String _titleCase(String enumValue) {
  return enumValue
      .split('_')
      .map((w) => w.isEmpty ? w : w[0] + w.substring(1).toLowerCase())
      .join(' ');
}

String _initials(PlayerSummary summary) {
  final parts = [summary.firstName, summary.lastName]
      .whereType<String>()
      .where((p) => p.isNotEmpty)
      .map((p) => p[0].toUpperCase())
      .take(2)
      .join();
  return parts.isEmpty ? '?' : parts;
}
