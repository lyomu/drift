import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_card.dart';
import '../application/learning_providers.dart';
import '../data/learning_repository.dart';

/// Video Lesson Player - `foundation/04-screen-inventory.md` A.7.
class VideoLessonPlayerScreen extends ConsumerStatefulWidget {
  const VideoLessonPlayerScreen({super.key, required this.contentId});

  final String contentId;

  @override
  ConsumerState<VideoLessonPlayerScreen> createState() =>
      _VideoLessonPlayerScreenState();
}

class _VideoLessonPlayerScreenState
    extends ConsumerState<VideoLessonPlayerScreen> {
  VideoPlayerController? _controller;
  String? _activeUrl;
  bool _isInitializing = false;
  bool _isMarking = false;
  String? _playbackError;
  bool _completedPlayback = false;

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _ensureController(String url) async {
    if (_activeUrl == url || _isInitializing) return;
    setState(() {
      _isInitializing = true;
      _playbackError = null;
      _completedPlayback = false;
    });
    await _controller?.dispose();
    final controller = VideoPlayerController.networkUrl(Uri.parse(url));
    controller.addListener(_handleVideoTick);
    try {
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() {
        _controller = controller;
        _activeUrl = url;
      });
    } catch (_) {
      await controller.dispose();
      if (mounted) {
        setState(() => _playbackError = 'Playback error. Please retry.');
      }
    } finally {
      if (mounted) setState(() => _isInitializing = false);
    }
  }

  void _handleVideoTick() {
    if (!mounted) return;
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    final duration = controller.value.duration;
    final position = controller.value.position;
    if (duration.inMilliseconds > 0 &&
        position >= duration &&
        !_completedPlayback) {
      setState(() => _completedPlayback = true);
    }
  }

  Future<void> _retry(String url) async {
    setState(() {
      _activeUrl = null;
      _playbackError = null;
    });
    await _ensureController(url);
  }

  Future<void> _markComplete() async {
    setState(() => _isMarking = true);
    try {
      await ref
          .read(learningRepositoryProvider)
          .markContentComplete(widget.contentId);
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Lesson marked complete.')));
    } finally {
      if (mounted) setState(() => _isMarking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final content = ref.watch(contentDetailProvider(widget.contentId));

    return Scaffold(
      appBar: AppBar(title: const Text('Video lesson')),
      body: SafeArea(
        child: switch (content) {
          AsyncData(:final value) => _Body(
            content: value,
            controller: _controller,
            isInitializing: _isInitializing,
            playbackError: _playbackError,
            completedPlayback: _completedPlayback,
            isMarking: _isMarking,
            onLoad: _ensureController,
            onRetry: _retry,
            onMarkComplete: _markComplete,
            onTogglePlay: () {
              final controller = _controller;
              if (controller == null) return;
              controller.value.isPlaying
                  ? controller.pause()
                  : controller.play();
              setState(() {});
            },
          ),
          AsyncError() => const Center(child: Text('Video lesson not found.')),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _Body extends StatefulWidget {
  const _Body({
    required this.content,
    required this.controller,
    required this.isInitializing,
    required this.playbackError,
    required this.completedPlayback,
    required this.isMarking,
    required this.onLoad,
    required this.onRetry,
    required this.onMarkComplete,
    required this.onTogglePlay,
  });

  final ContentDetail content;
  final VideoPlayerController? controller;
  final bool isInitializing;
  final String? playbackError;
  final bool completedPlayback;
  final bool isMarking;
  final Future<void> Function(String url) onLoad;
  final Future<void> Function(String url) onRetry;
  final VoidCallback onMarkComplete;
  final VoidCallback onTogglePlay;

  @override
  State<_Body> createState() => _BodyState();
}

class _BodyState extends State<_Body> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void didUpdateWidget(covariant _Body oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.content.videoUrl != widget.content.videoUrl) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _load());
    }
  }

  void _load() {
    final url = widget.content.videoUrl;
    if (url != null) widget.onLoad(url);
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final url = widget.content.videoUrl;
    final controller = widget.controller;

    return ListView(
      padding: const EdgeInsets.all(DriftSpacing.s5),
      children: [
        Text(widget.content.summary.title, style: type.h2),
        const SizedBox(height: DriftSpacing.s4),
        DriftCard(
          child: AspectRatio(
            aspectRatio: controller?.value.isInitialized == true
                ? controller!.value.aspectRatio
                : 16 / 9,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: colors.textPrimary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: _playerState(context, url, controller),
            ),
          ),
        ),
        const SizedBox(height: DriftSpacing.s4),
        if (widget.completedPlayback)
          DriftCard(
            child: Row(
              children: [
                Icon(Icons.check_circle_outline, color: colors.success),
                const SizedBox(width: DriftSpacing.s3),
                Expanded(
                  child: Text(
                    'Playback completed. Mark the lesson complete when you are ready.',
                    style: type.body,
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: DriftSpacing.s4),
        DriftButton(
          label: widget.isMarking ? 'Marking...' : 'Mark Complete',
          onPressed: widget.isMarking ? null : widget.onMarkComplete,
        ),
      ],
    );
  }

  Widget _playerState(
    BuildContext context,
    String? url,
    VideoPlayerController? controller,
  ) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    if (url == null) {
      return Center(
        child: Text(
          'No video asset is attached to this lesson.',
          style: type.body.copyWith(color: Colors.white),
          textAlign: TextAlign.center,
        ),
      );
    }
    if (widget.playbackError != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              widget.playbackError!,
              style: type.body.copyWith(color: Colors.white),
            ),
            const SizedBox(height: DriftSpacing.s3),
            TextButton(
              onPressed: () => widget.onRetry(url),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }
    if (widget.isInitializing || controller?.value.isInitialized != true) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: DriftSpacing.s3),
            Text(
              'Buffering video...',
              style: type.body.copyWith(color: Colors.white),
            ),
          ],
        ),
      );
    }

    return Stack(
      alignment: Alignment.center,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: VideoPlayer(controller!),
        ),
        if (controller.value.isBuffering)
          const CircularProgressIndicator()
        else
          IconButton.filled(
            onPressed: widget.onTogglePlay,
            icon: Icon(
              controller.value.isPlaying ? Icons.pause : Icons.play_arrow,
            ),
            color: colors.primaryDark,
            tooltip: controller.value.isPlaying ? 'Pause' : 'Play',
          ),
      ],
    );
  }
}
