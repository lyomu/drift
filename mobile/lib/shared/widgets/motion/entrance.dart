import 'dart:math' as math;

import 'package:flutter/widgets.dart';

import 'motion_tokens.dart';

/// Fades and slides [child] up into place once, when it is first built.
///
/// [index] staggers siblings: item n starts `n × DriftMotion.stagger` after
/// item 0 (capped at [DriftMotion.maxStaggerIndex]). The animation runs once
/// per mount — rebuilds with new data do not replay it, so a pull-to-refresh
/// doesn't make the whole screen jump again.
class DriftEntrance extends StatefulWidget {
  const DriftEntrance({
    super.key,
    required this.child,
    this.index = 0,
    this.offset = 12,
  });

  final Widget child;
  final int index;

  /// Distance in logical pixels the child travels upward.
  final double offset;

  @override
  State<DriftEntrance> createState() => _DriftEntranceState();
}

class _DriftEntranceState extends State<DriftEntrance>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _t;

  @override
  void initState() {
    super.initState();
    final delay =
        DriftMotion.stagger *
        math.min(widget.index, DriftMotion.maxStaggerIndex);
    final total = delay + DriftMotion.slow;
    _controller = AnimationController(vsync: this, duration: total);
    // The delay lives inside the controller as a leading Interval, so there
    // is no timer to cancel and nothing fires after dispose.
    final start = delay.inMicroseconds / total.inMicroseconds;
    _t = CurvedAnimation(
      parent: _controller,
      curve: Interval(start, 1, curve: DriftMotion.enter),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_controller.isAnimating || _controller.isCompleted) return;
    if (DriftMotion.reduced(context) || !DriftEntranceScope.isOpen(context)) {
      _controller.value = 1;
    } else {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _t,
      child: widget.child,
      builder: (context, child) {
        final v = _t.value;
        if (v == 1) return child!;
        return Opacity(
          opacity: v,
          child: Transform.translate(
            offset: Offset(0, (1 - v) * widget.offset),
            child: child,
          ),
        );
      },
    );
  }
}

/// Limits [DriftEntrance] to a screen's first appearance. Lazily-built lists
/// mount children as they scroll into view (and again after scrolling back);
/// without a scope each of those would replay its entrance. Entrances that
/// mount after [window] has passed render in place instead.
class DriftEntranceScope extends StatefulWidget {
  const DriftEntranceScope({
    super.key,
    required this.child,
    this.window = const Duration(milliseconds: 700),
  });

  final Widget child;
  final Duration window;

  /// Whether an entrance mounting now should still animate. True outside
  /// any scope.
  static bool isOpen(BuildContext context) =>
      context.findAncestorStateOfType<_DriftEntranceScopeState>()?.isOpen ??
      true;

  @override
  State<DriftEntranceScope> createState() => _DriftEntranceScopeState();
}

class _DriftEntranceScopeState extends State<DriftEntranceScope> {
  final Stopwatch _clock = Stopwatch()..start();

  bool get isOpen => _clock.elapsed < widget.window;

  @override
  Widget build(BuildContext context) => widget.child;
}
