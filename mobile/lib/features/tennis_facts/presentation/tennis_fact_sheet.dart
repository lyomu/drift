import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/network/media_url.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../data/tennis_facts_repository.dart';

/// Opens [fact] as a short bottom sheet and records it as opened, so the
/// Home rail drops back to "Needs you".
Future<void> showTennisFactSheet(
  BuildContext context,
  WidgetRef ref,
  TennisFact fact,
) async {
  // Optimistic: the rail updates now; the server call is best-effort.
  ref.read(openedFactIdsProvider.notifier).update((ids) => {...ids, fact.id});
  if (!fact.opened) {
    ref
        .read(tennisFactsRepositoryProvider)
        .markOpened(fact.id)
        .catchError((Object _) {});
  }
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: false,
    backgroundColor: Colors.transparent,
    builder: (_) => TennisFactSheet(fact: fact),
  );
}

/// Loads a fact by id (from a notification tap) and opens it.
Future<void> openTennisFactById(
  BuildContext context,
  WidgetRef ref,
  String id,
) async {
  try {
    final fact = await ref.read(tennisFactsRepositoryProvider).getById(id);
    if (!context.mounted) return;
    await showTennisFactSheet(context, ref, fact);
  } catch (_) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(context.l10n.commonErrorGeneric)));
  }
}

class TennisFactSheet extends StatelessWidget {
  const TennisFactSheet({super.key, required this.fact});

  final TennisFact fact;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final l10n = context.l10n;

    return Container(
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 16:9 on a phone, capped so a tablet/landscape sheet doesn't hand
          // most of the screen to the photo.
          LayoutBuilder(
            builder: (context, constraints) => SizedBox(
              height: (constraints.maxWidth * 9 / 16).clamp(0, 220).toDouble(),
              child: TennisFactImage(imageUrl: fact.imageUrl, iconSize: 56),
            ),
          ),
          // Facts are capped at 280 characters so this normally fits; the
          // scroll is only a safety net for large text sizes on small phones.
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.tennisFactEyebrow.toUpperCase(),
                    style: type.caption.copyWith(
                      color: colors.primary,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.1,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    fact.title,
                    style: type.h3.copyWith(
                      fontWeight: FontWeight.w800,
                      color: colors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    fact.body,
                    style: type.body.copyWith(
                      color: colors.textPrimary,
                      height: 1.45,
                    ),
                  ),
                  if (fact.source != null && fact.source!.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      l10n.tennisFactSource(fact.source!),
                      style: type.caption.copyWith(color: colors.textSecondary),
                    ),
                  ],
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
            child: FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Text(l10n.tennisFactGotIt),
            ),
          ),
        ],
      ),
    );
  }
}

/// The fact's photo, or a branded tennis-ball gradient when it has none (or
/// it fails to load) — facts are seeded without photos until an admin adds
/// one, so the fallback has to look intentional.
/// Fallback artwork for a fact without a photo: a court seen from above with a
/// ball mid-flight and a racket, drawn in white over the card's gradient.
class _TennisCourtPainter extends CustomPainter {
  const _TennisCourtPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final line = Paint()
      ..color = Colors.white.withValues(alpha: 0.35)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6;

    // Court lines: outer boundary, net line and service boxes.
    final court = Rect.fromLTWH(w * 0.12, h * 0.08, w * 0.76, h * 0.84);
    canvas.drawRect(court, line);
    canvas.drawLine(
      Offset(court.left, court.center.dy),
      Offset(court.right, court.center.dy),
      line..strokeWidth = 2.4,
    );
    line.strokeWidth = 1.6;
    final serviceTop = court.top + court.height * 0.25;
    final serviceBottom = court.bottom - court.height * 0.25;
    canvas.drawLine(
      Offset(court.left, serviceTop),
      Offset(court.right, serviceTop),
      line,
    );
    canvas.drawLine(
      Offset(court.left, serviceBottom),
      Offset(court.right, serviceBottom),
      line,
    );
    canvas.drawLine(
      Offset(court.center.dx, serviceTop),
      Offset(court.center.dx, serviceBottom),
      line,
    );

    // Racket: tilted oval head, throat and handle.
    final white = Colors.white.withValues(alpha: 0.95);
    canvas.save();
    canvas.translate(w * 0.42, h * 0.56);
    canvas.rotate(-0.6);
    final headRadius = w * 0.2;
    final stroke = Paint()
      ..color = white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.2
      ..strokeCap = StrokeCap.round;
    final head = Rect.fromCenter(
      center: Offset.zero,
      width: headRadius * 1.6,
      height: headRadius * 2.1,
    );
    canvas.drawOval(head, stroke);
    final strings = Paint()
      ..color = Colors.white.withValues(alpha: 0.4)
      ..strokeWidth = 1;
    for (var i = -2; i <= 2; i++) {
      final dx = i * head.width / 6;
      final dy = head.height / 2 * 0.8 * (1 - (i.abs() / 3) * (i.abs() / 3));
      canvas.drawLine(Offset(dx, -dy), Offset(dx, dy), strings);
      final y = i * head.height / 6;
      final dxx = head.width / 2 * 0.85 * (1 - (i.abs() / 3) * (i.abs() / 3));
      canvas.drawLine(Offset(-dxx, y), Offset(dxx, y), strings);
    }
    canvas.drawLine(
      Offset(0, head.bottom),
      Offset(0, head.bottom + headRadius * 0.55),
      stroke,
    );
    canvas.drawLine(
      Offset(0, head.bottom + headRadius * 0.55),
      Offset(0, head.bottom + headRadius * 1.3),
      stroke..strokeWidth = 6,
    );
    canvas.restore();

    // Ball with a seam, up and to the right of the racket.
    final ball = Offset(w * 0.7, h * 0.26);
    final r = w * 0.09;
    canvas.drawCircle(ball, r, Paint()..color = const Color(0xFFE8F25C));
    final seam = Paint()
      ..color = Colors.white.withValues(alpha: 0.9)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    canvas.drawArc(
      Rect.fromCircle(center: ball.translate(-r * 1.1, 0), radius: r),
      -0.9,
      1.8,
      false,
      seam,
    );
    canvas.drawArc(
      Rect.fromCircle(center: ball.translate(r * 1.1, 0), radius: r),
      math.pi - 0.9,
      1.8,
      false,
      seam,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class TennisFactImage extends StatelessWidget {
  const TennisFactImage({
    super.key,
    required this.imageUrl,
    this.iconSize = 32,
  });

  final String? imageUrl;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final fallback = DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [colors.primary, const Color(0xFF22C55E)],
        ),
      ),
      child: const SizedBox.expand(child: CustomPaint(painter: _TennisCourtPainter())),
    );

    final url = driftMediaUrl(imageUrl);
    if (url == null) return fallback;
    return Image.network(
      url,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => fallback,
      loadingBuilder: (context, child, progress) =>
          progress == null ? child : fallback,
    );
  }
}
