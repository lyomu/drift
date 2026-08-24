import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_news_story_card.dart';
import '../application/news_providers.dart';

/// Saved Stories — `foundation/04-screen-inventory.md` §A.8.
class SavedStoriesScreen extends ConsumerWidget {
  const SavedStoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(savedStoriesProvider);
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(title: const Text('Saved Stories')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(savedStoriesProvider.future),
          child: switch (saved) {
            AsyncData(:final value) =>
              value.isEmpty
                  ? ListView(
                      children: [
                        Padding(
                          padding: const EdgeInsets.all(DriftSpacing.s6),
                          child: Column(
                            children: [
                              const SizedBox(height: DriftSpacing.s12),
                              Icon(
                                Icons.bookmark_outline,
                                size: 40,
                                color: colors.textSecondary,
                              ),
                              const SizedBox(height: DriftSpacing.s3),
                              Text(
                                'Save stories to read later',
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
            AsyncError() => const Center(
              child: Text("Couldn't load saved stories."),
            ),
            _ => const Center(child: CircularProgressIndicator()),
          },
        ),
      ),
    );
  }
}
