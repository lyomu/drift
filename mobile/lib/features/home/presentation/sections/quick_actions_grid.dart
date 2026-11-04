import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/l10n/l10n.dart';
import '../../../../core/theme/drift_colors.dart';
import '../../../../shared/widgets/drift_section_header.dart';

/// The four things a player most often wants to start from Home.
///
/// Redesign 2026-11-04: "Find a match" is a wide hero card with faint
/// tennis-court lines behind it; the other three sit below as compact tiles.
/// Every card is an accent-tinted wash with a round ↗ button by its text.
class QuickActionsGrid extends StatelessWidget {
  const QuickActionsGrid({super.key});

  List<_QuickAction> _actions(BuildContext context) {
    final l10n = context.l10n;
    return [
      _QuickAction(
        label: l10n.quickFindMatch,
        hint: l10n.quickFindMatchHint,
        icon: Icons.group_rounded,
        accent: const Color(0xFF3B8BFF),
        onTap: () => context.go('/home?tab=discover&discover=players'),
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
        onTap: () => context.go('/home?tab=play&segment=ladders'),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DriftSectionHeader(title: context.l10n.homeQuickActions),
          const SizedBox(height: 10),
          _HeroLayout(actions: _actions(context)),
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

// ─── Layouts ────────────────────────────────────────────────────────────────

class _HeroLayout extends StatelessWidget {
  const _HeroLayout({required this.actions});

  final List<_QuickAction> actions;

  @override
  Widget build(BuildContext context) {
    final hero = actions.first;
    final rest = actions.skip(1).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _TintedCard(
          action: hero,
          radius: 24,
          court: const _CourtPlacement(Alignment.centerRight, 0.62, 1.25),
          child: SizedBox(
            height: 112,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 14, 16),
              child: Row(
                children: [
                  _IconTile(action: hero, size: 52, iconSize: 26),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Label(text: hero.label, size: 18),
                        const SizedBox(height: 3),
                        _Hint(text: hero.hint),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  _ArrowButton(accent: hero.accent, size: 36),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            for (var i = 0; i < rest.length; i++) ...[
              if (i > 0) const SizedBox(width: 10),
              Expanded(
                child: AspectRatio(
                  aspectRatio: 0.8,
                  child: _TintedCard(
                    action: rest[i],
                    radius: 20,
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(rest[i].icon, size: 24, color: rest[i].accent),
                          const Spacer(),
                          _Label(text: rest[i].label, size: 14, maxLines: 2),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: _ArrowButton(
                              accent: rest[i].accent,
                              size: 26,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

// ─── Shared pieces ──────────────────────────────────────────────────────────

/// Accent-tinted, tappable card. Optionally draws faint court lines behind
/// the content.
class _TintedCard extends StatelessWidget {
  const _TintedCard({
    required this.action,
    required this.radius,
    required this.child,
    this.court,
  });

  final _QuickAction action;
  final double radius;
  final Widget child;
  final _CourtPlacement? court;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accent = action.accent;

    final top = Color.alphaBlend(
      accent.withValues(alpha: isDark ? 0.30 : 0.15),
      colors.surface,
    );
    final bottom = Color.alphaBlend(
      accent.withValues(alpha: isDark ? 0.14 : 0.06),
      colors.surface,
    );

    return Semantics(
      button: true,
      label: '${action.label}. ${action.hint}',
      excludeSemantics: true,
      child: Material(
        borderRadius: BorderRadius.circular(radius),
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
              border: Border.all(color: accent.withValues(alpha: 0.20)),
              borderRadius: BorderRadius.circular(radius),
            ),
            child: Stack(
              children: [
                if (court != null)
                  Positioned.fill(
                    child: ExcludeSemantics(
                      child: CustomPaint(
                        painter: _CourtLinesPainter(
                          placement: court!,
                          color: accent.withValues(alpha: isDark ? 0.22 : 0.20),
                        ),
                      ),
                    ),
                  ),
                child,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Rounded-square icon holder (deliberately not a circle badge).
class _IconTile extends StatelessWidget {
  const _IconTile({
    required this.action,
    required this.size,
    required this.iconSize,
  });

  final _QuickAction action;
  final double size;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: isDark
            ? Colors.black.withValues(alpha: 0.25)
            : Colors.white.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(size * 0.3),
      ),
      child: Icon(action.icon, size: iconSize, color: action.accent),
    );
  }
}

/// Small filled circle with the ↗ glyph — the card's "opens" affordance.
class _ArrowButton extends StatelessWidget {
  const _ArrowButton({required this.accent, required this.size});

  final Color accent;
  final double size;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: accent.withValues(alpha: isDark ? 0.22 : 0.16),
        shape: BoxShape.circle,
      ),
      child: Icon(Icons.north_east_rounded, size: size * 0.52, color: accent),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label({required this.text, required this.size, this.maxLines = 1});

  final String text;
  final double size;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Text(
      text,
      maxLines: maxLines,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontSize: size,
        fontWeight: FontWeight.w800,
        height: 1.2,
        color: colors.textPrimary,
      ),
    );
  }
}

class _Hint extends StatelessWidget {
  const _Hint({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Text(
      text,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        fontSize: 12.5,
        fontWeight: FontWeight.w500,
        height: 1.25,
        color: colors.textSecondary,
      ),
    );
  }
}

// ─── Court lines ────────────────────────────────────────────────────────────

/// Where a half-court diagram sits relative to its card. [widthFactor] and
/// [heightFactor] size the court against the card; values > 1 let it bleed
/// past the edges so only a corner shows.
class _CourtPlacement {
  const _CourtPlacement(this.alignment, this.widthFactor, this.heightFactor);

  final Alignment alignment;
  final double widthFactor;
  final double heightFactor;
}

/// Half a tennis court seen from above, lying on its side: net on one end,
/// baseline on the other, with doubles/singles sidelines, the service line
/// and the centre service line. Proportions follow the real court
/// (11.885 m half-length × 10.97 m doubles width).
class _CourtLinesPainter extends CustomPainter {
  const _CourtLinesPainter({required this.placement, required this.color});

  final _CourtPlacement placement;
  final Color color;

  static const _halfLength = 11.885;
  static const _width = 10.97;
  static const _alley = 1.37;
  static const _service = 6.40;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width * placement.widthFactor;
    final h = size.height * placement.heightFactor;
    final dx = (size.width - w) / 2 * (1 + placement.alignment.x);
    final dy = (size.height - h) / 2 * (1 + placement.alignment.y);
    // Push the court a little further past the aligned edge so it reads as
    // cropped rather than framed.
    final bleedX = placement.alignment.x * w * 0.18;
    final bleedY = placement.alignment.y * h * 0.22;
    final r = Rect.fromLTWH(dx + bleedX, dy + bleedY, w, h);

    final line = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;

    double x(double m) => r.left + r.width * (m / _halfLength);
    double y(double m) => r.top + r.height * (m / _width);

    // Doubles outline (net side included).
    canvas.drawRect(r, line);
    // Singles sidelines.
    canvas.drawLine(
      Offset(r.left, y(_alley)),
      Offset(r.right, y(_alley)),
      line,
    );
    canvas.drawLine(
      Offset(r.left, y(_width - _alley)),
      Offset(r.right, y(_width - _alley)),
      line,
    );
    // Service line, between the singles sidelines.
    canvas.drawLine(
      Offset(x(_service), y(_alley)),
      Offset(x(_service), y(_width - _alley)),
      line,
    );
    // Centre service line, net to service line.
    canvas.drawLine(
      Offset(r.left, r.center.dy),
      Offset(x(_service), r.center.dy),
      line,
    );
    // Net, drawn heavier.
    canvas.drawLine(
      Offset(r.left, r.top),
      Offset(r.left, r.bottom),
      line..strokeWidth = 3,
    );
  }

  @override
  bool shouldRepaint(_CourtLinesPainter old) =>
      old.color != color || old.placement != placement;
}
