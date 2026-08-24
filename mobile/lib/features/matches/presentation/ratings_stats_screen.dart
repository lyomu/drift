import 'package:flutter/material.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_card.dart';
import '../../../shared/widgets/drift_recent_form.dart';
import '../data/player_stats.dart';

/// Ratings & Stats Detail — `foundation/04-screen-inventory.md` §A.4.
/// Reachable from another player's profile and from Match History List's
/// "Your stats" header — Own Profile itself doesn't exist until M12, so
/// there's no first-party entry point yet.
class RatingsStatsScreen extends StatelessWidget {
  const RatingsStatsScreen({
    super.key,
    required this.title,
    required this.stats,
  });

  final String title;
  final PlayerStats stats;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(DriftSpacing.s5),
          children: [
            _FormatCard(label: 'Singles', stats: stats.singles),
            const SizedBox(height: DriftSpacing.s4),
            _FormatCard(label: 'Doubles', stats: stats.doubles),
            const SizedBox(height: DriftSpacing.s4),
            _RecentFormCard(recentForm: stats.recentForm),
          ],
        ),
      ),
    );
  }
}

class _FormatCard extends StatelessWidget {
  const _FormatCard({required this.label, required this.stats});

  final String label;
  final FormatStats stats;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final played = stats.wins + stats.losses;

    return DriftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: type.h4),
          const SizedBox(height: DriftSpacing.s3),
          if (stats.rating != null)
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(stats.rating!.toStringAsFixed(1), style: type.statistics),
                const SizedBox(width: DriftSpacing.s2),
                Text(
                  stats.ratingLabel ?? '',
                  style: type.body.copyWith(color: colors.textSecondary),
                ),
              ],
            )
          else
            Text(
              'No rated matches yet',
              style: type.body.copyWith(color: colors.textSecondary),
            ),
          const SizedBox(height: DriftSpacing.s2),
          Text(
            played == 0
                ? 'No matches played'
                : '${stats.wins}W – ${stats.losses}L ($played played)',
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _RecentFormCard extends StatelessWidget {
  const _RecentFormCard({required this.recentForm});

  final List<String> recentForm;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return DriftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Recent form', style: type.h4),
          const SizedBox(height: DriftSpacing.s3),
          DriftRecentForm(results: recentForm),
        ],
      ),
    );
  }
}
