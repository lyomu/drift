import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';

/// Drift-owned, code-rendered artwork used whenever publisher imagery is not
/// licensed, missing, or unavailable. The API is the authority for image use.
class DriftNewsImage extends StatelessWidget {
  const DriftNewsImage({super.key, required this.url, this.height});

  final String? url;
  final double? height;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final fallback = Semantics(
      image: true,
      label: 'Tennis news artwork',
      child: Container(
        height: height,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              colors.primaryDark,
              colors.primary,
              const Color(0xFF67C6EE),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            stops: const [0, 0.62, 1],
          ),
        ),
        child: CustomPaint(
          painter: _NewsCourtPainter(
            lineColor: Theme.of(
              context,
            ).colorScheme.onPrimary.withValues(alpha: 0.32),
          ),
          child: Center(
            child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.black.withValues(alpha: 0.12),
                border: Border.all(color: Colors.white.withValues(alpha: 0.34)),
              ),
              child: Icon(
                Icons.sports_tennis,
                color: Theme.of(context).colorScheme.onPrimary,
                size: 42,
              ),
            ),
          ),
        ),
      ),
    );
    final uri = Uri.tryParse(url ?? '');
    if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) {
      return fallback;
    }
    return Image.network(
      url!,
      height: height,
      width: double.infinity,
      fit: BoxFit.cover,
      semanticLabel: 'Article image',
      frameBuilder: (context, child, frame, wasSynchronouslyLoaded) =>
          wasSynchronouslyLoaded || frame != null ? child : fallback,
      errorBuilder: (context, error, stackTrace) => fallback,
    );
  }
}

class _NewsCourtPainter extends CustomPainter {
  const _NewsCourtPainter({required this.lineColor});

  final Color lineColor;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = lineColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    final court = Rect.fromLTWH(
      size.width * 0.08,
      size.height * 0.12,
      size.width * 0.84,
      size.height * 0.76,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(court, const Radius.circular(12)),
      paint,
    );
    canvas.drawLine(
      Offset(size.width * 0.5, court.top),
      Offset(size.width * 0.5, court.bottom),
      paint,
    );
    canvas.drawLine(
      Offset(court.left, size.height * 0.5),
      Offset(court.right, size.height * 0.5),
      paint,
    );
    canvas.drawLine(
      Offset(size.width * 0.26, court.top),
      Offset(size.width * 0.26, court.bottom),
      paint,
    );
    canvas.drawLine(
      Offset(size.width * 0.74, court.top),
      Offset(size.width * 0.74, court.bottom),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _NewsCourtPainter oldDelegate) =>
      oldDelegate.lineColor != lineColor;
}
