import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/drift_player_card.dart';
import '../../../../shared/widgets/drift_section_header.dart';
import '../../../../shared/widgets/drift_soft_card.dart';
import '../../../matches/application/matches_providers.dart';
import '../../../matches/data/matches_repository.dart';
import '../../../players/data/players_repository.dart';
import '../../../users/application/current_user_provider.dart';
import 'home_empty_state.dart';

const _months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/// "Next match" section. Shows the opponent/time/venue when the feed picked
/// an upcoming match, otherwise a prompt to go find one.
class NextMatchSection extends ConsumerWidget {
  const NextMatchSection({super.key, this.matchId});

  final String? matchId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final match = matchId == null
        ? null
        : ref.watch(matchDetailProvider(matchId!)).valueOrNull;
    final viewerId = ref.watch(currentUserProvider).valueOrNull?.id;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DriftSectionHeader(
            title: 'Next match',
            actionLabel: 'View all',
            onAction: () => context.go('/home?tab=play&play=active'),
          ),
          const SizedBox(height: 12),
          if (match == null)
            HomeEmptyState(
              icon: Icons.event_available_outlined,
              message: 'No matches scheduled yet.',
              actionLabel: 'Find a match',
              onAction: () => context.go('/home?tab=play&play=find'),
            )
          else
            _MatchCard(
              match: match,
              opponent: viewerId == null
                  ? null
                  : match.opponentFor(viewerId)?.player,
            ),
        ],
      ),
    );
  }
}

class _MatchCard extends StatelessWidget {
  const _MatchCard({required this.match, required this.opponent});

  final DriftMatch match;
  final PlayerSummary? opponent;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    final when = match.confirmedTime;
    final whenLine = when == null
        ? 'Time to be confirmed'
        : '${when.day} ${_months[when.month - 1]} · '
              '${when.hour.toString().padLeft(2, '0')}:'
              '${when.minute.toString().padLeft(2, '0')}';

    return DriftSoftCard(
      onTap: () => context.push('/matches/${match.id}'),
      child: Row(
        children: [
          if (opponent != null)
            DriftPlayerAvatar(player: opponent!, radius: 24)
          else
            CircleAvatar(
              radius: 24,
              backgroundColor: colors.primaryLight,
              child: Icon(Icons.person, color: colors.primaryDark),
            ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  opponent?.displayName ?? 'Your opponent',
                  style: type.title.copyWith(fontWeight: FontWeight.w700),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  whenLine,
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
                if (match.courtName != null &&
                    match.courtName!.isNotEmpty) ...[
                  const SizedBox(height: 1),
                  Text(
                    match.courtName!,
                    style: type.caption.copyWith(color: colors.textSecondary),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          _ViewPill(onTap: () => context.push('/matches/${match.id}')),
        ],
      ),
    );
  }
}

class _ViewPill extends StatelessWidget {
  const _ViewPill({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: colors.border, width: 1.5),
        ),
        child: Text('View', style: type.label.copyWith(color: colors.primary)),
      ),
    );
  }
}
