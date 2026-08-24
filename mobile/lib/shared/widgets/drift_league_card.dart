import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_spacing.dart';
import '../../core/theme/drift_typography.dart';
import '../../features/competitions/data/competitions_repository.dart';
import 'drift_card.dart';

/// League Card — `foundation/05-design-system.md` §7. Compact summary for
/// League List: name, format, season count.
class DriftLeagueCard extends StatelessWidget {
  const DriftLeagueCard({super.key, required this.league, this.onTap});

  final League league;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftCard(
      onTap: onTap,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(league.name, style: type.title),
                const SizedBox(height: DriftSpacing.s1),
                Text(
                  league.format == 'DOUBLES' ? 'Doubles' : 'Singles',
                  style: type.bodySmall.copyWith(color: colors.textSecondary),
                ),
                if (league.description != null) ...[
                  const SizedBox(height: DriftSpacing.s2),
                  Text(
                    league.description!,
                    style: type.body,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: colors.textSecondary),
        ],
      ),
    );
  }
}

/// Season Card — a single season row inside League Detail.
class DriftSeasonCard extends StatelessWidget {
  const DriftSeasonCard({super.key, required this.season, this.onTap});

  final LeagueSeasonRef season;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftCard(
      onTap: onTap,
      child: Row(
        children: [
          Expanded(child: Text(season.label, style: type.title)),
          Icon(Icons.chevron_right, color: colors.textSecondary),
        ],
      ),
    );
  }
}
