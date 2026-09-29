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
