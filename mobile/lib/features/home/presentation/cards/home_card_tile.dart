import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_spacing.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/buttons/drift_button.dart';
import '../../../../shared/widgets/drift_card.dart';
import '../../data/home_repository.dart';
import 'home_card_payloads.dart';

/// One Home feed card.
///
/// Every card shares this shell — accent bar, icon, title, body, action — and
/// differs only in the payload rendered between body and action. That split
/// is deliberate: before this, `home_screen.dart` ignored `type` entirely and
/// rendered every card as an identical title/body block, which is most of why
/// Home read as empty even when it had content.
///
/// The payload widgets are purpose-built compact rows rather than the
/// full-width entity cards (`DriftPlayerCard`, `DriftCourtCard`). Those are
/// designed as standalone list items; nesting three of them inside a card
/// produces card-in-card layouts and pushes everything below the fold. They
/// share the same tokens, so the visual language still matches.
class HomeCardTile extends StatelessWidget {
  const HomeCardTile({super.key, required this.card, required this.onDismiss});

  final HomeCard card;
  final Future<void> Function(HomeCard card) onDismiss;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final accent = _accentColor(colors, card.accent);

    final tile = DriftCard(
      padding: EdgeInsets.zero,
      onTap: card.action == null
          ? null
          : () => context.push(card.action!.route),
      // IntrinsicHeight gives the Row a bounded height to stretch to — without
      // it, Card's unbounded-height child makes `stretch` force an infinite
      // constraint on the accent rail below.
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // A 4px accent rail rather than a tinted background: it reads at a
            // glance while keeping body text on the standard surface, so
            // contrast stays consistent in both themes.
            Container(
              width: 4,
              decoration: BoxDecoration(
                color: accent,
                borderRadius: const BorderRadius.horizontal(
                  left: Radius.circular(12),
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(DriftSpacing.s4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(_iconFor(card.type), size: 18, color: accent),
                        const SizedBox(width: DriftSpacing.s2),
                        Expanded(
                          child: Text(
                            card.title,
                            style: type.h4,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    if (card.body.isNotEmpty) ...[
                      const SizedBox(height: DriftSpacing.s1),
                      Text(
                        card.body,
                        style: type.body.copyWith(color: colors.textSecondary),
                      ),
                    ],
                    if (card.data != null) ...[
                      const SizedBox(height: DriftSpacing.s3),
                      HomeCardPayload(data: card.data!),
                    ],
                    if (card.action != null) ...[
                      const SizedBox(height: DriftSpacing.s3),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: DriftButton(
                          label: card.action!.label,
                          variant: DriftButtonVariant.text,
                          onPressed: () => context.push(card.action!.route),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );

    if (!card.dismissible) return tile;

    return Dismissible(
      key: ValueKey(card.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDismiss(card),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: DriftSpacing.s5),
        decoration: BoxDecoration(
          color: colors.surfaceRaised,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(Icons.visibility_off_outlined, color: colors.textSecondary),
      ),
      child: tile,
    );
  }

  Color _accentColor(DriftColors colors, HomeCardAccent accent) =>
      switch (accent) {
        HomeCardAccent.urgent => colors.error,
        HomeCardAccent.info => colors.primary,
        HomeCardAccent.success => colors.success,
        HomeCardAccent.neutral => colors.border,
      };

  IconData _iconFor(String type) => switch (type) {
    'UNCONFIRMED_RESULT' => Icons.fact_check_outlined,
    'INCOMING_CHALLENGE' => Icons.sports_tennis,
    'LEAGUE_ROUND_DEADLINE' => Icons.timer_outlined,
    'UPCOMING_MATCH' => Icons.event_available_outlined,
    'PENDING_CONNECTION' => Icons.person_add_alt_1_outlined,
    'UNREAD_MESSAGES' => Icons.forum_outlined,
    'SUGGESTED_OPPONENTS' => Icons.groups_outlined,
    'DEVELOPMENT_RECOMMENDATION' => Icons.school_outlined,
    'NEARBY_COURTS' => Icons.place_outlined,
    'CLUB_ANNOUNCEMENT' => Icons.campaign_outlined,
    'ACHIEVEMENT_PROGRESS' => Icons.emoji_events_outlined,
    'NEWS_HIGHLIGHT' => Icons.article_outlined,
    'PADEL_PROMPT' => Icons.sports_tennis_outlined,
    _ => Icons.auto_awesome_outlined,
  };
}
