import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/news_providers.dart';
import '../data/news_repository.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../shared/widgets/drift_news_image.dart';

/// News Feed — the player-facing editorial feed and story discovery surface.
class NewsFeedScreen extends ConsumerStatefulWidget {
  const NewsFeedScreen({super.key});

  @override
  ConsumerState<NewsFeedScreen> createState() => _NewsFeedScreenState();
}

class _NewsFeedScreenState extends ConsumerState<NewsFeedScreen> {
  String? _seenCategory;
  List<StorySummary> _more = [];
  String? _nextCursor;
  bool _hasLoadedMore = false;
  bool _loadingMore = false;
  String? _loadError;

  Future<void> _loadMore(String? firstCursor, String? category) async {
    final cursor = _hasLoadedMore ? _nextCursor : firstCursor;
    if (cursor == null || _loadingMore) return;
    setState(() {
      _loadingMore = true;
      _loadError = null;
    });
    try {
      final page = await ref
          .read(newsRepositoryProvider)
          .browsePage(category: category, cursor: cursor);
      if (!mounted || _seenCategory != category) return;
      setState(() {
        final seen = _more.map((s) => s.id).toSet();
        _more = [..._more, ...page.stories.where((s) => seen.add(s.id))];
        _nextCursor = page.nextCursor;
        _hasLoadedMore = true;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _loadError = 'Could not load more stories. Try again.');
      }
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _refresh() async {
    setState(() {
      _more = [];
      _nextCursor = null;
      _hasLoadedMore = false;
      _loadError = null;
    });
    final _ = await ref.refresh(newsPageProvider.future);
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final feed = ref.watch(newsPageProvider);
    final categories =
        ref.watch(newsCategoriesProvider).valueOrNull ??
        const [NewsCategoryOption(slug: 'LATEST', label: 'Latest')];
    final category = ref.watch(newsCategoryProvider);
    if (category != null &&
        ref.watch(newsCategoriesProvider) is AsyncData &&
        !categories.any((option) => option.slug == category)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) ref.read(newsCategoryProvider.notifier).state = null;
      });
    }
    if (_seenCategory != category) {
      _seenCategory = category;
      _more = [];
      _nextCursor = null;
      _hasLoadedMore = false;
      _loadError = null;
    }
    final type = Theme.of(context).extension<DriftTypography>()!;

    Future<void> toggleSaved(StorySummary story) async {
      final repository = ref.read(newsRepositoryProvider);
      if (story.savedByViewer) {
        await repository.unsave(story.id);
      } else {
        await repository.save(story.id);
      }
      ref.invalidate(newsFeedProvider);
      ref.invalidate(newsPageProvider);
      ref.invalidate(savedStoriesProvider);
    }

    return DriftScaffold(
      title: 'News',
      onBack: () => context.canPop() ? context.pop() : context.go('/home'),
      trailing: Tooltip(
        message: 'Saved stories',
        child: DriftHeaderSquareButton(
          icon: Icons.bookmark_outline,
          onTap: () => context.push('/news/saved'),
        ),
      ),
      body: RefreshIndicator(
        color: colors.primary,
        backgroundColor: colors.surface,
        onRefresh: _refresh,
        child: switch (feed) {
          AsyncData(:final value) =>
            value.stories.isEmpty
                ? _message(type, 'No stories in this category yet')
                : _FeedContent(
                    stories: [
                      ...value.stories,
                      ..._more.where(
                        (s) => !value.stories.any((first) => first.id == s.id),
                      ),
                    ],
                    category: category,
                    categories: categories,
                    onSave: toggleSaved,
                    cachedAt: value.fromCache ? value.cachedAt : null,
                    canLoadMore:
                        !value.fromCache &&
                        (_hasLoadedMore
                            ? _nextCursor != null
                            : value.nextCursor != null),
                    loadingMore: _loadingMore,
                    loadError: _loadError,
                    onLoadMore: () => _loadMore(value.nextCursor, category),
                  ),
          AsyncError() => _message(type, "Couldn't load news. Pull to retry."),
          _ => Center(child: CircularProgressIndicator(color: colors.primary)),
        },
      ),
    );
  }

  Widget _message(DriftTypography type, String text) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(24, 100, 24, 24),
          child: Text(
            text,
            style: type.body.copyWith(
              color: Theme.of(context).extension<DriftColors>()!.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }
}

