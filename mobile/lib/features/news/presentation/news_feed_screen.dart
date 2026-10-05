import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_typography.dart';
import '../application/news_providers.dart';
import '../data/news_repository.dart';
import '../../../core/theme/drift_colors.dart';

const _ink = Color(0xFF11271E);
const _muted = Color(0xFF718078);
const _green = Color(0xFF4D765F);
const _lime = Color(0xFFC7F34D);
const _deep = Color(0xFF19362B);
const _line = Color(0xFFDCE5DE);

const _categoryOptions = [
  (value: 'LATEST', label: 'Latest'),
  (value: 'PROFESSIONAL_TENNIS', label: 'Professional Tennis'),
  (value: 'PLAYERS', label: 'Players'),
  (value: 'TOURNAMENTS', label: 'Tournaments'),
  (value: 'LOCAL', label: 'Local'),
  (value: 'AFRICA', label: 'Africa'),
  (value: 'CLUBS', label: 'Clubs'),
  (value: 'COMMUNITY', label: 'Community'),
];

const _heroFallback =
    'https://images.unsplash.com/photo-1609264076154-3231eb5655a0'
    '?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=86&w=1400';

/// News Feed — the player-facing editorial feed and story discovery surface.
class NewsFeedScreen extends ConsumerWidget {
  const NewsFeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final feed = ref.watch(newsFeedProvider);
    final category = ref.watch(newsCategoryProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;

    Future<void> toggleSaved(StorySummary story) async {
      final repository = ref.read(newsRepositoryProvider);
      if (story.savedByViewer) {
        await repository.unsave(story.id);
      } else {
        await repository.save(story.id);
      }
      ref.invalidate(newsFeedProvider);
      ref.invalidate(savedStoriesProvider);
    }

    return Scaffold(
      backgroundColor: colors.surfaceRaised,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          color: _ink,
          backgroundColor: _lime,
          onRefresh: () => ref.refresh(newsFeedProvider.future),
          child: switch (feed) {
            AsyncData(:final value) => value.isEmpty
                ? _message(type, 'No stories in this category yet')
                : _FeedContent(
                    stories: value,
                    category: category,
                    onSave: toggleSaved,
                  ),
            AsyncError() => _message(
                type,
                "Couldn't load news. Pull to retry.",
              ),
            _ => Center(child: CircularProgressIndicator(color: _ink)),
          },
        ),
      ),
      bottomNavigationBar: const _NewsBottomNav(),
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
            style: type.body.copyWith(color: _muted),
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
    required this.onSave,
  });

  final List<StorySummary> stories;
  final String? category;
  final Future<void> Function(StorySummary story) onSave;

  @override
  Widget build(BuildContext context) {
    final hasHero = category == null && stories.isNotEmpty;
    final visibleStories = hasHero ? stories.skip(1).toList() : stories;
    final categoryLabel = category == null
        ? 'Curated for you'
        : _categoryLabel(category!);

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        if (hasHero) ...[
          _FeaturedStory(story: stories.first, onSave: onSave),
          SizedBox(height: 48),
        ] else
          SizedBox(height: 18),
        _SectionHeading(
          categoryLabel: categoryLabel,
          selectedCategory: category,
        ),
        SizedBox(height: 16),
        for (var i = 0; i < visibleStories.length; i++) ...[
          _StoryCard(story: visibleStories[i], onSave: onSave),
          if (i != visibleStories.length - 1) SizedBox(height: 16),
        ],
      ],
    );
  }
}

class _FeaturedStory extends StatelessWidget {
  const _FeaturedStory({required this.story, required this.onSave});

