import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_spacing.dart';
import '../../core/theme/drift_typography.dart';
import '../../features/matches/data/matches_repository.dart';
import '../../core/l10n/l10n.dart';

/// Match Score — `foundation/05-design-system.md` §7: "Set-by-set score
/// display, tabular numerals." One column per set, side A over side B, with
/// the tiebreak (if any) as a small superscript-style trailing number.
class DriftMatchScoreDisplay extends StatelessWidget {
  const DriftMatchScoreDisplay({
    super.key,
    required this.sets,
    this.sideALabel,
    this.sideBLabel,
  });

  final List<SetScore> sets;
  /// Default to the translated "You" / "Them".
  final String? sideALabel;
  final String? sideBLabel;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    Widget row(
      String label,
      int Function(SetScore) games,
      int? Function(SetScore) tiebreak,
    ) {
      return Row(
        children: [
          SizedBox(
            width: 64,
            child: Text(
              label,
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
          ),
          for (final set in sets)
            Padding(
              padding: const EdgeInsets.only(right: DriftSpacing.s4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${games(set)}',
                    style: type.statistics.copyWith(fontSize: 20),
                  ),
                  if (tiebreak(set) != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text('${tiebreak(set)}', style: type.caption),
                    ),
                ],
              ),
            ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        row(
          sideALabel ?? context.l10n.commonYou,
          (s) => s.sideAGames,
          (s) => s.sideATiebreak,
        ),
        const SizedBox(height: DriftSpacing.s1),
        row(
          sideBLabel ?? context.l10n.commonThem,
          (s) => s.sideBGames,
          (s) => s.sideBTiebreak,
        ),
      ],
    );
  }
}
