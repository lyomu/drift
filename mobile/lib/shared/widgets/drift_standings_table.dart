import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_typography.dart';
import '../../features/competitions/data/competitions_repository.dart';
import 'drift_soft_card.dart';

/// Standings Table — `DESIGN_SPEC.md` §4. White card, ranked rows with
/// MP / W / L / Pts columns; the viewer's row is tinted, top-3 ranks are
/// coloured. ("Last 5" from the mock is omitted — the API doesn't return
/// per-row recent form.)
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

  static const _wRank = 22.0;
  static const _wStat = 26.0;
  static const _wPts = 34.0;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    Widget headCell(String label, double width, Color color) => SizedBox(
      width: width,
      child: Text(
        label,
        textAlign: TextAlign.center,
        style: type.caption.copyWith(fontWeight: FontWeight.w700, color: color),
      ),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DriftSoftCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 9,
                ),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: colors.border)),
                ),
                child: Row(
                  children: [
                    const SizedBox(width: _wRank),
                    const Expanded(child: SizedBox()),
                    headCell('MP', _wStat, colors.primary),
                    headCell('W', _wStat, colors.primary),
                    headCell('L', _wStat, colors.primary),
                    headCell('Pts', _wPts, colors.textPrimary),
                  ],
                ),
              ),
              for (var i = 0; i < rows.length; i++)
                _Row(
                  row: rows[i],
                  isLast: i == rows.length - 1,
                  highlighted: rows[i].userId == highlightUserId,
                  onTap: onTapRow == null
                      ? null
                      : () => onTapRow!(rows[i].userId),
                ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'W = win · L = loss · Pts = points (3 per win)',
          textAlign: TextAlign.center,
          style: type.caption.copyWith(color: colors.textSecondary),
        ),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.row,
    required this.isLast,
    required this.highlighted,
    required this.onTap,
  });

  final StandingRow row;
  final bool isLast;
  final bool highlighted;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    final rankColor = row.rank == 1
        ? colors.warning
        : row.rank <= 3
        ? colors.primary
        : colors.textSecondary;

    final initials = row.displayName
        .split(' ')
        .where((p) => p.isNotEmpty)
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();

    Widget stat(int v, Color color, {bool bold = false}) => SizedBox(
      width: DriftStandingsTable._wStat,
      child: Text(
        '$v',
        textAlign: TextAlign.center,
        style: type.body.copyWith(
          color: color,
          fontWeight: bold ? FontWeight.w600 : null,
          fontFeatures: const [FontFeature.tabularFigures()],
        ),
      ),
    );

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: highlighted ? colors.primaryLight : null,
          border: isLast
              ? null
              : Border(bottom: BorderSide(color: colors.border)),
        ),
        child: Row(
          children: [
            SizedBox(
              width: DriftStandingsTable._wRank,
              child: Text(
                '${row.rank}',
                textAlign: TextAlign.center,
                style: type.bodySmall.copyWith(
                  fontWeight: FontWeight.w700,
                  color: rankColor,
                ),
              ),
            ),
            const SizedBox(width: 8),
            _Avatar(initials: initials),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                highlighted ? '${row.displayName} (You)' : row.displayName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: type.bodySmall.copyWith(
                  fontWeight: highlighted ? FontWeight.w700 : FontWeight.w600,
                ),
              ),
            ),
            stat(row.wins + row.losses, colors.textSecondary),
            stat(row.wins, colors.success, bold: true),
            stat(row.losses, colors.error, bold: true),
            SizedBox(
              width: DriftStandingsTable._wPts,
              child: Text(
                '${row.points}',
                textAlign: TextAlign.center,
                style: type.title.copyWith(
                  fontWeight: FontWeight.w800,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.initials});

  final String initials;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Container(
      width: 28,
      height: 28,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: colors.primaryLight,
      ),
      child: Text(
        initials.isEmpty ? '?' : initials,
        style: type.caption.copyWith(
          color: colors.primaryDark,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
