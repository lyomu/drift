import 'package:flutter/material.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../data/home_repository.dart';

/// The gradient identity card under the greeting — Level / Singles / Doubles.
/// Renders "—" for anything the player hasn't been rated on rather than a
/// fabricated default.
class HomeStatCard extends StatelessWidget {
  const HomeStatCard({super.key, required this.summary});

  final HomeSummary? summary;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    String rating(double? v) => v == null ? '—' : v.toStringAsFixed(1);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [colors.primary, colors.primaryDark],
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: _Stat(
              label: 'Level',
              value: rating(summary?.level),
              caption: summary?.levelLabel ?? 'Unrated',
            ),
          ),
          const _Divider(),
          Expanded(
            child: _Stat(
              label: 'Singles',
              value: rating(summary?.singlesRating),
              caption: summary?.singlesRating == null ? 'Unrated' : 'Rating',
            ),
          ),
          const _Divider(),
          Expanded(
            child: _Stat(
              label: 'Doubles',
              value: rating(summary?.doublesRating),
              caption: summary?.doublesRating == null ? 'Unrated' : 'Rating',
            ),
          ),
        ],
      ),
    );
  }
}

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
    const dim = Color(0xA6FFFFFF); // white @ 65%

    return Column(
      children: [
        Text(
          label.toUpperCase(),
          style: type.caption.copyWith(
            color: dim,
            fontSize: 10,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: type.statistics.copyWith(
            color: Colors.white,
            fontSize: 30,
            // the em-dash placeholder shouldn't read as heavy as a real number
            fontWeight: value == '—' ? FontWeight.w500 : null,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          caption,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: type.caption.copyWith(color: dim, fontSize: 10),
        ),
      ],
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) =>
      Container(width: 1, height: 48, color: const Color(0x33FFFFFF));
}
