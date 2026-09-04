import 'package:flutter/material.dart';

import '../../core/network/media_url.dart';
import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_spacing.dart';
import '../../core/theme/drift_typography.dart';
import '../../features/players/data/players_repository.dart';
import 'drift_card.dart';

/// Player Card — `foundation/05-design-system.md` §7. Compact summary for
/// discovery and connection lists: photo, name, level, distance band,
/// availability. Distance is always the coarse band the API returns, never
/// a computed precise figure.
class DriftPlayerCard extends StatelessWidget {
  const DriftPlayerCard({
    super.key,
    required this.player,
    this.onTap,
    this.trailing,
  });

  final PlayerSummary player;
  final VoidCallback? onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    final meta = [
      if (player.levelLabel != null && player.level != null)
        'Level ${player.level!.toStringAsFixed(1)} · ${player.levelLabel}',
      player.distanceBand ?? 'Distance unknown',
      if (player.generalLocation != null) player.generalLocation!,
    ].join(' • ');

    return DriftCard(
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DriftPlayerAvatar(player: player),
          const SizedBox(width: DriftSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(player.displayName, style: type.title),
                const SizedBox(height: DriftSpacing.s1),
                Text(
                  meta,
                  style: type.bodySmall.copyWith(color: colors.textSecondary),
                ),
                if (player.availabilitySummary != null) ...[
                  const SizedBox(height: DriftSpacing.s2),
                  _AvailabilityChip(label: player.availabilitySummary!),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: DriftSpacing.s2),
            trailing!,
          ],
        ],
      ),
    );
  }
}

/// Photo, or initials when the player hasn't set one.
class DriftPlayerAvatar extends StatelessWidget {
  const DriftPlayerAvatar({super.key, required this.player, this.radius = 24});

  final PlayerSummary player;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    final initials = [player.firstName, player.lastName]
        .whereType<String>()
        .where((p) => p.isNotEmpty)
        .map((p) => p[0].toUpperCase())
        .take(2)
        .join();

    // Uploaded photos are stored as a path relative to the API origin, so
    // they go through `driftMediaUrl` before they can be fetched.
    final photoUrl = driftMediaUrl(player.photoUrl);

    if (photoUrl != null) {
      // `foregroundImage` (not `backgroundImage`) so the initials below stay
      // visible if the photo fails: a dead or malformed URL previously threw
      // on every rebuild and left a blank circle with no fallback. The error
      // callback is required for that fallback to render at all — without it
      // the exception propagates instead.
      return CircleAvatar(
        radius: radius,
        backgroundColor: colors.primaryLight,
        foregroundImage: NetworkImage(photoUrl),
        onForegroundImageError: (_, _) {},
        child: Text(
          initials.isEmpty ? '?' : initials,
          style: type.label.copyWith(color: colors.primaryDark),
        ),
      );
    }

    return CircleAvatar(
      radius: radius,
      backgroundColor: colors.primaryLight,
      child: Text(
        initials.isEmpty ? '?' : initials,
        style: type.label.copyWith(color: colors.primaryDark),
      ),
    );
  }
}

class _AvailabilityChip extends StatelessWidget {
  const _AvailabilityChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: colors.primaryLight,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.schedule, size: 13, color: colors.primaryDark),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              label,
              style: type.caption.copyWith(color: colors.primaryDark),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
