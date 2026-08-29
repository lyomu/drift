import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/drift_section_header.dart';
import '../../../../shared/widgets/drift_soft_card.dart';

/// Static 2×2 grid of the four things a player most often wants to start from
/// Home. Routes jump to the relevant tab / flow.
class QuickActionsGrid extends StatelessWidget {
  const QuickActionsGrid({super.key});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    final actions = <_QuickAction>[
      _QuickAction(
        label: 'Find Match',
        icon: Icons.person_search_outlined,
        color: colors.primary,
        onTap: () => context.go('/home?tab=play&play=find'),
      ),
      _QuickAction(
        label: 'Book Court',
        icon: Icons.sports_tennis_outlined,
        color: colors.success,
        onTap: () => context.go('/home?tab=discover&discover=courts'),
      ),
      _QuickAction(
        label: 'Log Practice',
        icon: Icons.edit_note_outlined,
        color: const Color(0xFF7C3AED),
        onTap: () => context.push('/learn/practice/add'),
      ),
      _QuickAction(
        label: 'Enter Ladder',
        icon: Icons.emoji_events_outlined,
        color: colors.warning,
        onTap: () => context.go('/home?tab=compete'),
      ),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const DriftSectionHeader(title: 'Quick actions'),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.72,
            children: [for (final a in actions) _QuickActionTile(action: a)],
          ),
        ],
      ),
    );
  }
}

class _QuickAction {
  const _QuickAction({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
}

class _QuickActionTile extends StatelessWidget {
  const _QuickActionTile({required this.action});

  final _QuickAction action;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return DriftSoftCard(
      onTap: action.onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: action.color,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(action.icon, color: Colors.white, size: 22),
          ),
          Text(
            action.label,
            style: type.body.copyWith(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}
