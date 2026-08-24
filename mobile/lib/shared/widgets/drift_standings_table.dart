import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_spacing.dart';
import '../../core/theme/drift_typography.dart';
import '../../features/competitions/data/competitions_repository.dart';

/// Standings Table — `foundation/05-design-system.md` §7: "Ranked table
/// with W/L, points, movement arrows." Numbers are always tabular-figure
/// (§3) so the columns align.
class DriftStandingsTable extends StatelessWidget {
  const DriftStandingsTable({
    super.key,
    required this.rows,
    this.highlightUserId,
    this.onTapRow,
  });

  final List<StandingRow> rows;
  final String? highlightUserId;
  final void Function(String userId)? onTapRow;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Column(
      children: [
        for (final row in rows)
          InkWell(
            onTap: onTapRow == null ? null : () => onTapRow!(row.userId),
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: DriftSpacing.s3,
                vertical: DriftSpacing.s3,
              ),
              decoration: BoxDecoration(
                color: row.userId == highlightUserId
                    ? colors.primaryLight
                    : null,
                border: Border(
                  bottom: BorderSide(color: colors.border, width: 1),
                ),
              ),
              child: Row(
                children: [
                  SizedBox(
                    width: 28,
                    child: Text(
                      '${row.rank}',
                      style: type.body.copyWith(
                        fontFeatures: const [FontFeature.tabularFigures()],
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: DriftSpacing.s2),
                  _MovementIndicator(movement: row.movement),
                  const SizedBox(width: DriftSpacing.s2),
                  Expanded(
                    child: Text(
                      row.displayName,
                      style: type.body,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    '${row.wins}-${row.losses}',
                    style: type.bodySmall.copyWith(
                      color: colors.textSecondary,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                  const SizedBox(width: DriftSpacing.s3),
                  SizedBox(
                    width: 32,
                    child: Text(
                      '${row.points}',
                      textAlign: TextAlign.right,
                      style: type.body.copyWith(
                        fontWeight: FontWeight.w700,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _MovementIndicator extends StatelessWidget {
  const _MovementIndicator({required this.movement});

  final int movement;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    if (movement == 0) {
      return Icon(Icons.remove, size: 14, color: colors.textSecondary);
    }
    return Icon(
      movement > 0 ? Icons.arrow_upward : Icons.arrow_downward,
      size: 14,
      color: movement > 0 ? colors.success : colors.error,
    );
  }
}
