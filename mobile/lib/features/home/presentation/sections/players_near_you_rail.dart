import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/network/media_url.dart';
import '../../../../core/theme/drift_colors.dart';
import '../../../players/data/players_repository.dart';
import '../../../users/application/current_user_provider.dart';
import 'home_empty_state.dart';

const _ink = Color(0xFF0F172A);

/// Avatar gradients, picked by a stable hash of the player id so a player
/// keeps the same colour between rebuilds — the API sends no colour, and
/// cycling by position would recolour people as the feed re-ranks.
const _gradients = <(Color, Color)>[
  (Color(0xFF22C55E), Color(0xFF16A34A)),
  (Color(0xFF1A7AFF), Color(0xFF0A4FC8)),
  (Color(0xFF8B5CF6), Color(0xFF7C3AED)),
  (Color(0xFFEC4899), Color(0xFFDB2777)),
  (Color(0xFFF97316), Color(0xFFEA580C)),
];

/// "Players near you" — a rail of nearby players, or a prompt to go search
/// when the feed surfaced none.
class PlayersNearYouSection extends ConsumerWidget {
  const PlayersNearYouSection({super.key, required this.players});

  final List<PlayerSummary> players;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final viewerId = ref.watch(currentUserProvider).valueOrNull?.id;
    final shown = players.where((p) => p.id != viewerId).toList();

    if (shown.isEmpty) {
      return HomeEmptyState(
        icon: Icons.person_search_outlined,
        message: 'No players nearby yet.',
        actionLabel: 'Search',
        onAction: () => context.go('/home?tab=play&play=find'),
      );
    }

    return SizedBox(
      height: 108,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.zero,
        itemCount: shown.length,
        separatorBuilder: (_, _) => const SizedBox(width: 14),
        itemBuilder: (context, i) => _PlayerTile(player: shown[i]),
      ),
    );
  }
}

class _PlayerTile extends StatelessWidget {
  const _PlayerTile({required this.player});

  final PlayerSummary player;

  /// "Carla N." — first name plus last initial, to fit the narrow column.
  String get _shortName {
    final first = player.firstName?.trim() ?? '';
    final last = player.lastName?.trim() ?? '';
    if (first.isEmpty) return player.displayName;
    return last.isEmpty ? first : '$first ${last[0]}.';
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final (from, to) = _gradients[player.id.hashCode.abs() % _gradients.length];

    return GestureDetector(
      onTap: () => context.push('/players/${player.id}'),
      child: SizedBox(
        width: 62,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _Avatar(player: player, from: from, to: to),
            const SizedBox(height: 6),
            Text(
              _shortName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                height: 1.2,
                color: _ink,
              ),
            ),
            const SizedBox(height: 4),
            if (player.level != null)
              DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(999),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [colors.primary, colors.primaryDark],
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 2,
                  ),
                  child: Text(
                    player.level!.toStringAsFixed(1),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      height: 1.3,
                      color: Colors.white,
                    ),
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
  const _Avatar({required this.player, required this.from, required this.to});

  final PlayerSummary player;
  final Color from;
  final Color to;

  @override
  Widget build(BuildContext context) {
    final initials = [player.firstName, player.lastName]
        .whereType<String>()
        .where((p) => p.isNotEmpty)
        .map((p) => p[0].toUpperCase())
        .take(2)
        .join();
    final photoUrl = driftMediaUrl(player.photoUrl);

    final fallback = Center(
      child: Text(
        initials.isEmpty ? '?' : initials,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          height: 1.2,
          color: Colors.white,
        ),
      ),
    );

    return Container(
      width: 54,
      height: 54,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [from, to],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x2E000000),
            blurRadius: 14,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: ClipOval(
        child: photoUrl == null
            ? fallback
            : Image.network(
                photoUrl,
                fit: BoxFit.cover,
                // Without this a dead URL throws on every rebuild and leaves
                // a blank circle with no fallback.
                errorBuilder: (_, _, _) => fallback,
              ),
      ),
    );
  }
}
