import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/l10n/l10n.dart';
import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/motion/count_up.dart';
import '../../data/home_repository.dart';

/// The identity card at the top of Home — Level / Singles / Doubles, with how
/// far through the current level band the player is. A deep blue-to-teal
/// gradient with faint court markings and a glowing tennis ball.
///
/// Renders "—" for anything the player has not been rated on rather than a
/// fabricated default.
///
/// THE PROGRESS DOES NOT MOVE OFTEN, BY DESIGN. `level` changes only when an
/// assessment completes or the player edits their self-selected level, so
/// nothing accrues toward the next band in between (see `home-progress.ts`).
/// It answers "where do I stand", not "how am I trending". It is hidden
/// entirely for an un-levelled player and in the top band, where there is no
/// next level — the server sends null for both.
class HomeStatCard extends StatelessWidget {
  const HomeStatCard({super.key, required this.summary});

  final HomeSummary? summary;

  @override
  Widget build(BuildContext context) => _BoldCard(summary: summary);
}

// ── Shared helpers ──────────────────────────────────────────────────────────

String _rating(double? v) => v == null ? '—' : v.toStringAsFixed(1);

const _dim = Color(0xB3FFFFFF); // white @ 70%

/// The brand blue nudged around the colour wheel, so the richer gradients
/// stay in Drift's palette instead of introducing off-brand colours.
Color _shift(Color c, {double hue = 0, double light = 0, double sat = 0}) {
  final hsl = HSLColor.fromColor(c);
  return hsl
      .withHue((hsl.hue + hue) % 360)
      .withLightness((hsl.lightness + light).clamp(0.0, 1.0))
      .withSaturation((hsl.saturation + sat).clamp(0.0, 1.0))
      .toColor();
}

/// Faint tennis-court markings (baselines, sidelines, service boxes, net).
class _CourtLinesPainter extends CustomPainter {
  const _CourtLinesPainter({required this.opacity});

  final double opacity;

  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()
      ..color = Colors.white.withValues(alpha: opacity)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    final r = Rect.fromLTWH(
      size.width * 0.06,
      size.height * 0.12,
      size.width * 0.88,
      size.height * 0.76,
    );
    canvas.drawRect(r, p);
    // Doubles sideline inset.
    final alley = r.width * 0.09;
    canvas.drawLine(
      Offset(r.left + alley, r.top),
      Offset(r.left + alley, r.bottom),
      p,
    );
    canvas.drawLine(
      Offset(r.right - alley, r.top),
      Offset(r.right - alley, r.bottom),
      p,
    );
    // Net and service lines.
    canvas.drawLine(
      Offset(r.center.dx, r.top),
      Offset(r.center.dx, r.bottom),
      p,
    );
    final box = r.width * 0.27;
    canvas.drawLine(
      Offset(r.center.dx - box, r.top + alley),
      Offset(r.center.dx - box, r.bottom - alley),
      p,
    );
    canvas.drawLine(
      Offset(r.center.dx + box, r.top + alley),
      Offset(r.center.dx + box, r.bottom - alley),
      p,
    );
    canvas.drawLine(
      Offset(r.center.dx - box, r.center.dy),
      Offset(r.center.dx + box, r.center.dy),
      p,
    );
  }

  @override
  bool shouldRepaint(_CourtLinesPainter old) => old.opacity != opacity;
}

/// A tennis ball: filled disc with the two curved seams. Drawn with plain
/// arcs (no path clip, no opacity layer) so it paints reliably on every GPU.
class _BallPainter extends CustomPainter {
  const _BallPainter({required this.fill, required this.seam});

  final Color fill;
  final Color seam;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final r = size.shortestSide / 2;
    canvas.drawCircle(c, r, Paint()..color = fill);
    final p = Paint()
      ..color = seam
      ..style = PaintingStyle.stroke
      ..strokeWidth = r * 0.07;
    // Each seam is a circle of radius 1.05r centred 1.25r to the side; the
    // part inside the ball is the arc facing the ball's centre.
    const reach = 1.25;
    const radius = 1.05;
    final half = math.acos(
      ((reach * reach + radius * radius - 1) / (2 * reach * radius)).clamp(
        -1.0,
        1.0,
      ),
    );
    canvas.drawArc(
      Rect.fromCircle(
        center: Offset(c.dx - r * reach, c.dy),
        radius: r * radius,
      ),
      -half,
      2 * half,
      false,
      p,
    );
    canvas.drawArc(
      Rect.fromCircle(
        center: Offset(c.dx + r * reach, c.dy),
        radius: r * radius,
      ),
      math.pi - half,
      2 * half,
      false,
      p,
    );
  }

  @override
  bool shouldRepaint(_BallPainter old) => old.fill != fill || old.seam != seam;
}

