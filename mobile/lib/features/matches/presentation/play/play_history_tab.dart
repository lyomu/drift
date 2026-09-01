import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/drift_player_card.dart';
import '../../../../shared/widgets/drift_soft_card.dart';
import '../../../users/application/current_user_provider.dart';
import '../../application/matches_providers.dart';
import '../../data/matches_repository.dart';
import '../../data/player_stats.dart';
import '_play_tab_scaffold.dart';

const _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', //
];

/// Play → History. A "Your stats" summary followed by past matches, each with
/// a win / loss chip.
class PlayHistoryTab extends ConsumerWidget {
  const PlayHistoryTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matches = ref.watch(matchListProvider(MatchSegment.history));
    final stats = ref.watch(myStatsProvider).valueOrNull;
    final viewerId = ref.watch(currentUserProvider).valueOrNull?.id ?? '';

    return PlayTabScaffold(
      onRefresh: () {
        ref.invalidate(myStatsProvider);
        return ref.refresh(matchListProvider(MatchSegment.history).future);
      },
      state: matches,
      emptyIcon: Icons.history,
      emptyMessage: 'Play your first match to start building history.',
      onRetry: () => ref.invalidate(matchListProvider(MatchSegment.history)),
      header: stats == null ? null : _StatsCard(stats: stats),
      itemSpacing: 10,
      itemBuilder: (match) => _HistoryRow(match: match, viewerId: viewerId),
    );
  }
}

class _StatsCard extends StatelessWidget {
  const _StatsCard({required this.stats});

  final PlayerStats stats;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;

    final played =
        stats.singles.wins +
        stats.singles.losses +
        stats.doubles.wins +
        stats.doubles.losses;
    final won = stats.singles.wins + stats.doubles.wins;
    final rate = played == 0 ? 0 : (won / played * 100).round();

    return DriftSoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Your stats',
            style: type.body.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _Tile(value: '$played', label: 'Played'),
              const SizedBox(width: 10),
              _Tile(value: '$won', label: 'Won'),
              const SizedBox(width: 10),
              _Tile(value: '$rate%', label: 'Win rate'),
            ],
          ),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: colors.background,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: type.statistics.copyWith(
                fontSize: 22,
                color: colors.primary,
              ),
            ),
            const SizedBox(height: 4),
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

class _HistoryRow extends StatelessWidget {
  const _HistoryRow({required this.match, required this.viewerId});

  final DriftMatch match;
  final String viewerId;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final opponent = match.opponentFor(viewerId)?.player;

    final viewerSide = match.participants
        .where((p) => p.userId == viewerId)
        .map((p) => p.side)
        .firstOrNull;
    final won =
        match.result?.winningSide != null &&
        match.result!.winningSide == viewerSide;
    final settled = match.result?.winningSide != null;

    final sub = <String>[
      match.isDoubles ? 'Doubles' : 'Singles',
      if (match.confirmedTime != null) _short(match.confirmedTime!),
    ].join(' · ');

    return DriftSoftCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      onTap: () => context.push('/matches/${match.id}'),
      child: Row(
        children: [
          if (opponent != null) ...[
            DriftPlayerAvatar(player: opponent, radius: 22),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  opponent?.displayName ?? 'Match',
                  style: type.title.copyWith(fontWeight: FontWeight.w700),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  sub,
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          if (settled)
            _ResultChip(won: won)
          else
            Text(
              match.state.label,
              style: type.caption.copyWith(color: colors.textSecondary),
            ),
        ],
      ),
    );
  }

  static String _short(DateTime t) {
    final l = t.toLocal();
    return '${l.day} ${_months[l.month - 1]} · '
        '${l.hour.toString().padLeft(2, '0')}:'
        '${l.minute.toString().padLeft(2, '0')}';
  }
}

class _ResultChip extends StatelessWidget {
  const _ResultChip({required this.won});

  final bool won;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Container(
      width: 32,
      height: 32,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: won ? colors.successSurface : colors.errorSurface,
      ),
      child: Text(
        won ? 'W' : 'L',
        style: type.label.copyWith(
          fontWeight: FontWeight.w800,
          color: won ? colors.success : colors.error,
        ),
      ),
    );
  }
}
