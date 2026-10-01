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
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              curve: Curves.easeOut,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              decoration: BoxDecoration(
                color: active ? colors.primary : colors.surface,
                borderRadius: BorderRadius.circular(999),
                border: active
                    ? null
                    : Border.all(
                        // The redesign's brand-tinted hairline (#E2EAFF
                        // against white) rather than the neutral border.
                        color: Color.alphaBlend(
                          colors.primary.withValues(alpha: 0.18),
                          colors.surface,
                        ),
                        width: 1.5,
                      ),
                // Lifts the selected tab off the ground, which is what makes
                // the row read as one control with a current item rather than
                // as four separate buttons.
                boxShadow: active
                    ? [
                        BoxShadow(
                          color: colors.primary.withValues(alpha: 0.19),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : null,
              ),
              alignment: Alignment.center,
              child: Text(
                labels[i],
                style: type.body.copyWith(
                  fontWeight: active ? FontWeight.w700 : FontWeight.w400,
                  color: active ? Colors.white : colors.textPrimary,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