// ── Card ───────────────────────────────────────────

class _BoldCard extends StatelessWidget {
  const _BoldCard({required this.summary});

  final HomeSummary? summary;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final l = context.l10n;
    final progress = summary?.levelProgress;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            _shift(colors.primaryDark, hue: -8, light: -0.06),
            colors.primary,
            _shift(colors.primary, hue: 38, light: 0.02, sat: 0.1),
          ],
          stops: const [0, 0.5, 1],
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: const _CourtLinesPainter(opacity: 0.13),
            ),
          ),
          // The ball: a lit-up tennis ball resting in the corner.
          Positioned(
            top: 12,
            right: 14,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFD7F34B).withValues(alpha: 0.65),
                    blurRadius: 22,
                    spreadRadius: 1,
                  ),
                ],
              ),
              child: const SizedBox(
                width: 22,
                height: 22,
                child: CustomPaint(
                  painter: _BallPainter(
                    fill: Color(0xFFD7F34B),
                    seam: Color(0xCCFFFFFF),
                  ),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 26, 14, 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        child: _BoldStat(
                          icon: Icons.stairs_rounded,
                          label: l.homeStatLevel,
                          value: _rating(summary?.level),
                          caption: summary?.levelLabel ?? l.commonUnrated,
                        ),
                      ),
                      const _VDivider(),
                      Expanded(
                        child: _BoldStat(
                          icon: Icons.sports_tennis_rounded,
                          label: l.homeStatSingles,
                          value: _rating(summary?.singlesRating),
                          caption: summary?.singlesRating == null
                              ? l.commonUnrated
                              : l.homeRating,
                        ),
                      ),
                      const _VDivider(),
                      Expanded(
                        child: _BoldStat(
                          icon: Icons.people_alt_rounded,
                          label: l.homeStatDoubles,
                          value: _rating(summary?.doublesRating),
                          caption: summary?.doublesRating == null
                              ? l.commonUnrated
                              : l.homeRating,
                        ),
                      ),
                    ],
                  ),
                ),
                if (progress != null) ...[
                  const SizedBox(height: 18),
                  _ProgressBar(progress: progress, accent: true),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BoldStat extends StatelessWidget {
  const _BoldStat({
    required this.icon,
    required this.label,
    required this.value,
    required this.caption,
  });

  final IconData icon;
  final String label;
  final String value;
  final String caption;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: const Color(0xFFD7F34B)),
        const SizedBox(height: 6),
        Text(
          label,
          style: type.caption.copyWith(
            color: _dim,
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: type.statistics.copyWith(
            color: Colors.white,
            fontSize: 38,
            height: 1.05,
            fontWeight: value == '—' ? FontWeight.w500 : FontWeight.w800,
            shadows: [
              Shadow(
                color: Colors.black.withValues(alpha: 0.2),
                blurRadius: 10,
                offset: const Offset(0, 2),
              ),
            ],
          ),
        ),
        const SizedBox(height: 3),
        Text(
          caption,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: type.caption.copyWith(color: _dim, fontSize: 11),
        ),
      ],
    );
  }
}

class _VDivider extends StatelessWidget {
  const _VDivider();

  @override
  Widget build(BuildContext context) => Container(
    width: 1,
    margin: const EdgeInsets.symmetric(vertical: 6),
    color: Colors.white.withValues(alpha: 0.2),
  );
}

// ── Progress bar ─────────────────────────────────────────────────────

class _ProgressBar extends StatelessWidget {
  const _ProgressBar({required this.progress, this.accent = false});

  final LevelProgress progress;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                context.l10n.homeProgressTo(
                  progress.nextLevel.toStringAsFixed(1),
                ),
                style: const TextStyle(fontSize: 11, color: _dim),
              ),
              DriftCountUp(
                value: progress.percent,
                builder: (context, v) => Text(
                  '${v.round()}%',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: Container(
              height: 7,
              color: Colors.white.withValues(alpha: 0.22),
              child: DriftAnimatedFraction(
                value: progress.percent / 100,
                builder: (context, f) => FractionallySizedBox(
                  alignment: Alignment.centerLeft,
                  widthFactor: f,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: accent
                            ? const [Color(0xFFFFFFFF), Color(0xFFD7F34B)]
                            : const [Colors.white, Colors.white],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
