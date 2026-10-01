import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../achievements/application/achievements_providers.dart';
import 'home_empty_state.dart';

/// "Your progress" — achievements earned so far and the next one to chase.
/// Reads the achievements list directly (always available) rather than the
/// feed card, which the server only sends once the user has earned one.
class ProgressSection extends ConsumerWidget {
  const ProgressSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final data = ref.watch(achievementsProvider).valueOrNull;

    if (data == null) return const SizedBox.shrink();

    final earned = data.earnedCount;
    final total = data.totalCount;
    final nextLocked = data.achievements
        .where((a) => a.state != 'EARNED')
        .firstOrNull;

    // The section header is supplied by the enclosing `HomeSectionPanel`.
    if (earned == 0) {
      return HomeEmptyState(
        icon: Icons.emoji_events_outlined,
        message:
            'Play matches and log practice to start earning achievements.',
        actionLabel: 'View',
        onAction: () => context.push('/profile/achievements'),
      );
    }

    const violet = Color(0xFF8B5CF6);

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/profile/achievements'),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                colors.primary.withValues(alpha: 0.06),
                violet.withValues(alpha: 0.06),
              ],
            ),
            border: Border.all(
              color: Color.alphaBlend(
                colors.primary.withValues(alpha: 0.18),
                colors.surface,
              ),
              width: 1.5,
            ),
          ),
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [colors.primary, violet],
                      ),
                    ),
                    child: const Icon(
                      Icons.military_tech_rounded,
                      size: 17,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Achievements',
                      style: type.body.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ),
                  Text(
                    '$earned / $total',
                    style: type.body.copyWith(
                      color: colors.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: Container(
                  height: 7,
                  color: Color.alphaBlend(
                    colors.primary.withValues(alpha: 0.18),
                    colors.surface,
                  ),
                  child: FractionallySizedBox(
                    alignment: Alignment.centerLeft,
                    widthFactor: total == 0
                        ? 0
                        : (earned / total).clamp(0.0, 1.0),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [colors.primary, violet],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              if (nextLocked != null) ...[
                const SizedBox(height: 10),
                Text.rich(
                  TextSpan(
                    children: [
                      const TextSpan(text: 'Next: '),
                      TextSpan(
                        text: nextLocked.title,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: colors.textPrimary,
                        ),
                      ),
                      TextSpan(text: ' — ${nextLocked.criteria}'),
                    ],
                  ),
                  style: type.caption.copyWith(
                    color: const Color(0xFF475569),
                    height: 1.5,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
