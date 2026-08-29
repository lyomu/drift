import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_typography.dart';

/// Left-aligned bold section title with an optional right-aligned text link,
/// used above every Home / hub section (`DESIGN_SPEC.md` §4 "Section Header").
class DriftSectionHeader extends StatelessWidget {
  const DriftSectionHeader({
    super.key,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Flexible(
          child: Text(
            title,
            style: type.title.copyWith(fontWeight: FontWeight.w700),
          ),
        ),
        if (actionLabel != null)
          GestureDetector(
            onTap: onAction,
            child: Text(
              actionLabel!,
              style: type.label.copyWith(color: colors.primary),
            ),
          ),
      ],
    );
  }
}
