import 'package:flutter/material.dart';

import '../../../core/theme/drift_colors.dart';
import 'motion_tokens.dart';

/// Sweeps a soft highlight across every [DriftSkeleton] beneath it. One
/// controller drives the whole subtree, so a screen full of placeholders
/// shimmers in sync.
class DriftShimmer extends StatefulWidget {
  const DriftShimmer({super.key, required this.child});

  final Widget child;

  @override
  State<DriftShimmer> createState() => _DriftShimmerState();
}

class _DriftShimmerState extends State<DriftShimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1400),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (DriftMotion.reduced(context)) {
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final base = isDark
        ? Colors.white.withValues(alpha: 0.06)
        : colors.border.withValues(alpha: 0.55);
    final highlight = isDark
        ? Colors.white.withValues(alpha: 0.12)
        : colors.surface.withValues(alpha: 0.9);

    if (DriftMotion.reduced(context)) {
      return ColorFiltered(
        colorFilter: ColorFilter.mode(base, BlendMode.srcIn),
        child: widget.child,
      );
    }

    return AnimatedBuilder(
      animation: _controller,
      child: widget.child,
      builder: (context, child) {
        final t = _controller.value;
        return ShaderMask(
          blendMode: BlendMode.srcIn,
          shaderCallback: (rect) => LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: [base, highlight, base],
            stops: const [0.35, 0.5, 0.65],
            transform: _SlideGradient(t),
          ).createShader(rect),
          child: child,
        );
      },
    );
  }
}

class _SlideGradient extends GradientTransform {
  const _SlideGradient(this.t);

  final double t;

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) =>
      Matrix4.translationValues(bounds.width * (t * 2 - 1), 0, 0);
}

/// A rounded placeholder block. Only its shape matters — the colour comes
/// from the enclosing [DriftShimmer].
class DriftSkeleton extends StatelessWidget {
  const DriftSkeleton({
    super.key,
    this.width,
    required this.height,
    this.radius = 12,
  });

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}
