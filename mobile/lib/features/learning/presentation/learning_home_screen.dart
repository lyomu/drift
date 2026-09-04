import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_icon_tile.dart';
import '../../../shared/widgets/drift_soft_card.dart';

const _skillLabels = {
  'FOREHAND': 'Forehand',
  'BACKHAND': 'Backhand',
  'SERVE': 'Serve',
  'RETURN': 'Return',
  'NET_PLAY': 'Net Play',
  'MOVEMENT': 'Movement',
  'MATCH_PLAY': 'Match Play',
};

/// Learning Home — `foundation/04-screen-inventory.md` §A.7 (redesign
/// 2026-08: `App.tsx` `LearnView`). Entry to structured learning + a
/// browse-by-skill grid.
///
/// Set [embedded] when the screen is hosted as the Learn tab of [AppShell]
/// (2026-09 redesign): the shell already supplies the scaffold and the app
/// header, and there is nothing to go back *to* from a root tab. The `/learn`
/// route keeps rendering it standalone, with its own back header.
class LearningHomeScreen extends StatelessWidget {
  const LearningHomeScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  Widget build(BuildContext context) {
    final body = _body(context);
    if (embedded) return body;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const DriftBackHeader(title: 'Learn'),
            Expanded(child: body),
          ],
        ),
      ),
    );
  }

  Widget _body(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        _NavCard(
          icon: Icons.insights_outlined,
          label: 'Skill Profile',
          onTap: () => context.push('/learn/skill-profile'),
        ),
        const SizedBox(height: 8),
        _NavCard(
          icon: Icons.fitness_center_outlined,
          label: 'Practice Log',
          onTap: () => context.push('/learn/practice'),
        ),
        const SizedBox(height: 8),
        _NavCard(
          icon: Icons.flag_outlined,
          label: 'Goals',
          onTap: () => context.push('/learn/goals'),
        ),
        const SizedBox(height: 8),
        _NavCard(
          icon: Icons.trending_up_outlined,
          label: 'Progress Report',
          onTap: () => context.push('/learn/progress'),
        ),
        const SizedBox(height: 20),
        Text(
          'Browse by skill',
          style: type.title.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final entry in _skillLabels.entries)
              InkWell(
                borderRadius: BorderRadius.circular(999),
                onTap: () => context.push('/learn/browse/${entry.key}'),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: colors.surface,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: colors.border, width: 1.5),
                  ),
                  child: Text(entry.value, style: type.bodySmall),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _NavCard extends StatelessWidget {
  const _NavCard({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftSoftCard(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      onTap: onTap,
      child: Row(
        children: [
          DriftIconTile(icon: icon),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              label,
              style: type.title.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
          Icon(Icons.chevron_right, color: colors.textSecondary),
        ],
      ),
    );
  }
}
