import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/l10n/l10n.dart';
import '../../core/l10n/enum_labels.dart';
import '../../core/network/media_url.dart';
import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_typography.dart';
import '../../features/players/data/players_repository.dart';

/// Shared profile header, record, and membership summary.
class DriftProfileHighlights extends StatelessWidget {
  const DriftProfileHighlights({
    super.key,
    required this.profile,
    this.trailing,
  });

  final PlayerProfile profile;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final summary = profile.summary;
    final stats = profile.stats;
    final played = stats.singles.wins + stats.singles.losses +
        stats.doubles.wins + stats.doubles.losses;
    final wins = stats.singles.wins + stats.doubles.wins;
    final rating = stats.singles.rating ?? stats.doubles.rating;
    final joined = profile.joinedAt;
    final photoUrl = driftMediaUrl(summary.photoUrl);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          constraints: const BoxConstraints(minHeight: 270),
          padding: const EdgeInsets.fromLTRB(22, 18, 22, 24),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(26),
            border: Border.all(color: colors.primary.withValues(alpha: .2)),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [colors.primaryLight, colors.surfaceRaised],
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                right: -22,
                top: 42,
                child: IgnorePointer(
                  child: Icon(Icons.sports_tennis,
                    size: 190, color: colors.primary.withValues(alpha: .045)),
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      if (summary.availabilitySummary != null)
                        _HeroPill(
                          label: summary.availabilitySummary!,
                          color: colors.primary,
                          icon: Icons.circle,
                        ),
                      if (trailing != null) ...[
                        const SizedBox(width: 6),
                        trailing!,
                      ],
                    ],
                  ),
                  const SizedBox(height: 22),
                  Row(
                    children: [
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white.withValues(alpha: .72),
                              ),
                            ),
                            child: CircleAvatar(
                              radius: 55,
                              backgroundColor: colors.background,
                              foregroundImage: photoUrl == null
                                  ? null
                                  : NetworkImage(photoUrl),
                              onForegroundImageError: (_, _) {},
                              child: Text(
                                _initials(summary),
                                style: type.h3.copyWith(color: colors.primary),
                              ),
                            ),
                          ),
                          if (rating != null)
                            Positioned(
                              right: -8,
                              bottom: -5,
                              child: Container(
                                width: 48,
                                height: 48,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: colors.primary,
                                  border: Border.all(
                                    color: colors.primaryLight,
                                    width: 4,
                                  ),
                                ),
                                child: Text(
                                  rating.toStringAsFixed(1),
                                  style: type.label.copyWith(
                                    color: colors.background,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(width: 18),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(summary.displayName,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: type.h2.copyWith(
                                color: colors.textPrimary,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            if (summary.generalLocation != null) ...[
                              const SizedBox(height: 9),
                              Row(
                                children: [
                                  Icon(Icons.location_on_outlined,
                                    size: 17, color: colors.textSecondary),
                                  const SizedBox(width: 5),
                                  Expanded(
                                    child: Text(summary.generalLocation!,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: type.bodySmall.copyWith(
                                        color: colors.textSecondary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 7,
                              runSpacing: 7,
                              children: [
                                if (summary.levelLabel != null)
                                  _HeroPill(
                                    label: levelLabelText(
                                      context.l10n, summary.levelLabel!),
                                    color: colors.textPrimary,
                                  ),
                                if (profile.dominantHand != null)
                                  _HeroPill(
                                    label: handednessLabel(
                                      context.l10n, profile.dominantHand!),
                                    color: colors.textPrimary,
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 18),
          decoration: BoxDecoration(
            color: colors.surfaceRaised,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            children: [
              _Metric(value: rating?.toStringAsFixed(1) ?? '—',
                  label: context.l10n.profileRating),
              _Metric(value: '$played', label: context.l10n.profileMatches),
              _Metric(value: '$wins', label: context.l10n.profileWins),
            ],
          ),
        ),
        if (joined != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
            decoration: BoxDecoration(
              color: colors.primaryLight,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                Icon(Icons.emoji_events_outlined, size: 21, color: colors.primary),
                const SizedBox(width: 11),
                Expanded(
                  child: Text(
                    context.l10n.profilePlayingSince(
                      DateFormat.yMMMM(context.localeTag).format(joined.toLocal()),
                    ),
                    style: type.bodySmall.copyWith(
                      color: colors.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  String _initials(PlayerSummary summary) => [summary.firstName, summary.lastName]
      .whereType<String>()
      .where((part) => part.isNotEmpty)
      .map((part) => part[0].toUpperCase())
      .take(2)
      .join();
}

class _HeroPill extends StatelessWidget {
  const _HeroPill({required this.label, required this.color, this.icon});
  final String label;
  final Color color;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: colors.background.withValues(alpha: .44),
        border: Border.all(color: colors.border.withValues(alpha: .65)),
        borderRadius: BorderRadius.circular(9),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 8, color: color),
            const SizedBox(width: 6),
          ],
          Text(label, style: type.caption.copyWith(
            color: color, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Expanded(
      child: Column(
        children: [
          Text(value, style: type.h3.copyWith(color: colors.primaryDark)),
          const SizedBox(height: 3),
          Text(label, textAlign: TextAlign.center,
              style: type.caption.copyWith(color: colors.textSecondary)),
        ],
      ),
    );
  }
}
