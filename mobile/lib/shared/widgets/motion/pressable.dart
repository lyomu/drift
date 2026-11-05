import 'package:flutter/widgets.dart';

import 'motion_tokens.dart';

/// Gives [child] a physical press: it shrinks slightly while a finger is
/// down and springs back on release. Purely visual — it does not handle the
/// tap itself, so wrap a widget that already has an InkWell/onTap and its
/// semantics stay exactly as they were.
class DriftPressable extends StatefulWidget {
  const DriftPressable({super.key, required this.child, this.scale = 0.97});

  final Widget child;
  final double scale;

  @override
  State<DriftPressable> createState() => _DriftPressableState();
}

class _DriftPressableState extends State<DriftPressable> {
  bool _down = false;

  void _set(bool down) {
    if (_down != down) setState(() => _down = down);
  }

  @override
  Widget build(BuildContext context) {
    final reduced = DriftMotion.reduced(context);
    // A Listener sees the pointer without joining the gesture arena, so the
    // child's own InkWell / scroll gestures keep working untouched.
    return Listener(
      onPointerDown: (_) => _set(true),
      onPointerUp: (_) => _set(false),
      onPointerCancel: (_) => _set(false),
      child: AnimatedScale(
        scale: _down && !reduced ? widget.scale : 1,
        duration: _down ? DriftMotion.fast : DriftMotion.base,
        curve: _down ? DriftMotion.enter : DriftMotion.emphasized,
        child: widget.child,
      ),
    );
  }
}
