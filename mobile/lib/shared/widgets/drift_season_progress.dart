import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_spacing.dart';
import '../../core/theme/drift_typography.dart';

/// Season Progress — `foundation/05-design-system.md` §7: "Round N of M
/// indicator." A simple segmented bar, one segment per round.
class DriftSeasonProgress extends StatelessWidget {
  const DriftSeasonProgress({
    super.key,
    required this.currentRound,
    required this.roundCount,
  });

  /// 1-indexed; 0 means the season hasn't started yet.
  final int currentRound;
  final int roundCount;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          currentRound == 0
              ? 'Not yet started'
              : 'Round $currentRound of $roundCount',
          style: type.label,
        ),
        const SizedBox(height: DriftSpacing.s2),
        Row(
          children: [
            for (var i = 1; i <= roundCount; i++)
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(
                    right: i == roundCount ? 0 : DriftSpacing.s1,
                  ),
                  child: Container(
                    height: 6,
                    decoration: BoxDecoration(
                      color: i <= currentRound ? colors.primary : colors.border,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}
