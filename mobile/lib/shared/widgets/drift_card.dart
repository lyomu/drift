import 'package:flutter/material.dart';

import '../../core/theme/drift_spacing.dart';

/// Base card wrapper — consistent padding on top of the app-wide
/// [CardThemeData] (colour, border, radius) set in `app_theme.dart`.
/// See `foundation/05-design-system.md` §6.
class DriftCard extends StatelessWidget {
  const DriftCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(DriftSpacing.s4),
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final card = Card(
      child: Padding(padding: padding, child: child),
    );

    if (onTap == null) return card;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: card,
    );
  }
}
