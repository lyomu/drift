import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/drift_section_header.dart';
import '../../../../shared/widgets/drift_soft_card.dart';
import '../../data/home_repository.dart';

/// Horizontally-scrolling rail of urgent prompts. Each card links to the
/// screen that resolves it (`card.action.route`).
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
          child: DriftSectionHeader(title: 'Action needed'),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 132,
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

class _ActionCard extends StatelessWidget {
  const _ActionCard({required this.card});

  final HomeCard card;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final accent = card.accent == HomeCardAccent.urgent
        ? colors.error
        : colors.warning;

    return SizedBox(
      width: 158,
      child: DriftSoftCard(
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        onTap: card.action == null
            ? null
            : () => context.push(card.action!.route),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              card.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: type.bodySmall.copyWith(
                color: colors.textPrimary,
                fontWeight: FontWeight.w700,
                height: 1.3,
              ),
            ),
            if (card.body.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                card.body,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: type.caption.copyWith(color: colors.textSecondary),
              ),
            ],
            const Spacer(),
            Text(
              '${card.action?.label ?? 'Review'} →',
              style: type.caption.copyWith(
                color: accent,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
