import 'package:flutter/widgets.dart';

import 'motion_tokens.dart';

/// Animates a number from its previous value (0 on first build) to [value]
/// and hands the in-between value to [builder], so callers keep full control
/// of formatting (locale-aware `NumberFormat`, units, suffixes).
class DriftCountUp extends StatelessWidget {
  const DriftCountUp({
    super.key,
    required this.value,
    required this.builder,
    this.duration = const Duration(milliseconds: 700),
  });

  final num value;
  final Widget Function(BuildContext context, double value) builder;
  final Duration duration;

  @override
  Widget build(BuildContext context) {
    if (DriftMotion.reduced(context)) {
      return builder(context, value.toDouble());
    }
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: value.toDouble()),
      duration: duration,
      curve: DriftMotion.enter,
      builder: (context, v, _) => builder(context, v),
    );
  }
}

/// A 0..1 fraction that animates toward [value] — for progress bars/rings.
class DriftAnimatedFraction extends StatelessWidget {
  const DriftAnimatedFraction({
    super.key,
    required this.value,
    required this.builder,
    this.duration = const Duration(milliseconds: 800),
  });

  final double value;
  final Widget Function(BuildContext context, double value) builder;
  final Duration duration;

  @override
  Widget build(BuildContext context) {
    final target = value.clamp(0.0, 1.0);
    if (DriftMotion.reduced(context)) return builder(context, target);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: target),
      duration: duration,
      curve: DriftMotion.enter,
      builder: (context, v, _) => builder(context, v),
    );
  }
}
