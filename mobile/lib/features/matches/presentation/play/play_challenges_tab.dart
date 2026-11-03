import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/drift_pill.dart';
import '../../../../shared/widgets/drift_player_card.dart';
import '../../../../shared/widgets/drift_soft_card.dart';
import '../../../auth/data/auth_repository.dart';
import '../../../users/application/current_user_provider.dart';
import '../../application/matches_providers.dart';
import '../../data/matches_repository.dart';
import '_play_tab_scaffold.dart';
import '../withdraw_challenge_dialog.dart';
import '../../../../core/l10n/l10n.dart';

/// Play → Challenges. Incoming and outgoing challenges still being agreed;
/// both actions open Match Detail, where accept / decline / propose live.
class PlayChallengesTab extends ConsumerWidget {
  const PlayChallengesTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matches = ref.watch(matchListProvider(MatchSegment.challenges));
    final viewerId = ref.watch(currentUserProvider).valueOrNull?.id ?? '';

    return PlayTabScaffold(
      onRefresh: () =>
          ref.refresh(matchListProvider(MatchSegment.challenges).future),
      state: matches,
      emptyIcon: Icons.sports_tennis_outlined,
      emptyMessage: context.l10n.playChallengesEmpty,
      onRetry: () => ref.invalidate(matchListProvider(MatchSegment.challenges)),
      itemBuilder: (match) => _ChallengeCard(match: match, viewerId: viewerId),
    );
  }
}

class _ChallengeCard extends ConsumerWidget {
  const _ChallengeCard({required this.match, required this.viewerId});

  final DriftMatch match;
  final String viewerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final opponent = match.opponentFor(viewerId)?.player;
    final route = '/matches/${match.id}';
    final canWithdraw = match.canWithdraw(viewerId);

    Future<void> undo() async {
      if (!await confirmWithdrawChallenge(context)) return;
      try {
        await ref.read(matchesRepositoryProvider).withdraw(match.id);
        ref.invalidate(matchListProvider(MatchSegment.challenges));
        ref.invalidate(matchDetailProvider(match.id));
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(
            SnackBar(content: Text(context.l10n.playChallengeWithdrawn)),
          );
        }
      } on AuthException catch (error) {
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(error.message)));
        }
      }
    }

    return DriftSoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              if (opponent != null) ...[
                DriftPlayerAvatar(player: opponent, radius: 22),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    PlayCompetitionTag(match: match),
                    Text(
                      opponent?.displayName ?? context.l10n.matchChallenge,
                      style: type.title.copyWith(fontWeight: FontWeight.w700),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      match.isDoubles ? context.l10n.optDoubles : context.l10n.optSingles,
                      style: type.caption.copyWith(color: colors.textSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              DriftPill(label: match.state.label, tone: _tone(match.state)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _CardButton(
                  label: context.l10n.commonViewDetails,
                  filled: false,
                  onTap: () => context.push(route),
                ),
              ),
              if (canWithdraw || match.createdById != viewerId) ...[
                const SizedBox(width: 8),
                Expanded(
                  child: _CardButton(
                    label: canWithdraw
                      ? context.l10n.matchUndoChallenge
                      : context.l10n.playRespond,
                    filled: true,
                    onTap: canWithdraw ? undo : () => context.push(route),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  DriftPillTone _tone(MatchState state) => switch (state) {
    MatchState.scheduling || MatchState.rescheduled => DriftPillTone.warning,
    MatchState.proposed => DriftPillTone.info,
    MatchState.disputed => DriftPillTone.error,
    _ => DriftPillTone.neutral,
  };
}

class _CardButton extends StatelessWidget {
  const _CardButton({
    required this.label,
    required this.filled,
    required this.onTap,
  });

  final String label;
  final bool filled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Material(
      color: filled ? colors.primary : colors.primaryLight,
      borderRadius: BorderRadius.circular(10),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 9),
          child: Center(
            child: Text(
              label,
              style: type.label.copyWith(
                color: filled ? Colors.white : colors.primary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
