import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';

/// Compete list furniture (redesign 2026-10). Leagues, ladders, tournaments
/// and events all render the same white card: a tinted leading tile, a title,
/// a badge/meta line, zero or more icon-and-text detail rows, and an action
/// in the top-right corner. One card keeps the four tabs from drifting apart.

/// Per-row accents, cycled by list position. These lists are short, stable and
/// ordered by the server, so position is a reasonable key here — unlike the
/// player lists, which re-rank and therefore hash off the id instead.
const driftCompetitionAccents = <Color>[
  Color(0xFF1A7AFF),
  Color(0xFF22C55E),
  Color(0xFF8B5CF6),
  Color(0xFFF97316),
  Color(0xFFEC4899),
];

Color driftCompetitionAccent(int index) =>
    driftCompetitionAccents[index % driftCompetitionAccents.length];

Color _hairline(DriftColors colors, {double alpha = 0.1}) =>
    Color.alphaBlend(colors.primary.withValues(alpha: alpha), colors.surface);

/// One detail row under the title: a 12px glyph and a line of text.
class DriftCompetitionDetail {
  const DriftCompetitionDetail({required this.icon, required this.label});

  final IconData icon;
  final String label;
}

class DriftCompetitionCard extends StatelessWidget {
  const DriftCompetitionCard({
    super.key,
    required this.leading,
    required this.title,
    this.badge,
    this.badgeAccent,
    this.meta,
    this.details = const [],
    this.action,
    this.onTap,
  });

  /// [DriftCompetitionIconTile] on most tabs, [DriftCompetitionDateTile] on
  /// Events.
  final Widget leading;
  final String title;

  /// Tinted pill immediately under the title (the format, or a level band).
  final String? badge;
  final Color? badgeAccent;

  /// Plain text after the badge, separated by a middot.
  final String? meta;

  final List<DriftCompetitionDetail> details;
  final Widget? action;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final accent = badgeAccent ?? colors.primary;

    return Material(
      color: colors.surface,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _hairline(colors), width: 1.5),
          ),
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              leading,
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        height: 1.3,
                        color: colors.textPrimary,
                      ),
                    ),
                    if (badge != null || meta != null) ...[
                      const SizedBox(height: 4),
                      Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 4,
                        runSpacing: 2,
                        children: [
                          if (badge != null)
                            Container(
                              decoration: BoxDecoration(
                                color: accent.withValues(alpha: 0.09),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 7,
                                vertical: 2,
                              ),
                              child: Text(
                                badge!,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  height: 1.4,
                                  color: accent,
                                ),
                              ),
                            ),
                          if (meta != null) ...[
                            if (badge != null)
                              Text(
                                '·',
                                style: TextStyle(
                                  fontSize: 11,
                                  height: 1.4,
                                  color: colors.textSecondary,
                                ),
                              ),
                            Text(
                              meta!,
                              style: TextStyle(
                                fontSize: 11,
                                height: 1.4,
                                color: colors.textSecondary,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                    for (final detail in details) ...[
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Icon(
                            detail.icon,
                            size: 12,
                            color: colors.textSecondary,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              detail.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11,
                                height: 1.3,
                                color: colors.textSecondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              if (action != null) ...[
                const SizedBox(width: 8),
                action!,
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Tinted rounded square with a glyph — the leading tile on every tab but
/// Events.
class DriftCompetitionIconTile extends StatelessWidget {
  const DriftCompetitionIconTile({
    super.key,
    required this.icon,
    required this.accent,
  });

  final IconData icon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: accent.withValues(alpha: 0.16), width: 1.5),
      ),
      child: Icon(icon, size: 22, color: accent),
    );
  }
}

/// Day-over-month block, used where a date is the thing being scanned for.
class DriftCompetitionDateTile extends StatelessWidget {
  const DriftCompetitionDateTile({
    super.key,
    required this.day,
    required this.month,
    required this.accent,
  });

  final String day;
  final String month;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 44,
      decoration: BoxDecoration(
        color: accent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: accent.withValues(alpha: 0.16), width: 1.5),
      ),
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            day,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              height: 1,
              color: accent,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            month,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              height: 1,
              color: accent.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }
}

/// How a card's trailing button reads.
enum DriftCompetitionActionStyle {
  /// Filled accent pill with a glow: the thing to do (Join, Enter, RSVP).
  filled,

  /// Outlined tinted pill: already done (Joined, Entered, Going).
  selected,

  /// Flat grey, no tap: the action is closed (Full).
  disabled,
}

class DriftCompetitionActionButton extends StatelessWidget {
  const DriftCompetitionActionButton({
    super.key,
    required this.label,
    required this.style,
    this.accent,
    this.onTap,
  });

  final String label;
  final DriftCompetitionActionStyle style;

  /// Defaults to the theme's primary. Tournaments tint the button to match
  /// the card's own accent, the way the mock does.
  final Color? accent;

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final tone = accent ?? colors.primary;
    final disabled = style == DriftCompetitionActionStyle.disabled;

    final (background, foreground, border) = switch (style) {
      DriftCompetitionActionStyle.filled => (tone, Colors.white, null),
      DriftCompetitionActionStyle.selected => (
        Color.alphaBlend(tone.withValues(alpha: 0.08), colors.surface),
        tone,
        tone,
      ),
      DriftCompetitionActionStyle.disabled => (
        Color.alphaBlend(
          colors.primary.withValues(alpha: 0.12),
          colors.surface,
        ),
        colors.textSecondary,
        null,
      ),
    };

    final button = Material(
      color: background,
      borderRadius: BorderRadius.circular(999),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: disabled ? null : onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: border == null
                ? null
                : Border.all(color: border, width: 1.5),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              height: 1.2,
              color: foreground,
            ),
          ),
        ),
      ),
    );

    if (style != DriftCompetitionActionStyle.filled) return button;

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        boxShadow: [
          BoxShadow(
            color: tone.withValues(alpha: 0.19),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: button,
    );
  }
}
