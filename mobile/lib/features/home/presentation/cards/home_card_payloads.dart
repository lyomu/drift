import 'package:flutter/material.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_spacing.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../courts/data/courts_repository.dart';
import '../../../players/data/players_repository.dart';
import '../../data/home_repository.dart';

/// Renders the typed payload of a Home card, dispatching on `data.kind`.
///
/// Payload widgets are deliberately compact — a Home card is a prompt, and
/// the full entity list is always one tap away. An unknown `kind` renders
/// nothing at all, so a card type added on the server degrades to its title
/// and body on an older client instead of crashing it.
class HomeCardPayload extends StatelessWidget {
  const HomeCardPayload({super.key, required this.data});

  final HomeCardData data;

  @override
  Widget build(BuildContext context) => switch (data.kind) {
    'players' => _PlayerStrip(players: data.players),
    'courts' => _CourtList(courts: data.courts),
    'story' => _StoryPreview(headline: data.headline, imageUrl: data.imageUrl),
    'achievement' => _AchievementProgress(
      earned: data.earnedCount ?? 0,
      total: data.totalCount ?? 0,
    ),
    'match' => _MatchMeta(
      confirmedTime: data.confirmedTime,
      courtLabel: data.courtLabel,
    ),
    // 'content', 'announcement' and 'counts' are fully expressed by the
    // card's own title and body — a payload widget would just repeat them.
    _ => const SizedBox.shrink(),
  };
}

/// Horizontally scrollable avatars. Reuses the initials-fallback logic rather
/// than a bare NetworkImage, so a dead `photoUrl` can't render a broken box.
class _PlayerStrip extends StatelessWidget {
  const _PlayerStrip({required this.players});

  final List<PlayerSummary> players;

  @override
  Widget build(BuildContext context) {
    if (players.isEmpty) return const SizedBox.shrink();
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return SizedBox(
      height: 96,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: players.length,
        separatorBuilder: (_, _) => const SizedBox(width: DriftSpacing.s4),
        itemBuilder: (context, index) {
          final player = players[index];
          return SizedBox(
            width: 72,
            child: Column(
              children: [
                _Avatar(player: player),
                const SizedBox(height: DriftSpacing.s1),
                Text(
                  player.displayName,
                  style: type.caption,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                ),
                if (player.level != null)
                  Text(
                    player.level!.toStringAsFixed(1),
                    style: type.caption.copyWith(color: colors.textSecondary),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.player});

  final PlayerSummary player;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    final initials = player.displayName
        .split(' ')
        .where((p) => p.isNotEmpty)
        .take(2)
        .map((p) => p[0].toUpperCase())
        .join();

    return CircleAvatar(
      radius: 24,
      backgroundColor: colors.primaryLight,
      foregroundImage: player.photoUrl == null
          ? null
          : NetworkImage(player.photoUrl!),
      // Without this a dead URL throws on every rebuild and leaves a blank
      // circle; falling through to initials keeps the row readable.
      onForegroundImageError: player.photoUrl == null ? null : (_, _) {},
      child: Text(
        initials.isEmpty ? '?' : initials,
        style: type.label.copyWith(color: colors.primaryDark),
      ),
    );
  }
}

class _CourtList extends StatelessWidget {
  const _CourtList({required this.courts});

  final List<CourtSummary> courts;

  @override
  Widget build(BuildContext context) {
    if (courts.isEmpty) return const SizedBox.shrink();
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Column(
      children: [
        for (final court in courts)
          Padding(
            padding: const EdgeInsets.only(bottom: DriftSpacing.s1),
            child: Row(
              children: [
                Icon(
                  Icons.place_outlined,
                  size: 14,
                  color: colors.textSecondary,
                ),
                const SizedBox(width: DriftSpacing.s2),
                Expanded(
                  child: Text(
                    court.name,
                    style: type.bodySmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  // "Distance unknown" rather than a fabricated number — the
                  // same never-fabricate rule the court mapper applies.
                  court.distanceKm == null
                      ? 'Distance unknown'
                      : '${court.distanceKm!.toStringAsFixed(1)} km',
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _StoryPreview extends StatelessWidget {
  const _StoryPreview({required this.headline, required this.imageUrl});

  final String? headline;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    if (imageUrl == null) return const SizedBox.shrink();
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Image.network(
        imageUrl!,
        height: 120,
        width: double.infinity,
        fit: BoxFit.cover,
        // A missing image collapses the slot rather than showing a broken
        // placeholder — the headline already carries the card.
        errorBuilder: (_, _, _) => const SizedBox.shrink(),
        loadingBuilder: (context, child, progress) =>
            progress == null ? child : const SizedBox(height: 120),
      ),
    );
  }
}

class _AchievementProgress extends StatelessWidget {
  const _AchievementProgress({required this.earned, required this.total});

  final int earned;
  final int total;

  @override
  Widget build(BuildContext context) {
    if (total == 0) return const SizedBox.shrink();
    final colors = Theme.of(context).extension<DriftColors>()!;

    return ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: LinearProgressIndicator(
        value: earned / total,
        minHeight: 6,
        backgroundColor: colors.border,
        valueColor: AlwaysStoppedAnimation<Color>(colors.success),
      ),
    );
  }
}

class _MatchMeta extends StatelessWidget {
  const _MatchMeta({required this.confirmedTime, required this.courtLabel});

  final DateTime? confirmedTime;
  final String? courtLabel;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    final parts = <String>[
      if (confirmedTime != null) _formatDateTime(confirmedTime!),
      if (courtLabel != null && courtLabel!.isNotEmpty) courtLabel!,
    ];
    if (parts.isEmpty) return const SizedBox.shrink();

    return Row(
      children: [
        Icon(Icons.schedule, size: 14, color: colors.textSecondary),
        const SizedBox(width: DriftSpacing.s2),
        Expanded(
          child: Text(
            parts.join(' · '),
            style: type.bodySmall.copyWith(color: colors.textSecondary),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  /// Formatted in the device's own zone — the API sends UTC, and a match time
  /// shown in the server's timezone would be wrong for anyone travelling.
  String _formatDateTime(DateTime value) {
    final local = value.toLocal();
    final hh = local.hour.toString().padLeft(2, '0');
    final mm = local.minute.toString().padLeft(2, '0');
    return '${local.day}/${local.month} at $hh:$mm';
  }
}