  final StorySummary story;
  final Future<void> Function(StorySummary story) onSave;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/news/${story.id}'),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: SizedBox(
          height: 350,
          child: Stack(
            fit: StackFit.expand,
            children: [
              _StoryImage(url: story.imageUrl ?? _heroFallback),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Color(0x14071910),
                      Color(0x1A071910),
                      Color(0xE6071910),
                    ],
                    stops: [0, .38, 1],
                  ),
                ),
              ),
              Positioned(
                left: 18,
                top: 18,
                child: Text(
                  '${_categoryLabel(story.categories.firstOrNull)} · Long read',
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
                        fontSize: 29,
                        height: 1.08,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    SizedBox(height: 18),
                    Row(
                      children: [
                        FilledButton(
                          onPressed: () => context.push('/news/${story.id}'),
                          style: FilledButton.styleFrom(
                            backgroundColor: _lime,
                            foregroundColor: _ink,
                            padding: EdgeInsets.fromLTRB(18, 12, 12, 12),
                            shape: const StadiumBorder(),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Read story',
                                style: TextStyle(fontWeight: FontWeight.w700),
                              ),
                              SizedBox(width: 10),
                              Container(
                                width: 27,
                                height: 27,
                                decoration: BoxDecoration(
                                  color: _ink,
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  Icons.north_east,
                                  size: 16,
                                  color: _lime,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
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
  });

  final String categoryLabel;
  final String? selectedCategory;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'FRESH OFF THE COURT',
                style: TextStyle(
                  color: _green,
                  fontFamily: 'Outfit',
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.5,
                ),
              ),
              SizedBox(height: 12),
              Text(
                'Latest stories',
                style: TextStyle(
                  color: _ink,
                  fontFamily: 'Outfit',
                  fontSize: 27,
                  height: 1.1,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        PopupMenuButton<String>(
          initialValue: selectedCategory ?? 'LATEST',
          onSelected: (value) => ref.read(newsCategoryProvider.notifier).state =
              value == 'LATEST' ? null : value,
          offset: Offset(0, 34),
          color: colors.background,
          itemBuilder: (context) => [
            for (final option in _categoryOptions)
              PopupMenuItem<String>(
                value: option.value,
                child: Text(option.label),
              ),
          ],
          child: Padding(
            padding: EdgeInsets.only(bottom: 2),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  categoryLabel,
                  style: TextStyle(
                    color: _muted,
                    fontFamily: 'Outfit',
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                SizedBox(width: 3),
                Icon(Icons.keyboard_arrow_down, size: 18, color: _muted),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _StoryCard extends StatelessWidget {
  const _StoryCard({required this.story, required this.onSave});

  final StorySummary story;
  final Future<void> Function(StorySummary story) onSave;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Material(
      color: colors.background,
      borderRadius: BorderRadius.circular(22),
      child: InkWell(
        onTap: () => context.push('/news/${story.id}'),
        borderRadius: BorderRadius.circular(22),
        child: Container(
          constraints: const BoxConstraints(minHeight: 226),
          padding: EdgeInsets.fromLTRB(20, 20, 20, 16),
          decoration: BoxDecoration(
            border: Border.all(color: _line),
            borderRadius: BorderRadius.circular(22),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _categoryLabel(story.categories.firstOrNull),
                    style: TextStyle(
                      color: _green,
                      fontFamily: 'Outfit',
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    _relativeDate(story.publicationDate),
                    style: TextStyle(
                      color: _muted,
                      fontFamily: 'Outfit',
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              SizedBox(height: 20),
              Text(
                story.headline,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: _ink,
                  fontFamily: 'Outfit',
                  fontSize: 20,
                  height: 1.25,
                  fontWeight: FontWeight.w500,
                ),
              ),
              SizedBox(height: 9),
              Text(
                story.highlight,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: _muted,
                  fontFamily: 'Outfit',
                  fontSize: 16,
                  height: 1.45,
                ),
              ),
              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${story.publisher} · Quick read',
                    style: TextStyle(
                      color: _muted,
                      fontFamily: 'Outfit',
                      fontSize: 13,
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
    return IconButton(
      onPressed: onPressed,
      tooltip: saved ? 'Remove from saved' : 'Save story',
      icon: Icon(
        saved ? Icons.bookmark : Icons.bookmark_border,
        size: 22,
        color: light ? Colors.white : _muted,
      ),
      style: IconButton.styleFrom(
        minimumSize: const Size(48, 48),
        backgroundColor: light
            ? const Color(0x3311271E)
            : (saved ? _lime : Colors.transparent),
        side: BorderSide(
          color: light ? const Color(0x66FFFFFF) : _line,
        ),
      ),
    );
  }
}

class _StoryImage extends StatelessWidget {
  const _StoryImage({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return Image.network(
      url,
      fit: BoxFit.cover,
      errorBuilder: (context, error, stackTrace) => Container(
        color: _deep,
        alignment: Alignment.center,
        child: Icon(Icons.sports_tennis, color: _lime, size: 52),
      ),
    );
  }
}

class _NewsBottomNav extends StatelessWidget {
  const _NewsBottomNav();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.fromLTRB(22, 8, 22, 12),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: _deep,
            borderRadius: BorderRadius.circular(28),
            boxShadow: const [
              BoxShadow(
                color: Color(0x26000000),
                blurRadius: 24,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            children: [
              _NavItem(
                icon: Icons.home_outlined,
                label: 'Home',
                onTap: () => context.go('/home'),
              ),
              const _NavItem(
                icon: Icons.article_outlined,
                label: 'News',
                selected: true,
              ),
              _NavItem(
                icon: Icons.bookmark_border,
                label: 'Saved',
                onTap: () => context.push('/news/saved'),
              ),
              _NavItem(
                icon: Icons.person_outline,
                label: 'Profile',
                onTap: () => context.push('/profile/own'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    this.selected = false,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Padding(
        padding: EdgeInsets.all(4),
        child: Material(
          color: selected ? _lime : Colors.transparent,
          borderRadius: BorderRadius.circular(22),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(22),
            child: SizedBox(
              height: 64,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, size: 22, color: selected ? _ink : Colors.white70),
                  SizedBox(height: 3),
                  Text(
                    label,
                    style: TextStyle(
                      color: selected ? _ink : Colors.white70,
                      fontFamily: 'Outfit',
                      fontSize: 11,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

String _categoryLabel(String? value) {
  if (value == null || value.isEmpty) return 'Stories';
  for (final option in _categoryOptions) {
    if (option.value == value) return option.label;
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