class _FeedContent extends StatelessWidget {
  const _FeedContent({
    required this.stories,
    required this.category,
    required this.categories,
    required this.onSave,
    required this.cachedAt,
    required this.canLoadMore,
    required this.loadingMore,
    required this.loadError,
    required this.onLoadMore,
  });

  final List<StorySummary> stories;
  final String? category;
  final List<NewsCategoryOption> categories;
  final Future<void> Function(StorySummary story) onSave;
  final DateTime? cachedAt;
  final bool canLoadMore;
  final bool loadingMore;
  final String? loadError;
  final VoidCallback onLoadMore;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final hasHero = category == null && stories.isNotEmpty;
    final visibleStories = hasHero ? stories.skip(1).toList() : stories;
    final categoryLabel = category == null
        ? 'Curated for you'
        : _categoryLabel(category!, categories);

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        if (cachedAt != null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'Offline news saved ${cachedAt!.toLocal()}',
              style: TextStyle(color: colors.textSecondary, fontSize: 12),
            ),
          ),
        if (hasHero) ...[
          _FeaturedStory(
            story: stories.first,
            onSave: onSave,
            categories: categories,
          ),
          SizedBox(height: 48),
        ] else
          SizedBox(height: 18),
        _SectionHeading(
          categoryLabel: categoryLabel,
          selectedCategory: category,
          categories: categories,
        ),
        SizedBox(height: 16),
        for (var i = 0; i < visibleStories.length; i++) ...[
          _StoryCard(
            story: visibleStories[i],
            onSave: onSave,
            categories: categories,
          ),
          if (i != visibleStories.length - 1) SizedBox(height: 20),
        ],
        if (loadError != null)
          Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Text(
              loadError!,
              style: TextStyle(color: colors.textSecondary),
            ),
          ),
        if (canLoadMore)
          Padding(
            padding: const EdgeInsets.only(top: 20),
            child: Center(
              child: TextButton(
                onPressed: loadingMore ? null : onLoadMore,
                child: Text(loadingMore ? 'Loading…' : 'Load more stories'),
              ),
            ),
          ),
      ],
    );
  }
}

class _FeaturedStory extends StatelessWidget {
  const _FeaturedStory({
    required this.story,
    required this.onSave,
    required this.categories,
  });

