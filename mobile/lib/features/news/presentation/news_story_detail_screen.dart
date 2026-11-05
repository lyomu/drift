import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/news_providers.dart';
import '../data/news_repository.dart';
import 'news_article_reader.dart';

/// A Drift-owned reader shell around the publisher's original article.
///
/// Drift deliberately stores no republishable article body. The WebView keeps
/// the original publisher page and its attribution intact without sending the
/// player out to a separate browser app.
class NewsStoryDetailScreen extends ConsumerStatefulWidget {
  const NewsStoryDetailScreen({
    super.key,
    required this.storyId,
    this.readerControllerFactory = createArticleReaderController,
  });

  final String storyId;
  final ArticleReaderControllerFactory readerControllerFactory;

  @override
  ConsumerState<NewsStoryDetailScreen> createState() =>
      _NewsStoryDetailScreenState();
}

class _NewsStoryDetailScreenState extends ConsumerState<NewsStoryDetailScreen> {
  ArticleReaderController? _readerController;
  Uri? _readerUri;
  bool _isSaving = false;
  bool? _savedOverride;
  int _progress = 0;
  String? _readerError;

  Future<void> _toggleSave(bool currentlySaved) async {
    setState(() => _isSaving = true);
    try {
      if (currentlySaved) {
        await ref.read(newsRepositoryProvider).unsave(widget.storyId);
      } else {
        await ref.read(newsRepositoryProvider).save(widget.storyId);
      }
      if (!mounted) return;
      setState(() => _savedOverride = !currentlySaved);
      ref.invalidate(newsFeedProvider);
      ref.invalidate(newsPageProvider);
      ref.invalidate(savedStoriesProvider);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _handleBack() async {
    final controller = _readerController;
    if (controller != null && await controller.canGoBack()) {
      await controller.goBack();
      return;
    }
    if (mounted && context.canPop()) context.pop();
  }

  void _showBlockedNavigation(String _) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('That link cannot be opened safely inside Drift.'),
      ),
    );
  }

  ArticleReaderController _controllerFor(Uri uri) {
    if (_readerController != null && _readerUri == uri) {
      return _readerController!;
    }
    _readerUri = uri;
    _readerController = widget.readerControllerFactory(
      initialUri: uri,
      onProgress: (progress) {
        if (mounted) setState(() => _progress = progress);
      },
      onPageStarted: () {
        if (mounted) {
          setState(() {
            _progress = 0;
            _readerError = null;
          });
        }
      },
      onPageFinished: () {
        if (mounted) setState(() => _progress = 100);
      },
      onPageError: (message) {
        if (mounted) setState(() => _readerError = message);
      },
      onBlockedNavigation: _showBlockedNavigation,
    );
    return _readerController!;
  }

  Future<void> _retry() async {
    setState(() {
      _readerError = null;
      _progress = 0;
    });
    await _readerController?.reload();
  }

  @override
  Widget build(BuildContext context) {
    final story = ref.watch(storyDetailProvider(widget.storyId));
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final detail = story.valueOrNull;
    final saved = _savedOverride ?? detail?.summary.savedByViewer ?? false;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _handleBack();
      },
      child: DriftScaffold(
        title: detail?.summary.headline ?? 'Story',
        titleMaxLines: detail == null ? 1 : 2,
        titleStyle: type.h4,
        onBack: _handleBack,
        trailing: detail == null
            ? null
            : _ReaderSaveButton(
                saved: saved,
                busy: _isSaving,
                onPressed: () => _toggleSave(saved),
              ),
        body: switch (story) {
          AsyncData(:final value) => _buildReader(value, colors),
          AsyncError() => _ReaderMessage(
            message: 'Story not available.',
            detail: 'Go back and try opening it again.',
            onRetry: () => ref.invalidate(storyDetailProvider(widget.storyId)),
          ),
          _ => Center(child: CircularProgressIndicator(color: colors.primary)),
        },
      ),
    );
  }

  Widget _buildReader(StoryDetail story, DriftColors colors) {
    final uri = Uri.tryParse(story.originalUrl);
    if (uri == null || !isSafeArticleUri(uri)) {
      return const _ReaderMessage(
        message: 'Source link unavailable',
        detail: 'This article does not have a safe publisher link.',
      );
    }
    final controller = _controllerFor(uri);
    return Stack(
      fit: StackFit.expand,
      children: [
        if (_readerError == null)
          controller.buildView()
        else
          _ReaderMessage(
            message: 'Could not load this article',
            detail: 'Check your connection, then try again.',
            onRetry: _retry,
          ),
        if (_readerError == null && _progress < 100)
          Align(
            alignment: Alignment.topCenter,
            child: LinearProgressIndicator(
              value: _progress == 0 ? null : _progress / 100,
              minHeight: 3,
              color: colors.primary,
              backgroundColor: colors.primaryLight,
            ),
          ),
      ],
    );
  }
}

class _ReaderSaveButton extends StatelessWidget {
  const _ReaderSaveButton({
    required this.saved,
    required this.busy,
    required this.onPressed,
  });

  final bool saved;
  final bool busy;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Tooltip(
      message: saved ? 'Remove from saved' : 'Save story',
      child: IconButton(
        onPressed: busy ? null : onPressed,
        constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
        icon: busy
            ? SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: colors.primary,
                ),
              )
            : Icon(
                saved ? Icons.bookmark : Icons.bookmark_border,
                size: 18,
                color: saved ? colors.primary : colors.textSecondary,
              ),
      ),
    );
  }
}

class _ReaderMessage extends StatelessWidget {
  const _ReaderMessage({
    required this.message,
    required this.detail,
    this.onRetry,
  });

  final String message;
  final String detail;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.article_outlined, size: 32, color: colors.primary),
            const SizedBox(height: 12),
            Text(message, style: type.h4, textAlign: TextAlign.center),
            const SizedBox(height: 6),
            Text(
              detail,
              style: type.body.copyWith(color: colors.textSecondary),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              TextButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Try again'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
