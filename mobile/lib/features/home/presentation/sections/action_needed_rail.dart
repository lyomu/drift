import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../shared/widgets/drift_section_header.dart';
import '../../application/home_feed_provider.dart';
import '../../data/home_repository.dart';

/// Horizontally-scrolling rail of urgent prompts (redesign 2026-10: each card
/// washed in its own accent rather than plain white). Each links to the screen
/// that resolves it (`card.action.route`).
class ActionNeededRail extends StatelessWidget {
  const ActionNeededRail({super.key, required this.cards});

  final List<HomeCard> cards;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: DriftSectionHeader(title: 'Needs you'),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 152,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: cards.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, i) => _ActionCard(card: cards[i]),
          ),
        ),
      ],
    );
  }
}

class _ActionCard extends ConsumerWidget {
  const _ActionCard({required this.card});

  final HomeCard card;

  /// Opens the card's screen. A dismissible card is cleared once it has been
  /// opened, so it doesn't sit on the rail afterwards. Challenges and results
  /// are not dismissible on the server (hiding them would leave the other
  /// player stuck), so they stay until they are resolved.
  Future<void> _open(BuildContext context, WidgetRef ref) async {
    // Push before refreshing: the refresh removes this card from the tree.
    context.push(card.action!.route);
    if (!card.dismissible) return;
    await ref.read(homeRepositoryProvider).dismissCard(card.id);
    ref.invalidate(homeFeedProvider);
    ref.invalidate(homeSummaryProvider);
  }

  /// The accent already travels with the card from the server, so the colour
  /// says the same thing here as it does anywhere else the card appears.
  (Color, IconData) _tone(DriftColors colors) => switch (card.accent) {
    HomeCardAccent.urgent => (colors.error, Icons.warning_rounded),
    HomeCardAccent.info => (colors.primary, Icons.check_circle_rounded),
    HomeCardAccent.success => (colors.success, Icons.check_circle_rounded),
    HomeCardAccent.neutral => (
      const Color(0xFFF97316),
      Icons.sports_tennis_rounded,
    ),
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final (accent, icon) = _tone(colors);
    final wash = Color.alphaBlend(
      accent.withValues(alpha: 0.06),
      colors.surface,
    );

    return SizedBox(
      width: 186,
      child: Material(
        color: wash,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: card.action == null
              ? null
              : () => _open(context, ref),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: accent.withValues(alpha: 0.13),
                width: 1.5,
              ),
            ),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: accent,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      BoxShadow(
                        color: accent.withValues(alpha: 0.25),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Icon(icon, size: 17, color: Colors.white),
                ),
                const SizedBox(height: 10),
                Text(
                  card.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    height: 1.3,
                    color: colors.textPrimary,
                  ),
                ),
                if (card.body.isNotEmpty) ...[
                  const SizedBox(height: 5),
                  Expanded(
                    child: Text(
                      card.body,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        height: 1.5,
                        color: colors.textSecondary,
                      ),
                    ),
                  ),
                ] else
                  const Spacer(),
                const SizedBox(height: 8),
                Text(
                  '${card.action?.label ?? 'Review'} →',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                    color: accent,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
