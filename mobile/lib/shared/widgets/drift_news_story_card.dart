import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_spacing.dart';
import '../../core/theme/drift_typography.dart';
import '../../features/news/data/news_repository.dart';
import 'drift_news_image.dart';

/// Shared bordered story card used by article listing surfaces.
class DriftNewsStoryCard extends StatelessWidget {
  const DriftNewsStoryCard({super.key, required this.story, this.onTap});

  final StorySummary story;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Material(
      color: colors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: colors.border, width: 1.25),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DriftNewsImage(url: story.imageUrl, height: 140),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    story.headline,
                    style: type.title.copyWith(fontWeight: FontWeight.w700),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: DriftSpacing.s1),
                  Text(
                    story.highlight,
                    style: type.bodySmall.copyWith(color: colors.textSecondary),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: DriftSpacing.s3),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${story.publisher} · ${_formatDate(story.publicationDate)}',
                          style: type.caption.copyWith(
                            color: colors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (story.savedByViewer)
                        Icon(Icons.bookmark, size: 16, color: colors.primary),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
