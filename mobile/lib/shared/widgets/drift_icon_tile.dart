import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import 'drift_pill.dart';

/// Rounded-square tinted icon container — the redesign's recurring "list row"
/// / "menu row" leading affordance (`App.tsx`: the `PL`-filled 36–44px icon
/// boxes on the Profile menu, Learn, My Sports, Achievements, and the
/// Discover court/club rows).
class DriftIconTile extends StatelessWidget {
  const DriftIconTile({
    super.key,
    required this.icon,
    this.size = 38,
    this.radius = 10,
    this.tone = DriftPillTone.info,
  });

  final IconData icon;
  final double size;
  final double radius;
  final DriftPillTone tone;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    final (bg, fg) = switch (tone) {
      DriftPillTone.info => (colors.primaryLight, colors.primary),
      DriftPillTone.success => (colors.successSurface, colors.success),
      DriftPillTone.warning => (colors.warningSurface, colors.warning),
      DriftPillTone.error => (colors.errorSurface, colors.error),
      DriftPillTone.neutral => (
        colors.textSecondary.withValues(alpha: 0.12),
        colors.textSecondary,
      ),
    };

    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(radius),
      ),
      child: Icon(icon, size: size * 0.52, color: fg),
    );
  }
}
