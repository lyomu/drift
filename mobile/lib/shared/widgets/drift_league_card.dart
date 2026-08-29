import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_typography.dart';
import '../../features/competitions/data/competitions_repository.dart';
import 'drift_soft_card.dart';

/// League Card — the redesign's gradient league tile (`App.tsx`
/// CompeteLeaguesTab): brand gradient, name, format pill, description.
class DriftLeagueCard extends StatelessWidget {
  const DriftLeagueCard({super.key, required this.league, this.onTap});

  final League league;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: DriftSoftCard.shadow,
      ),
      child: Material(
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        color: colors.primary,
        child: InkWell(
          onTap: onTap,
          child: Ink(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [colors.primary, colors.primaryDark],
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          league.name,
                          style: type.h4.copyWith(color: Colors.white),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          league.format == 'DOUBLES' ? 'Doubles' : 'Singles',
                          style: type.caption.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (league.description != null &&
                      league.description!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      league.description!,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: type.bodySmall.copyWith(
                        color: Colors.white.withValues(alpha: 0.8),
                        height: 1.45,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
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

    return DriftSoftCard(
      onTap: onTap,
      child: Row(
        children: [
          Expanded(
            child: Text(
              season.label,
              style: type.body.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
          Icon(Icons.chevron_right, color: colors.textSecondary),
        ],
      ),
    );
  }
}
