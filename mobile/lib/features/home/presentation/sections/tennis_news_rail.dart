import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../news/application/news_providers.dart';
import '../../../news/data/news_repository.dart';

const _ink = Color(0xFF0F172A);
const _subdued = Color(0xFF64748B);
const _muted = Color(0xFF94A3B8);

/// Category accents. Anything not listed falls back to the brand colour, so a
/// new category on the server renders correctly rather than uncoloured.
const _categoryAccents = <String, Color>{
  'ATP Tour': Color(0xFF1A7AFF),
  'WTA Tour': Color(0xFFEC4899),
  'Coaching': Color(0xFF8B5CF6),
  'Local': Color(0xFF22C55E),
  'Features': Color(0xFFF97316),
};

/// "Tennis news" carousel (redesign 2026-10: cover photo with a category pill
/// over it). Uses the news feed directly rather than the Home feed's story
/// card, which doesn't carry the category or date the card shows.
class TennisNewsRail extends ConsumerWidget {
  const TennisNewsRail({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stories = ref.watch(newsFeedProvider).valueOrNull;
    if (stories == null || stories.isEmpty) return const SizedBox.shrink();
    final top = stories.take(6).toList();

    return SizedBox(
      height: 232,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: top.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, i) => _StoryCard(story: top[i]),
      ),
    );
  }
}

class _StoryCard extends StatelessWidget {
  const _StoryCard({required this.story});

  final StorySummary story;

  /// "2h ago" / "5d ago" — the relative stamp the mock shows. Falls back to a
  /// date once a story is older than a week, where "9d ago" stops helping.
  static String _age(DateTime published) {
    final diff = DateTime.now().difference(published);
    if (diff.inMinutes < 60) return '${diff.inMinutes.clamp(1, 59)}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    final d = published.toLocal();
    return '${d.day}/${d.month}/${d.year}';
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final category = story.categories.isEmpty ? null : story.categories.first;
    final accent = _categoryAccents[category] ?? colors.primary;

    return SizedBox(
      width: 230,
      child: Material(
        color: colors.surface,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push('/news/${story.id}'),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: Color.alphaBlend(
                  colors.primary.withValues(alpha: 0.18),
                  colors.surface,
                ),
                width: 1.5,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _Cover(
                  imageUrl: story.imageUrl,
                  category: category,
                  accent: accent,
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            story.headline,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              height: 1.4,
                              color: _ink,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                story.publisher,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 11,
                                  height: 1.2,
                                  color: _subdued,
                                ),
                              ),
                            ),
                            const Text(
                              ' · ',
                              style: TextStyle(fontSize: 11, color: _muted),
                            ),
                            Text(
                              _age(story.publicationDate),
                              style: const TextStyle(
                                fontSize: 11,
                                height: 1.2,
                                color: _muted,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
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

class _Cover extends StatelessWidget {
  const _Cover({
    required this.imageUrl,
    required this.category,
    required this.accent,
  });

  final String? imageUrl;
  final String? category;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    // News images are absolute publisher URLs, not uploads, so they are used
    // as sent rather than going through `driftMediaUrl`.
    final url = imageUrl;

    Widget placeholder() => ColoredBox(
      color: accent.withValues(alpha: 0.1),
      child: Icon(
        Icons.article_rounded,
        size: 28,
        color: accent.withValues(alpha: 0.5),
      ),
    );

    return SizedBox(
      height: 120,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (url == null || url.isEmpty)
            placeholder()
          else
            Image.network(
              url,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => placeholder(),
            ),
          // Scrim: the pill sits on an unknown photo, so it needs its own
          // ground rather than relying on the image being dark enough.
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.bottomCenter,
                end: Alignment.topCenter,
                colors: [Color(0x8C000000), Color(0x00000000)],
                stops: [0.0, 0.55],
              ),
            ),
          ),
          if (category != null)
            Positioned(
              top: 8,
              left: 8,
              child: Container(
                decoration: BoxDecoration(
                  color: accent,
                  borderRadius: BorderRadius.circular(999),
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 9,
                  vertical: 3,
                ),
                child: Text(
                  category!,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    height: 1.2,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
