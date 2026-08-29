import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_typography.dart';

/// Selectable filter chip (distance, level, format, ...). See
/// `foundation/05-design-system.md` §6.
class DriftFilterChip extends StatelessWidget {
  const DriftFilterChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        // 44dp minimum height, per the Material/WCAG touch-target guidance.
        // The chip's own padding only produced ~32dp, and this widget is
        // reused across news categories, player filters and court filters, so
        // the shortfall was systemic rather than cosmetic. Constraining the
        // box (rather than adding vertical padding) keeps the pill's visual
        // proportions while growing the tappable area.
        constraints: const BoxConstraints(minHeight: 44),
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? colors.primary : colors.surface,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: selected ? colors.primary : colors.border),
        ),
        child: Text(
          label,
          style: type.label.copyWith(
            color: selected ? Colors.white : colors.textPrimary,
          ),
        ),
      ),
    );
  }
}
