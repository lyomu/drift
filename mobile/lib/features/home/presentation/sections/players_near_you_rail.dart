import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/drift_pill.dart';
import '../../../../shared/widgets/drift_player_card.dart';
import '../../../../shared/widgets/drift_section_header.dart';
import '../../../players/data/players_repository.dart';
import '../../../users/application/current_user_provider.dart';
import 'home_empty_state.dart';

/// "Players near you" section — a rail of nearby players, or a prompt to go
/// search when the feed surfaced none.
class PlayersNearYouSection extends ConsumerWidget {
  const PlayersNearYouSection({super.key, required this.players});

  final List<PlayerSummary> players;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final viewerId = ref.watch(currentUserProvider).valueOrNull?.id;
    final shown = players.where((p) => p.id != viewerId).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: DriftSectionHeader(
            title: 'Players near you',
            actionLabel: 'Find more',
            onAction: () => context.go('/home?tab=play&play=find'),
          ),
        ),
        const SizedBox(height: 12),
        if (shown.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: HomeEmptyState(
              icon: Icons.person_search_outlined,
              message: 'No players nearby yet.',
              actionLabel: 'Search',
              onAction: () => context.go('/home?tab=play&play=find'),
            ),
          )
        else
          SizedBox(
            height: 104,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: shown.length,
              separatorBuilder: (_, _) => const SizedBox(width: 14),
              itemBuilder: (context, i) {
                final player = shown[i];
                return GestureDetector(
                  onTap: () => context.push('/players/${player.id}'),
                  child: SizedBox(
                    width: 72,
                    child: Column(
                      children: [
                        DriftPlayerAvatar(player: player, radius: 24),
                        const SizedBox(height: 6),
                        Text(
                          _shortName(player),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: type.caption.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        if (player.level != null)
                          DriftPill(label: player.level!.toStringAsFixed(1)),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  /// "Carla N." — first name plus last initial, to fit the narrow column.
  static String _shortName(PlayerSummary p) {
    final first = p.firstName?.trim() ?? '';
    final last = p.lastName?.trim() ?? '';
    if (first.isEmpty) return p.displayName;
    return last.isEmpty ? first : '$first ${last[0]}.';
  }
}
