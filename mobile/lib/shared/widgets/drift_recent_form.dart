import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_spacing.dart';
import '../../core/theme/drift_typography.dart';

/// Match Form (Recent Form) — `foundation/05-design-system.md` §7:
/// "W/L/W/W/L strip, last N matches." Colour is never the only signal
/// (§9) — the letter itself carries the meaning.
class DriftRecentForm extends StatelessWidget {
  const DriftRecentForm({super.key, required this.results});

  /// Most recent first, each either 'W' or 'L'.
  final List<String> results;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    if (results.isEmpty) {
      return Text(
        'No matches played yet',
        style: type.bodySmall.copyWith(color: colors.textSecondary),
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final result in results)
          Padding(
            padding: const EdgeInsets.only(right: DriftSpacing.s1),
            child: Container(
              width: 26,
              height: 26,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: result == 'W'
                    ? colors.successSurface
                    : colors.errorSurface,
                shape: BoxShape.circle,
              ),
              child: Text(
                result,
                style: type.caption.copyWith(
                  fontWeight: FontWeight.w700,
                  color: result == 'W' ? colors.success : colors.error,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