  final StorySummary story;
  final Future<void> Function(StorySummary story) onSave;
  final List<NewsCategoryOption> categories;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return GestureDetector(
      onTap: () => context.push('/news/${story.id}'),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: SizedBox(
          height: MediaQuery.textScalerOf(context).scale(1) > 1.4 ? 470 : 350,
          child: Stack(
            fit: StackFit.expand,
            children: [
              _StoryImage(url: story.imageUrl),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      const Color(0x14000000),
                      const Color(0x33000000),
                      const Color(0xD9000000),
                    ],
                    stops: [0, .38, 1],
                  ),
                ),
              ),
              Positioned(
                left: 18,
                top: 18,
                child: Text(
                  _categoryLabel(story.categories.firstOrNull, categories),
                  style: TextStyle(
                    color: Colors.white,
                    fontFamily: 'Outfit',
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Positioned(
                left: 24,
                right: 24,
                bottom: 24,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      story.headline,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Colors.white,
                        fontFamily: 'Outfit',
                        fontSize: 24,
                        height: 1.16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(height: 18),
                    Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        FilledButton(
                          onPressed: () => context.push('/news/${story.id}'),
                          style: FilledButton.styleFrom(
                            backgroundColor: colors.primary,
                            foregroundColor: Colors.white,
                            padding: EdgeInsets.fromLTRB(18, 12, 12, 12),
                            shape: const StadiumBorder(),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                MediaQuery.textScalerOf(context).scale(1) > 1.4
                                    ? 'Read'
                                    : 'Read story',
                                style: TextStyle(fontWeight: FontWeight.w700),
                              ),
                              if (MediaQuery.textScalerOf(context).scale(1) <=
                                  1.4) ...[
                                SizedBox(width: 10),
                                Container(
                                  width: 27,
                                  height: 27,
                                  decoration: BoxDecoration(
                                    color: colors.primaryDark,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    Icons.north_east,
                                    size: 16,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        _SaveButton(
                          saved: story.savedByViewer,
                          onPressed: () => onSave(story),
                          light: true,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionHeading extends ConsumerWidget {
  const _SectionHeading({
    required this.categoryLabel,
    required this.selectedCategory,
    required this.categories,
  });

  final String categoryLabel;
  final String? selectedCategory;
  final List<NewsCategoryOption> categories;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final heading = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'FRESH OFF THE COURT',
          style: TextStyle(
            color: colors.primaryDark,
            fontFamily: 'Outfit',
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
        SizedBox(height: 12),
        Text(
          'Latest stories',
          style: TextStyle(
            color: colors.textPrimary,
            fontFamily: 'Outfit',
            fontSize: 27,
            height: 1.1,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
    final filter = PopupMenuButton<String>(
      initialValue: selectedCategory ?? 'LATEST',
      onSelected: (value) => ref.read(newsCategoryProvider.notifier).state =
          value == 'LATEST' ? null : value,
      offset: Offset(0, 34),
      color: colors.background,
      itemBuilder: (context) => [
        for (final option in categories)
          PopupMenuItem<String>(value: option.slug, child: Text(option.label)),
      ],
      child: Padding(
        padding: EdgeInsets.only(bottom: 2),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.sizeOf(context).width - 64,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(
                  categoryLabel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: colors.textSecondary,
                    fontFamily: 'Outfit',
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              SizedBox(width: 3),
              Icon(
                Icons.keyboard_arrow_down,
                size: 18,
                color: colors.textSecondary,
              ),
            ],
          ),
        ),
      ),
    );
    if (MediaQuery.textScalerOf(context).scale(1) > 1.4) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [heading, const SizedBox(height: 12), filter],
      );
    }
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(child: heading),
        filter,
      ],
    );
  }
}

class _StoryCard extends StatelessWidget {
  const _StoryCard({
    required this.story,
    required this.onSave,
    required this.categories,
  });

  final StorySummary story;
  final Future<void> Function(StorySummary story) onSave;
  final List<NewsCategoryOption> categories;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Material(
      color: colors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: colors.border, width: 1.25),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/news/${story.id}'),
        borderRadius: BorderRadius.circular(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 148,
              width: double.infinity,
              child: _StoryImage(url: story.imageUrl),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _categoryLabel(
                            story.categories.firstOrNull,
                            categories,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: colors.primaryDark,
                            fontFamily: 'Outfit',
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        _relativeDate(story.publicationDate),
                        style: TextStyle(
                          color: colors.textSecondary,
                          fontFamily: 'Outfit',
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    story.headline,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: colors.textPrimary,
                      fontFamily: 'Outfit',
                      fontSize: 18,
                      height: 1.28,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    story.highlight,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: colors.textSecondary,
                      fontFamily: 'Outfit',
                      fontSize: 14,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${story.publisher} · Quick read',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: colors.textSecondary,
                            fontFamily: 'Outfit',
                            fontSize: 12,
                          ),
                        ),
                      ),
                      _SaveButton(
                        saved: story.savedByViewer,
                        onPressed: () => onSave(story),
                      ),
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
}

class _SaveButton extends StatelessWidget {
  const _SaveButton({
    required this.saved,
    required this.onPressed,
    this.light = false,
  });

  final bool saved;
  final VoidCallback onPressed;
  final bool light;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return IconButton(
      onPressed: onPressed,
      tooltip: saved ? 'Remove from saved' : 'Save story',
      icon: Icon(
        saved ? Icons.bookmark : Icons.bookmark_border,
        size: 18,
        color: light ? Colors.white : colors.textSecondary,
      ),
      style: IconButton.styleFrom(
        minimumSize: const Size(48, 48),
        backgroundColor: light
            ? const Color(0x33000000)
            : (saved ? colors.primaryLight : Colors.transparent),
        side: BorderSide(
          color: light ? const Color(0x66FFFFFF) : colors.border,
        ),
      ),
    );
  }
}

class _StoryImage extends StatelessWidget {
  const _StoryImage({required this.url});

  final String? url;

  @override
  Widget build(BuildContext context) => DriftNewsImage(url: url);
}

String _categoryLabel(String? value, List<NewsCategoryOption> categories) {
  if (value == null || value.isEmpty) return 'Stories';
  for (final option in categories) {
    if (option.slug == value) return option.label;
  }
  return value
      .toLowerCase()
      .split('_')
      .map(
        (word) => word.isEmpty
            ? word
            : '${word[0].toUpperCase()}${word.substring(1)}',
      )
      .join(' ');
}

String _relativeDate(DateTime date) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final published = DateTime(date.year, date.month, date.day);
  final days = today.difference(published).inDays;
  if (days <= 0) return 'Recently';
  if (days == 1) return 'Yesterday';
  if (days < 7) return '${days}d ago';
  return '${date.day}/${date.month}/${date.year}';
}
