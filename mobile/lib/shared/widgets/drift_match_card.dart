import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_spacing.dart';
import '../../core/theme/drift_typography.dart';
import '../../features/matches/data/matches_repository.dart';
import 'drift_card.dart';
import 'drift_detail_row.dart';
import 'drift_player_card.dart';
import 'drift_status_badge.dart';
import '../../core/l10n/l10n.dart';
import 'package:intl/intl.dart';

/// Match Card — `foundation/05-design-system.md` §7. Opponent, time, court,
/// and a state badge that is always icon + label, never colour alone (§9).
class DriftMatchCard extends StatelessWidget {
  const DriftMatchCard({
    super.key,
    required this.match,
    required this.viewerId,
    this.onTap,
  });

  final DriftMatch match;
  final String viewerId;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final opponent = match.opponentFor(viewerId);

    return DriftCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (opponent != null) ...[
                DriftPlayerAvatar(player: opponent.player, radius: 20),
                const SizedBox(width: DriftSpacing.s3),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      opponent?.player.displayName ?? context.l10n.matchTitle,
                      style: type.title,
                    ),
                    Text(
                      match.isDoubles
                          ? context.l10n.optDoubles
                          : context.l10n.optSingles,
                      style: type.caption.copyWith(color: colors.textSecondary),
                    ),
                  ],
                ),
              ),
              _StateBadge(state: match.state),
            ],
          ),
          if (match.confirmedTime != null || match.courtName != null) ...[
            const SizedBox(height: DriftSpacing.s3),
            if (match.confirmedTime != null)
              DriftDetailRow(
                icon: Icons.event,
                text: formatMatchTime(match.confirmedTime!),
              ),
            if (match.courtName != null)
              DriftDetailRow(
                icon: Icons.place_outlined,
                text: match.courtName!,
              ),
          ],
        ],
      ),
    );
  }
}

/// Shared so the card, detail screen and proposal list all read the same.
String formatMatchTime(DateTime time) =>
    // "4 Aug, 6:30 PM" / "4 août, 18:30" — each locale's own clock.
    '${DateFormat.MMMd(localeTagNow).format(time)}, '
    '${DateFormat.jm(localeTagNow).format(time)}';

class _StateBadge extends StatelessWidget {
  const _StateBadge({required this.state});

  final MatchState state;

  @override
  Widget build(BuildContext context) {
    final (tone, icon) = switch (state) {
      MatchState.proposed => (DriftStatusTone.info, Icons.schedule_send),
      MatchState.scheduling ||
      MatchState.rescheduled => (DriftStatusTone.warning, Icons.sync),
      MatchState.scheduled => (DriftStatusTone.success, Icons.event_available),
      MatchState.cancelled ||
      MatchState.expired => (DriftStatusTone.neutral, Icons.cancel_outlined),
      MatchState.disputed => (DriftStatusTone.error, Icons.gavel),
      _ => (DriftStatusTone.neutral, Icons.check_circle_outline),
    };

    return DriftStatusBadge(label: state.label, tone: tone, icon: icon);
  }
}
