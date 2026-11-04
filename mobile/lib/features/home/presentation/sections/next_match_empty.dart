import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/l10n/l10n.dart';
import '../../../../core/network/media_url.dart';
import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/motion/motion_tokens.dart';
import '../../../users/application/current_user_provider.dart';

/// Empty state for Home → Next match. Shaped like the match card it is
/// waiting to become: the viewer on the left, "VS", and an open, softly
/// pulsing opponent slot on the right — so an empty week reads as an
/// invitation rather than an absence.
class NextMatchEmpty extends ConsumerWidget {
  const NextMatchEmpty({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final l10n = context.l10n;
    final user = ref.watch(currentUserProvider).valueOrNull;

    final top = Color.alphaBlend(
      colors.primary.withValues(alpha: isDark ? 0.22 : 0.10),
      colors.surface,
    );
    final bottom = Color.alphaBlend(
      colors.primary.withValues(alpha: isDark ? 0.08 : 0.03),
      colors.surface,
    );

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [top, bottom],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colors.primary.withValues(alpha: 0.18)),
      ),
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ExcludeSemantics(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _ViewerAvatar(
                  initials: _initials(user?.firstName, user?.lastName),
                  photoUrl: driftMediaUrl(user?.photoUrl),
                ),
                const SizedBox(width: 14),
                _VsChip(label: l10n.homeVs),
                const SizedBox(width: 14),
                const _OpenSlot(),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            l10n.homeNextMatchEmptyTitle,
            textAlign: TextAlign.center,
            style: type.title.copyWith(
              fontWeight: FontWeight.w800,
              color: colors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            l10n.homeNextMatchEmptyBody,
            textAlign: TextAlign.center,
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed: () =>
                      context.go('/home?tab=discover&discover=players'),
                  icon: const Icon(Icons.sports_tennis_rounded, size: 18),
                  label: Text(l10n.homeFindAMatch),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(44),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: TextButton(
                  onPressed: () => context.push('/connections'),
                  style: TextButton.styleFrom(minimumSize: const Size(44, 44)),
                  child: Text(
                    l10n.homeChallengeAFriend,
                    maxLines: 2,
                    textAlign: TextAlign.center,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static String _initials(String? first, String? last) => [first, last]
      .whereType<String>()
      .where((p) => p.isNotEmpty)
      .map((p) => p[0].toUpperCase())
      .take(2)
      .join();
}

const _avatarRadius = 28.0;

class _ViewerAvatar extends StatelessWidget {
  const _ViewerAvatar({required this.initials, required this.photoUrl});

  final String initials;
  final String? photoUrl;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: colors.primary, width: 2),
      ),
      child: CircleAvatar(
        radius: _avatarRadius,
        backgroundColor: colors.primaryLight,
        foregroundImage: photoUrl == null ? null : NetworkImage(photoUrl!),
        onForegroundImageError: photoUrl == null ? null : (_, _) {},
        child: initials.isEmpty
            ? Icon(Icons.person, color: colors.primaryDark)
            : Text(
                initials,
                style: type.title.copyWith(
                  color: colors.primaryDark,
                  fontWeight: FontWeight.w700,
                ),
              ),
      ),
    );
  }
}

class _VsChip extends StatelessWidget {
  const _VsChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: colors.primary,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: type.caption.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w800,
          letterSpacing: 1,
        ),
      ),
    );
  }
}

/// The empty opponent seat: a dashed ring with a "?" that breathes gently —
/// three breaths on arrival, then still, so it draws the eye without
/// animating forever.
class _OpenSlot extends StatefulWidget {
  const _OpenSlot();

  @override
  State<_OpenSlot> createState() => _OpenSlotState();
}

class _OpenSlotState extends State<_OpenSlot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: _breathMs * _breaths),
  );

  static const _breathMs = 1600;
  static const _breaths = 3;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (DriftMotion.reduced(context)) {
      _pulse.stop();
      _pulse.value = 1;
    } else if (!_pulse.isAnimating && !_pulse.isCompleted) {
      _pulse.forward();
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    const size = (_avatarRadius + 5) * 2;
    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, child) {
        // 0 → 1 → 0 once per breath; ends (and rests) at 0.
        final t = (1 - math.cos(2 * math.pi * _breaths * _pulse.value)) / 2;
        return Transform.scale(
          scale: 1 + 0.06 * t,
          child: Opacity(opacity: 0.75 + 0.25 * t, child: child),
        );
      },
      child: CustomPaint(
        painter: _DashedRingPainter(color: colors.primary),
        child: SizedBox(
          width: size,
          height: size,
          child: Center(
            child: Text(
              '?',
              style: type.h3.copyWith(
                color: colors.primary,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DashedRingPainter extends CustomPainter {
  const _DashedRingPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.shortestSide / 2 - 1.5;
    final fill = Paint()..color = color.withValues(alpha: 0.08);
    canvas.drawCircle(center, radius, fill);

    final stroke = Paint()
      ..color = color.withValues(alpha: 0.7)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    const dashes = 16;
    const sweep = 2 * math.pi / dashes;
    final rect = Rect.fromCircle(center: center, radius: radius);
    for (var i = 0; i < dashes; i++) {
      canvas.drawArc(rect, i * sweep, sweep * 0.55, false, stroke);
    }
  }

  @override
  bool shouldRepaint(_DashedRingPainter old) => old.color != color;
}
