import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_back_header.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../../shared/widgets/drift_soft_card.dart';
import '../application/news_providers.dart';
import '../data/news_repository.dart';

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

/// News Feed — `foundation/04-screen-inventory.md` §A.8 (redesign 2026-08:
/// `App.tsx` `NewsView`).
class NewsFeedScreen extends ConsumerWidget {
  const NewsFeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feed = ref.watch(newsFeedProvider);
    final category = ref.watch(newsCategoryProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            DriftBackHeader(
              title: 'News',
              trailing: DriftHeaderSquareButton(
                icon: Icons.bookmark_border,
                onTap: () => context.push('/news/saved'),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(0, 0, 0, 12),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    for (final option in _categoryOptions) ...[
                      DriftFilterChip(
                        label: option.label,
                        selected: category == option.value,
                        onTap: () =>
                            ref.read(newsCategoryProvider.notifier).state =
                                category == option.value ? null : option.value,
                      ),
                      const SizedBox(width: 8),
                    ],
                  ],
                ),
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => ref.refresh(newsFeedProvider.future),
                child: switch (feed) {
                  AsyncData(:final value) =>
                    value.isEmpty
                        ? _message(
                            type,
                            colors,
                            'No stories in this category yet',
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                            itemCount: value.length,
                            separatorBuilder: (_, _) =>
                                const SizedBox(height: 8),
                            itemBuilder: (context, i) =>
                                _ArticleCard(story: value[i]),
                          ),
                  AsyncError() => _message(
                    type,
                    colors,
                    "Couldn't load news. Pull to retry.",
                  ),
                  _ => const Center(child: CircularProgressIndicator()),
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _message(DriftTypography type, DriftColors colors, String text) {
    return ListView(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 64, 24, 24),
          child: Text(
            text,
            style: type.body.copyWith(color: colors.textSecondary),
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }
}

class _ArticleCard extends StatelessWidget {
  const _ArticleCard({required this.story});

  final StorySummary story;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return DriftSoftCard(
      padding: const EdgeInsets.all(16),
      onTap: () => context.push('/news/${story.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            story.headline,
            style: type.title.copyWith(
              fontWeight: FontWeight.w700,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            story.highlight,
            style: type.bodySmall.copyWith(
              color: colors.textSecondary,
              height: 1.5,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Text(
                  '${story.publisher} · ${story.publicationDate.day}/${story.publicationDate.month}/${story.publicationDate.year}',
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
              ),
              if (story.savedByViewer)
                Icon(Icons.bookmark, size: 16, color: colors.primary),
            ],
          ),
        ],
      ),
    );
  }
}
