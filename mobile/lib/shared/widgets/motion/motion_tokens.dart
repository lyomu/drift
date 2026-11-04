import 'package:flutter/widgets.dart';

/// Shared motion timings so every animated surface in the app moves to the
/// same rhythm. Kept short on purpose: motion should make the app feel alive,
/// never make the user wait.
abstract final class DriftMotion {
  static const fast = Duration(milliseconds: 150);
  static const base = Duration(milliseconds: 250);
  static const slow = Duration(milliseconds: 350);

  /// Gap between consecutive items in a staggered entrance.
  static const stagger = Duration(milliseconds: 50);

  /// Items past this index enter together, so a long list never makes the
  /// last visible row wait noticeably.
  static const maxStaggerIndex = 6;

  static const enter = Curves.easeOutCubic;
  static const exit = Curves.easeInCubic;
  static const emphasized = Curves.easeOutBack;

  /// True when the OS "reduce motion" / "remove animations" setting is on.
  /// Every helper in this folder renders its final state immediately then.
  static bool reduced(BuildContext context) =>
      MediaQuery.maybeDisableAnimationsOf(context) ?? false;
}
