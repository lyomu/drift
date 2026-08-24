import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_spacing.dart';
import '../../core/theme/drift_typography.dart';

/// An icon-prefixed detail line — time, place, phone, etc. Promoted out of
/// `DriftMatchCard`'s private `_Detail` widget in Phase M9, since Court
/// Profile's address/hours/phone rows need the identical shape.
class DriftDetailRow extends StatelessWidget {
  const DriftDetailRow({super.key, required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Padding(
      padding: const EdgeInsets.only(top: DriftSpacing.s1),
      child: Row(
        children: [
          Icon(icon, size: 15, color: colors.textSecondary),
          const SizedBox(width: DriftSpacing.s2),
          Expanded(
            child: Text(
              text,
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}
