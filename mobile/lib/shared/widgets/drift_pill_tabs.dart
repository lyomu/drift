import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_typography.dart';

/// Scrollable row of pill tabs (`DESIGN_SPEC.md` §4 "Horizontal Tab Bar").
/// Active pill is filled blue with white text; the rest are white with a
/// 1.5px border. Bleeds to the screen edges — scroll padding is 16.
class DriftPillTabs extends StatelessWidget {
  const DriftPillTabs({
    super.key,
    required this.labels,
    required this.selected,
    required this.onChanged,
  });

  final List<String> labels;
  final int selected;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: labels.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final active = i == selected;
          return GestureDetector(
            onTap: () => onChanged(i),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              decoration: BoxDecoration(
                color: active ? colors.primary : colors.surface,
                borderRadius: BorderRadius.circular(999),
                border: active
                    ? null
                    : Border.all(color: colors.border, width: 1.5),
              ),
              alignment: Alignment.center,
              child: Text(
                labels[i],
                style: type.body.copyWith(
                  fontWeight: FontWeight.w600,
                  color: active ? Colors.white : colors.textSecondary,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
