import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../application/news_providers.dart';
import '../data/news_repository.dart';

/// News Story Detail / Highlight — `foundation/04-screen-inventory.md`
/// §A.8. There is no article body to render — the schema itself only
/// stores a short platform-generated highlight and a link to the original
/// (Doc 6 §2's republication rule). "Share" is deferred — it would need a
/// new `share_plus` dependency unjustified for one button this phase; "Open
/// Original Source" and "Save" are the real, built actions.
class NewsStoryDetailScreen extends ConsumerStatefulWidget {
  const NewsStoryDetailScreen({super.key, required this.storyId});

  final String storyId;

  @override
  ConsumerState<NewsStoryDetailScreen> createState() =>
      _NewsStoryDetailScreenState();
}

class _NewsStoryDetailScreenState extends ConsumerState<NewsStoryDetailScreen> {
  bool _isBusy = false;
  bool? _savedOverride;

  Future<void> _toggleSave(bool currentlySaved) async {
    setState(() => _isBusy = true);
    try {
      if (currentlySaved) {
        await ref.read(newsRepositoryProvider).unsave(widget.storyId);
      } else {
        await ref.read(newsRepositoryProvider).save(widget.storyId);
      }
      setState(() => _savedOverride = !currentlySaved);
      ref.invalidate(newsFeedProvider);
      ref.invalidate(savedStoriesProvider);
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  Future<void> _openSource(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) {
      _showBroken();
      return;
    }
    final opened = await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
    if (!opened && mounted) _showBroken();
  }

  void _showBroken() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('That source link looks broken.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final story = ref.watch(storyDetailProvider(widget.storyId));
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Scaffold(
      appBar: AppBar(title: const Text('Story')),
      body: SafeArea(
        child: switch (story) {
          AsyncData(:final value) => _Body(
            story: value,
            isBusy: _isBusy,
            savedOverride: _savedOverride,
            onToggleSave: _toggleSave,
            onOpenSource: () => _openSource(value.originalUrl),
          ),
          AsyncError() => Center(
            child: Text(
              'Story not available.',
              style: type.body.copyWith(color: colors.textSecondary),
            ),
          ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({
    required this.story,
    required this.isBusy,
    required this.savedOverride,
    required this.onToggleSave,
    required this.onOpenSource,
  });

  final StoryDetail story;
  final bool isBusy;
  final bool? savedOverride;
  final Future<void> Function(bool currentlySaved) onToggleSave;
  final VoidCallback onOpenSource;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final summary = story.summary;
    final saved = savedOverride ?? summary.savedByViewer;

    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s5),
      children: [
        if (summary.imageUrl != null) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.network(
              summary.imageUrl!,
              height: 180,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) =>
                  const SizedBox.shrink(),
            ),
          ),
          const SizedBox(height: DriftSpacing.s4),
        ],
        Text(summary.headline, style: type.h2),
        const SizedBox(height: DriftSpacing.s1),
        Text(
          '${summary.publisher} · ${_formatDate(summary.publicationDate)}',
          style: type.bodySmall.copyWith(color: colors.textSecondary),
        ),
        const SizedBox(height: DriftSpacing.s4),
        Text(summary.highlight, style: type.body),
        const SizedBox(height: DriftSpacing.s6),
        DriftButton(label: 'Open Original Source', onPressed: onOpenSource),
        const SizedBox(height: DriftSpacing.s2),
        DriftButton(
          label: isBusy ? 'Saving…' : (saved ? 'Remove from Saved' : 'Save'),
          variant: DriftButtonVariant.text,
          onPressed: isBusy ? null : () => onToggleSave(saved),
        ),
      ],
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
