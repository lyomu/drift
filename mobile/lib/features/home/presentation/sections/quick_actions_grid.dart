import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../shared/widgets/drift_section_header.dart';

/// Static 2×2 grid of the four things a player most often wants to start from
/// Home (redesign 2026-10: saturated gradient tiles rather than white cards).
/// Routes jump to the relevant tab / flow.
class QuickActionsGrid extends StatelessWidget {
  const QuickActionsGrid({super.key});

  @override
  Widget build(BuildContext context) {
    final actions = <_QuickAction>[
      _QuickAction(
        label: 'Find Match',
        icon: Icons.group_rounded,
        from: const Color(0xFF1A7AFF),
        to: const Color(0xFF0A4FC8),
        onTap: () => context.go('/home?tab=play&play=find'),
      ),
      _QuickAction(
        label: 'Book Court',
        icon: Icons.sports_tennis_rounded,
        from: const Color(0xFF22C55E),
        to: const Color(0xFF16A34A),
        onTap: () => context.go('/home?tab=discover&discover=courts'),
      ),
      _QuickAction(
        label: 'Log Practice',
        icon: Icons.edit_note_rounded,
        from: const Color(0xFF8B5CF6),
        to: const Color(0xFF7C3AED),
        onTap: () => context.push('/learn/practice/add'),
      ),
      _QuickAction(
        label: 'Enter Ladder',
        icon: Icons.emoji_events_rounded,
        from: const Color(0xFFF97316),
        to: const Color(0xFFEA580C),
        onTap: () => context.go('/home?tab=compete'),
      ),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const DriftSectionHeader(title: 'Quick actions'),
          const SizedBox(height: 10),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            primary: false,
            padding: EdgeInsets.zero,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.45,
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
    required this.from,
    required this.to,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final Color from;
  final Color to;
  final VoidCallback onTap;
}

class _QuickActionTile extends StatelessWidget {
  const _QuickActionTile({required this.action});

  final _QuickAction action;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: action.from.withValues(alpha: 0.31),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        borderRadius: BorderRadius.circular(18),
        clipBehavior: Clip.antiAlias,
        color: action.from,
        child: InkWell(
          onTap: action.onTap,
          child: Ink(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [action.from, action.to],
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 16, 14, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.22),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(action.icon, size: 26, color: Colors.white),
                  ),
                  Text(
                    action.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      height: 1.2,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
