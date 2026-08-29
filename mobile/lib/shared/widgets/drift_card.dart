import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import 'drift_soft_card.dart';

/// Base card wrapper. As of the 2026-08 redesign this is a thin alias for
/// [DriftSoftCard] — white, 16px radius, one soft shadow, no border
/// (`DESIGN_SPEC.md` §1) — kept as its own name so the ~150 existing call
/// sites don't all have to change at once.
class DriftCard extends StatelessWidget {
  const DriftCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final radius = BorderRadius.circular(16);

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: radius,
        boxShadow: DriftSoftCard.shadow,
      ),
      child: Material(
        color: colors.surface,
        borderRadius: radius,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}
