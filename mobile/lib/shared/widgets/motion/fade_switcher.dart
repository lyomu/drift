import 'package:flutter/widgets.dart';

import 'motion_tokens.dart';

/// Crossfades between children with a small upward drift. Give each child a
/// distinct key (e.g. `ValueKey(selectedTab)`) so the switch is detected.
///
/// Children are laid out with a top-aligned Stack so an outgoing scrollable
/// and an incoming one share the same box while they overlap.
class DriftFadeSwitcher extends StatelessWidget {
  const DriftFadeSwitcher({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: DriftMotion.reduced(context) ? Duration.zero : DriftMotion.base,
      switchInCurve: DriftMotion.enter,
      switchOutCurve: DriftMotion.exit,
      layoutBuilder: (current, previous) => Stack(
        alignment: Alignment.topCenter,
        fit: StackFit.expand,
        children: [...previous, ?current],
      ),
      transitionBuilder: (child, animation) => FadeTransition(
        opacity: animation,
        child: SlideTransition(
          position: Tween(
            begin: const Offset(0, 0.015),
            end: Offset.zero,
          ).animate(animation),
          child: child,
        ),
      ),
      child: child,
    );
  }
}
