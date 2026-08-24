import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_typography.dart';

/// Court Surface Chip — `foundation/05-design-system.md` §7. A small,
/// non-interactive pill showing one surface breakdown, e.g. "6 Hard".
class DriftCourtSurfaceChip extends StatelessWidget {
  const DriftCourtSurfaceChip({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colors.border),
      ),
      child: Text(label, style: type.caption),
    );
  }
}
