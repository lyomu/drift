import 'package:flutter/material.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_recent_form.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../data/player_stats.dart';

/// Ratings & Stats Detail — `foundation/04-screen-inventory.md` §A.4
/// (redesign 2026-08: `App.tsx` `ProfileStatsView`). Reachable from another
/// player's profile and from Own Profile's "View Stats".
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
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DriftBackHeader(title: title),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                children: [
                  _FormatCard(label: 'Singles', stats: stats.singles),
                  const SizedBox(height: 12),
                  _FormatCard(label: 'Doubles', stats: stats.doubles),
                  const SizedBox(height: 12),
                  DriftSoftCard(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _CardTitle('Recent form'),
                        const SizedBox(height: 12),
                        DriftRecentForm(results: stats.recentForm),
                      ],
                    ),
                  ),
                ],
              ),
            ),
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

    return DriftSoftCard(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: type.caption.copyWith(
              fontWeight: FontWeight.w700,
              color: colors.textSecondary,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 10),
          if (stats.rating != null) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  stats.rating!.toStringAsFixed(1),
                  style: type.statistics.copyWith(fontSize: 52, height: 1),
                ),
                const SizedBox(width: 10),
                Text(
                  stats.ratingLabel ?? '',
                  style: type.title.copyWith(color: colors.textSecondary),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${stats.wins}W · ${stats.losses}L · $played played',
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                _Tile(
                  value: '${stats.wins}W',
                  label: 'Wins',
                  fg: colors.success,
                  bg: colors.successSurface,
                ),
                const SizedBox(width: 8),
                _Tile(
                  value: '${stats.losses}L',
                  label: 'Losses',
                  fg: colors.textSecondary,
                  bg: colors.background,
                ),
                const SizedBox(width: 8),
                _Tile(
                  value: played == 0
                      ? '—'
                      : '${(stats.wins / played * 100).round()}%',
                  label: 'Win rate',
                  fg: colors.primary,
                  bg: colors.primaryLight,
                ),
              ],
            ),
          ] else
            Column(
              children: [
                const SizedBox(height: 4),
                Icon(
                  Icons.groups_outlined,
                  size: 32,
                  color: colors.textSecondary,
                ),
                const SizedBox(height: 8),
                Text(
                  'No rated matches yet',
                  style: type.title.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  played == 0
                      ? 'No matches played'
                      : '${stats.wins}W · ${stats.losses}L',
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.value,
    required this.label,
    required this.fg,
    required this.bg,
  });

  final String value;
  final String label;
  final Color fg;
  final Color bg;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: type.title.copyWith(
                fontWeight: FontWeight.w800,
                color: fg,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: type.caption.copyWith(color: colors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}

class _CardTitle extends StatelessWidget {
  const _CardTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Text(text, style: type.title.copyWith(fontWeight: FontWeight.w700));
  }
}
