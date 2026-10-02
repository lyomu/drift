import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/video_analysis_repository.dart';

/// Where an upload has got to.
enum UploadPhase {
  idle,

  /// Bytes are going up. [UploadState.progress] is meaningful here.
  uploading,

  /// Upload finished; the server is running the precheck. Separated from
  /// [uploading] because a progress bar that sits at 100% while the server
  /// thinks reads as a stall, and this is a short but visible wait.
  checking,

  done,
  failed,
}

class UploadState {
  const UploadState({
    this.phase = UploadPhase.idle,
    this.progress = 0,
    this.job,
    this.error,
  });

  final UploadPhase phase;
  final double progress;
  final VideoAnalysisJob? job;
  final String? error;

  bool get isBusy =>
      phase == UploadPhase.uploading || phase == UploadPhase.checking;

  UploadState copyWith({
    UploadPhase? phase,
    double? progress,
    VideoAnalysisJob? job,
    String? error,
  }) {
    return UploadState(
      phase: phase ?? this.phase,
      progress: progress ?? this.progress,
      job: job ?? this.job,
      error: error,
    );
  }
}

class UploadController extends StateNotifier<UploadState> {
  UploadController(this._repository) : super(const UploadState());

  final VideoAnalysisRepository _repository;
  CancelToken? _cancelToken;

  Future<void> upload(String filePath) async {
    if (state.isBusy) return;

    _cancelToken = CancelToken();
    state = const UploadState(phase: UploadPhase.uploading);

    try {
      final job = await _repository.upload(
        filePath,
        cancelToken: _cancelToken,
        onProgress: (progress) {
          if (!mounted) return;
          state = state.copyWith(
            progress: progress,
            // The moment the last byte is sent, the wait becomes the server's.
            phase: progress >= 1
                ? UploadPhase.checking
                : UploadPhase.uploading,
          );
        },
      );
      if (!mounted) return;
      state = UploadState(phase: UploadPhase.done, progress: 1, job: job);
    } on VideoAnalysisException catch (error) {
      if (!mounted) return;
      state = UploadState(phase: UploadPhase.failed, error: error.message);
    } catch (error) {
      if (!mounted) return;
      if (error is DioException && CancelToken.isCancel(error)) {
        state = const UploadState();
        return;
      }
      state = const UploadState(
        phase: UploadPhase.failed,
        error: 'Something went wrong uploading that video. Please try again.',
      );
    }
  }

  void cancel() {
    _cancelToken?.cancel();
    _cancelToken = null;
    state = const UploadState();
  }

  void reset() => state = const UploadState();

  @override
  void dispose() {
    _cancelToken?.cancel();
    super.dispose();
  }
}

final uploadControllerProvider =
    StateNotifierProvider.autoDispose<UploadController, UploadState>((ref) {
      return UploadController(ref.watch(videoAnalysisRepositoryProvider));
    });

/// Whether the CV service can judge a clip right now, checked before offering
/// an upload so nobody spends mobile data on a clip nothing can look at.
final cvServiceStatusProvider = FutureProvider.autoDispose<CvServiceStatus>((
  ref,
) {
  return ref.watch(videoAnalysisRepositoryProvider).serviceStatus();
});

final videoJobsProvider = FutureProvider.autoDispose<List<VideoAnalysisJob>>((
  ref,
) {
  return ref.watch(videoAnalysisRepositoryProvider).list();
});

/// Watches one job, polling only while there is something to wait for.
///
/// Polling rather than a socket: an analysis takes minutes, finishes once, and
/// the app already learns about it by push. This exists for the case where
/// somebody is sitting on the screen watching, and it stops the moment the job
/// reaches a terminal state so a forgotten timer cannot sit there draining a
/// battery on a screen nobody is looking at.
class JobWatcher extends StateNotifier<AsyncValue<VideoAnalysisJob>> {
  JobWatcher(this._repository, this._jobId, VideoAnalysisJob? seed)
    : super(seed == null ? const AsyncValue.loading() : AsyncValue.data(seed)) {
    refresh();
  }

  final VideoAnalysisRepository _repository;
  final String _jobId;
  Timer? _timer;

  static const _interval = Duration(seconds: 5);

  Future<void> refresh() async {
    try {
      final job = await _repository.fetch(_jobId);
      if (!mounted) return;
      state = AsyncValue.data(job);
      _scheduleNext(job);
    } catch (error, stack) {
      if (!mounted) return;
      // Keep showing the last good state if we have one: a dropped poll is not
      // a reason to replace a result the person is reading with an error.
      if (!state.hasValue) state = AsyncValue.error(error, stack);
      _timer = Timer(_interval, refresh);
    }
  }

  Future<void> requestAnalysis() async {
    final job = await _repository.requestAnalysis(_jobId);
    if (!mounted) return;
    state = AsyncValue.data(job);
    _scheduleNext(job);
  }

  void _scheduleNext(VideoAnalysisJob job) {
    _timer?.cancel();
    if (job.isFinished) return;
    _timer = Timer(_interval, refresh);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

final jobWatcherProvider = StateNotifierProvider.autoDispose
    .family<JobWatcher, AsyncValue<VideoAnalysisJob>, String>((ref, jobId) {
      return JobWatcher(ref.watch(videoAnalysisRepositoryProvider), jobId, null);
    });
