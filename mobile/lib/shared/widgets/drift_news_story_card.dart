import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_spacing.dart';
import '../../core/theme/drift_typography.dart';
import '../../features/news/data/news_repository.dart';
import 'drift_card.dart';

/// Story Card — `foundation/05-design-system.md` has no dedicated spec row
/// for this (only Player/League/Court cards are named), so it follows the
/// starter-doc prompt's field list directly: headline, publisher, image
/// where permitted, short highlight, publication date, category, source.
/// Used by both News Feed and Saved Stories.
class DriftNewsStoryCard extends StatelessWidget {
  const DriftNewsStoryCard({super.key, required this.story, this.onTap});

  final StorySummary story;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (story.imageUrl != null) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                story.imageUrl!,
                height: 140,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) =>
                    const SizedBox.shrink(),
              ),
            ),
            const SizedBox(height: DriftSpacing.s3),
          ],
          Text(story.headline, style: type.title),
          const SizedBox(height: DriftSpacing.s1),
          Text(
            story.highlight,
            style: type.bodySmall.copyWith(color: colors.textSecondary),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: DriftSpacing.s2),
          Row(
            children: [
              Expanded(
                child: Text(
                  '${story.publisher} · ${_formatDate(story.publicationDate)}',
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
              ),
              if (story.savedByViewer)
                Icon(Icons.bookmark, size: 18, color: colors.primary),
            ],
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
