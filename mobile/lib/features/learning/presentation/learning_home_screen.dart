import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';

const _skillLabels = {
  'FOREHAND': 'Forehand',
  'BACKHAND': 'Backhand',
  'SERVE': 'Serve',
  'RETURN': 'Return',
  'NET_PLAY': 'Net Play',
  'MOVEMENT': 'Movement',
  'MATCH_PLAY': 'Match Play',
};

/// Learning Home — `foundation/04-screen-inventory.md` §A.7. Entry to
/// structured learning: nav rows into Skill Profile/Practice/Goals/Progress,
/// plus a browse-by-skill grid into Skill Category Browse.
class LearningHomeScreen extends StatelessWidget {
  const LearningHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(title: const Text('Learn')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(DriftSpacing.s5),
          children: [
            _NavRow(
              icon: Icons.insights_outlined,
              label: 'Skill Profile',
              onTap: () => context.push('/learn/skill-profile'),
            ),
            const SizedBox(height: DriftSpacing.s3),
            _NavRow(
              icon: Icons.fitness_center_outlined,
              label: 'Practice Log',
              onTap: () => context.push('/learn/practice'),
            ),
            const SizedBox(height: DriftSpacing.s3),
            _NavRow(
              icon: Icons.flag_outlined,
              label: 'Goals',
              onTap: () => context.push('/learn/goals'),
            ),
            const SizedBox(height: DriftSpacing.s3),
            _NavRow(
              icon: Icons.trending_up_outlined,
              label: 'Progress Report',
              onTap: () => context.push('/learn/progress'),
            ),
            const SizedBox(height: DriftSpacing.s5),
            Text('Browse by skill', style: type.h4),
            const SizedBox(height: DriftSpacing.s3),
            Wrap(
              spacing: DriftSpacing.s2,
              runSpacing: DriftSpacing.s2,
              children: [
                for (final entry in _skillLabels.entries)
                  InkWell(
                    borderRadius: BorderRadius.circular(999),
                    onTap: () => context.push('/learn/browse/${entry.key}'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: colors.surface,
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: colors.border),
                      ),
                      child: Text(entry.value, style: type.label),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _NavRow extends StatelessWidget {
  const _NavRow({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftCard(
      onTap: onTap,
      child: Row(
        children: [
          Icon(icon, color: colors.primary),
          const SizedBox(width: DriftSpacing.s3),
          Expanded(child: Text(label, style: type.title)),
          Icon(Icons.chevron_right, color: colors.textSecondary),
        ],
      ),
    );
  }
}
