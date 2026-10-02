import 'package:flutter/material.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../data/home_repository.dart';

/// The gradient identity card at the top of Home — Level / Singles / Doubles,
/// with a bar showing how far through the current level band the player is.
///
/// Renders "—" for anything the player has not been rated on rather than a
/// fabricated default.
///
/// THE BAR DOES NOT MOVE OFTEN, BY DESIGN. `level` changes only when an
/// assessment completes or the player edits their self-selected level, so
/// nothing accrues toward the next band in between (see `home-progress.ts`).
/// It answers "where do I stand", not "how am I trending". It is hidden
/// entirely for an un-levelled player and in the top band, where there is no
/// next level — the server sends null for both.
class HomeStatCard extends StatelessWidget {
  const HomeStatCard({super.key, required this.summary});

  final HomeSummary? summary;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final progress = summary?.levelProgress;

    String rating(double? v) => v == null ? '—' : v.toStringAsFixed(1);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [colors.primary, colors.primaryDark],
        ),
        boxShadow: [
          BoxShadow(
            color: colors.primary.withValues(alpha: 0.27),
            blurRadius: 40,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // Decorative discs, bled off the right edge by the clip.
          Positioned(
            top: -20,
            right: -20,
            child: _Disc(size: 100, opacity: 0.07),
          ),
          const Positioned(
            bottom: -30,
            right: 30,
            child: _Disc(size: 80, opacity: 0.05),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 22, 16, 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        child: _Stat(
                          label: 'LEVEL',
                          value: rating(summary?.level),
                          caption: summary?.levelLabel ?? 'Unrated',
                        ),
                      ),
                      const _Divider(),
                      Expanded(
                        child: _Stat(
                          label: 'SINGLES',
                          value: rating(summary?.singlesRating),
                          caption: summary?.singlesRating == null
                              ? 'Unrated'
                              : 'Rating',
                        ),
                      ),
                      const _Divider(),
                      Expanded(
                        child: _Stat(
                          label: 'DOUBLES',
                          value: rating(summary?.doublesRating),
                          caption: summary?.doublesRating == null
                              ? 'Unrated'
                              : 'Rating',
                        ),
                      ),
                    ],
                  ),
                ),
                if (progress != null) ...[
                  const SizedBox(height: 16),
                  _ProgressBar(progress: progress),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Disc extends StatelessWidget {
  const _Disc({required this.size, required this.opacity});

  final double size;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: opacity),
      ),
    );
  }
}

const _dim = Color(0xA6FFFFFF); // white @ 65%

class _Stat extends StatelessWidget {
  const _Stat({
    required this.label,
    required this.value,
    required this.caption,
  });

  final String label;
  final String value;
  final String caption;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: type.caption.copyWith(
            color: _dim,
            fontSize: 9,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: type.statistics.copyWith(
            color: Colors.white,
            fontSize: 32,
            height: 1.1,
            // The em-dash placeholder shouldn't read as heavy as a real number.
            fontWeight: value == '—' ? FontWeight.w500 : FontWeight.w700,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          caption,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: type.caption.copyWith(color: _dim, fontSize: 11),
        ),
      ],
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) =>
      Container(width: 1, color: const Color(0x2EFFFFFF));
}

class _ProgressBar extends StatelessWidget {
  const _ProgressBar({required this.progress});

  final LevelProgress progress;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Progress to ${progress.nextLevel.toStringAsFixed(1)}',
                style: const TextStyle(fontSize: 10, color: _dim),
              ),
              Text(
                '${progress.percent}%',
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: Color(0xE6FFFFFF),
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: Container(
              height: 5,
              color: const Color(0x33FFFFFF),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: (progress.percent / 100).clamp(0.0, 1.0),
                child: const ColoredBox(color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
