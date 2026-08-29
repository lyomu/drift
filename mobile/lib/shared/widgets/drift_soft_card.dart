import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';

/// The redesign's standard card: white, 16px radius, one soft shadow, no
/// border (`DESIGN_SPEC.md` §1 "Card style"). The older [DriftCard] keeps
/// its 12px-radius bordered look for screens not yet redesigned.
class DriftSoftCard extends StatelessWidget {
  const DriftSoftCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.borderRadius = 16,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final double borderRadius;

  static const shadow = [
    BoxShadow(color: Color(0x12000000), blurRadius: 4, offset: Offset(0, 1)),
  ];

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final radius = BorderRadius.circular(borderRadius);

    return DecoratedBox(
      decoration: BoxDecoration(borderRadius: radius, boxShadow: shadow),
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
