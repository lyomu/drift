import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/drift_player_card.dart';
import '../../../matches/application/matches_providers.dart';
import '../../../matches/data/matches_repository.dart';
import '../../../players/data/players_repository.dart';
import '../../../users/application/current_user_provider.dart';
import 'home_empty_state.dart';
import '../../../../core/l10n/l10n.dart';
import 'package:intl/intl.dart';


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

    // The section header is supplied by the enclosing `HomeSectionPanel`.
    if (match == null) {
      return HomeEmptyState(
        icon: Icons.event_available_outlined,
        message: context.l10n.homeNoMatches,
        actionLabel: context.l10n.homeFindAMatch,
        onAction: () => context.go('/home?tab=play&play=find'),
      );
    }
    return _MatchCard(
      match: match,
      opponent: viewerId == null ? null : match.opponentFor(viewerId)?.player,
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
        ? context.l10n.matchTimeTbc
        : '${DateFormat.MMMd(context.localeTag).format(when)} · '
              '${DateFormat.Hm(context.localeTag).format(when)}';

    // Tinted ground rather than a white card: this sits inside a white panel,
    // so a white card on white would have nothing to sit against.
    return Material(
      color: colors.background,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/matches/${match.id}'),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: Color.alphaBlend(
                colors.primary.withValues(alpha: 0.18),
                colors.surface,
              ),
              width: 1.5,
            ),
          ),
          padding: const EdgeInsets.all(14),
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
                  opponent?.displayName ?? context.l10n.matchYourOpponent,
                  style: type.title.copyWith(fontWeight: FontWeight.w700),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  whenLine,
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
                if (match.courtName != null && match.courtName!.isNotEmpty) ...[
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
        ),
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
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        boxShadow: [
          BoxShadow(
            color: colors.primary.withValues(alpha: 0.25),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: colors.primary,
        borderRadius: BorderRadius.circular(999),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 18, vertical: 9),
            child: Text(
              context.l10n.commonView,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                height: 1.2,
                color: Colors.white,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
