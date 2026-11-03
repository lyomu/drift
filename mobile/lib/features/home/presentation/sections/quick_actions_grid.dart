import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/l10n/l10n.dart';
import '../../../../core/theme/drift_colors.dart';
import '../../../../shared/widgets/drift_section_header.dart';

/// 2×2 grid of the four things a player most often wants to start from Home.
///
/// Redesign 2026-10-29: each tile is a deep wash of its accent over the
/// surface (so it sits right in both light and dark mode), with an icon
/// badge, an "opens" arrow, a one-line hint under the label, and the same
/// icon blown up and faded into the bottom-right corner as a watermark.
class QuickActionsGrid extends StatelessWidget {
  const QuickActionsGrid({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final actions = <_QuickAction>[
      _QuickAction(
        label: l10n.quickFindMatch,
        hint: l10n.quickFindMatchHint,
        icon: Icons.group_rounded,
        accent: const Color(0xFF3B8BFF),
        onTap: () => context.go('/home?tab=play&play=find'),
      ),
      _QuickAction(
        label: l10n.quickBookCourt,
        hint: l10n.quickBookCourtHint,
        icon: Icons.sports_tennis_rounded,
        accent: const Color(0xFF22C55E),
        onTap: () => context.go('/home?tab=discover&discover=courts'),
      ),
      _QuickAction(
        label: l10n.quickLogPractice,
        hint: l10n.quickLogPracticeHint,
        icon: Icons.edit_note_rounded,
        accent: const Color(0xFFA78BFA),
        onTap: () => context.push('/learn/practice/add'),
      ),
      _QuickAction(
        label: l10n.quickEnterLadder,
        hint: l10n.quickEnterLadderHint,
        icon: Icons.emoji_events_rounded,
        accent: const Color(0xFFFB923C),
        onTap: () => context.go('/home?tab=compete'),
      ),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DriftSectionHeader(title: l10n.homeQuickActions),
          const SizedBox(height: 10),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            primary: false,
            padding: EdgeInsets.zero,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.2,
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
    required this.hint,
    required this.icon,
    required this.accent,
    required this.onTap,
  });

  final String label;
  final String hint;
  final IconData icon;
  final Color accent;
  final VoidCallback onTap;
}

class _QuickActionTile extends StatelessWidget {
  const _QuickActionTile({required this.action});

  final _QuickAction action;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accent = action.accent;

    // Dark: a deep, desaturated wash that reads as "coloured glass" on black.
    // Light: a soft pastel with the accent kept for the icon and arrow.
    final top = Color.alphaBlend(
      accent.withValues(alpha: isDark ? 0.34 : 0.16),
      colors.surface,
    );
    final bottom = Color.alphaBlend(
      accent.withValues(alpha: isDark ? 0.18 : 0.07),
      colors.surface,
    );
    final badge = isDark
        ? Colors.black.withValues(alpha: 0.28)
        : Colors.white.withValues(alpha: 0.85);

    return Material(
      borderRadius: BorderRadius.circular(22),
      clipBehavior: Clip.antiAlias,
      color: bottom,
      child: InkWell(
        onTap: action.onTap,
        splashColor: accent.withValues(alpha: 0.18),
        child: Ink(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [top, bottom],
            ),
            border: Border.all(color: accent.withValues(alpha: 0.22)),
            borderRadius: BorderRadius.circular(22),
          ),
          child: Stack(
            children: [
              // Watermark: the tile's own icon, oversized and cropped by the
              // rounded corner. Purely decorative.
              Positioned(
                right: -18,
                bottom: -22,
                child: ExcludeSemantics(
                  child: Icon(
                    action.icon,
                    size: 104,
                    color: accent.withValues(alpha: isDark ? 0.16 : 0.12),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            color: badge,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: accent.withValues(alpha: 0.35),
                            ),
                          ),
                          child: Icon(action.icon, size: 24, color: accent),
                        ),
                        const Spacer(),
                        Icon(
                          Icons.north_east_rounded,
                          size: 20,
                          color: accent,
                        ),
                      ],
                    ),
                    const Spacer(),
                    Text(
                      action.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        height: 1.2,
                        color: colors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      action.hint,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                        height: 1.25,
                        color: colors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
