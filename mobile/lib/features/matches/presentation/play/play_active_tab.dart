import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/drift_pill.dart';
import '../../../../shared/widgets/drift_player_card.dart';
import '../../../../shared/widgets/drift_soft_card.dart';
import '../../../users/application/current_user_provider.dart';
import '../../application/matches_providers.dart';
import '../../data/matches_repository.dart';
import '_play_tab_scaffold.dart';

const _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', //
];

/// Play → Active. Scheduled and in-flight matches; tap a row for Match Detail.
class PlayActiveTab extends ConsumerWidget {
  const PlayActiveTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matches = ref.watch(matchListProvider(MatchSegment.active));
    final viewerId = ref.watch(currentUserProvider).valueOrNull?.id ?? '';

    return PlayTabScaffold(
      onRefresh: () =>
          ref.refresh(matchListProvider(MatchSegment.active).future),
      state: matches,
      emptyIcon: Icons.sports_tennis_outlined,
      emptyMessage: 'No upcoming matches — challenge someone to get started.',
      onRetry: () => ref.invalidate(matchListProvider(MatchSegment.active)),
      itemBuilder: (match) => _ActiveRow(match: match, viewerId: viewerId),
    );
  }
}

class _ActiveRow extends StatelessWidget {
  const _ActiveRow({required this.match, required this.viewerId});

  final DriftMatch match;
  final String viewerId;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final opponent = match.opponentFor(viewerId)?.player;

    final parts = <String>[
      match.isDoubles ? 'Doubles' : 'Singles',
      if (match.confirmedTime != null) _short(match.confirmedTime!),
      if (match.courtName != null && match.courtName!.isNotEmpty)
        match.courtName!,
    ];

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
                  parts.join(' · '),
                  style: type.caption.copyWith(color: colors.textSecondary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          DriftPill(label: match.state.label, tone: _tone(match.state)),
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

  static DriftPillTone _tone(MatchState state) => switch (state) {
    MatchState.scheduled => DriftPillTone.success,
    MatchState.scheduling || MatchState.rescheduled => DriftPillTone.warning,
    MatchState.proposed => DriftPillTone.info,
    MatchState.disputed => DriftPillTone.error,
    _ => DriftPillTone.neutral,
  };
}
