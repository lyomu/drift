import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../../shared/widgets/drift_news_story_card.dart';
import '../application/news_providers.dart';

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

/// News Feed — `foundation/04-screen-inventory.md` §A.8. "Follow topic" is
/// deferred (see PROGRESS.md) — topics have no controlled vocabulary and no
/// dedicated screen the way Saved Stories does, so only category filtering
/// and Save are built this phase.
class NewsFeedScreen extends ConsumerWidget {
  const NewsFeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feed = ref.watch(newsFeedProvider);
    final category = ref.watch(newsCategoryProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('News'),
        actions: [
          IconButton(
            onPressed: () => context.push('/news/saved'),
            icon: const Icon(Icons.bookmark_outline),
            tooltip: 'Saved Stories',
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                DriftSpacing.s4,
                DriftSpacing.s3,
                DriftSpacing.s4,
                0,
              ),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
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
                      const SizedBox(width: DriftSpacing.s2),
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
                        ? ListView(
                            children: [
                              Padding(
                                padding: const EdgeInsets.all(DriftSpacing.s6),
                                child: Column(
                                  children: [
                                    const SizedBox(height: DriftSpacing.s12),
                                    Text(
                                      'No stories in this category yet',
                                      style: type.body.copyWith(
                                        color: colors.textSecondary,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(DriftSpacing.s4),
                            itemCount: value.length,
                            separatorBuilder: (_, _) =>
                                const SizedBox(height: DriftSpacing.s3),
                            itemBuilder: (context, index) {
                              final story = value[index];
                              return DriftNewsStoryCard(
                                story: story,
                                onTap: () => context.push('/news/${story.id}'),
                              );
                            },
                          ),
                  AsyncError() => ListView(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(DriftSpacing.s6),
                        child: Column(
                          children: [
                            const SizedBox(height: DriftSpacing.s12),
                            Text(
                              "Couldn't load news.",
                              style: type.body,
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: DriftSpacing.s4),
                            DriftButton(
                              label: 'Retry',
                              variant: DriftButtonVariant.text,
                              onPressed: () => ref.invalidate(newsFeedProvider),
                            ),
                          ],
                        ),
                      ),
                    ],
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
}
