import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/drift_pill.dart';
import '../../../../shared/widgets/drift_section_header.dart';
import '../../../../shared/widgets/drift_soft_card.dart';
import '../../../news/application/news_providers.dart';

/// "Tennis news" carousel. Uses the news feed directly rather than the Home
/// feed's story card, which doesn't carry the tag or date the card shows.
class TennisNewsRail extends ConsumerWidget {
  const TennisNewsRail({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final stories = ref.watch(newsFeedProvider).valueOrNull;

    if (stories == null || stories.isEmpty) return const SizedBox.shrink();
    final top = stories.take(6).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: DriftSectionHeader(
            title: 'Tennis news',
            actionLabel: 'See all',
            onAction: () => context.push('/news'),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 150,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: top.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, i) {
              final story = top[i];
              final date = story.publicationDate.toLocal();
              return SizedBox(
                width: 210,
                child: DriftSoftCard(
                  padding: const EdgeInsets.all(14),
                  onTap: () => context.push('/news/${story.id}'),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (story.categories.isNotEmpty)
                        DriftPill(label: story.categories.first),
                      const SizedBox(height: 6),
                      Expanded(
                        child: Text(
                          story.headline,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: type.bodySmall.copyWith(
                            fontWeight: FontWeight.w700,
                            height: 1.4,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${story.publisher} · ${date.day}/${date.month}/${date.year}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: type.caption.copyWith(
                          color: colors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
