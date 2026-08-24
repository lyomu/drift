import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';

/// Full-bleed solid-colour hero background, used for Welcome and other
/// onboarding-style moments (see `foundation/05-design-system.md` §12,
/// "Hero" component). Solid `color.primary` — no gradient.
///
/// [top] is pinned to the top of the safe area (wordmark, skip action),
/// [middle] fills the remaining space (headline, supporting copy),
/// [bottom] is pinned above the bottom safe area (primary/secondary CTA).
class DriftHeroScaffold extends StatelessWidget {
  const DriftHeroScaffold({
    super.key,
    this.top,
    required this.middle,
    this.bottom,
  });

  final Widget? top;
  final Widget middle;
  final Widget? bottom;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      backgroundColor: colors.primary,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (top != null) top!,
              Expanded(child: middle),
              if (bottom != null) bottom!,
            ],
          ),
        ),
      ),
    );
  }
}
