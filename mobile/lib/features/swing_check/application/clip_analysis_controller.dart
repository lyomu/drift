import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/l10n/l10n.dart';
import '../data/clip_pose_source.dart';
import '../data/pose_dump.dart';
import '../data/swing_check_repository.dart';
import '../domain/swing_session.dart';
import '../swing_check_config.dart';
import 'swing_check_providers.dart';

/// A recorded clip the player picked, with the setup they chose.
class SwingClipRequest {
  const SwingClipRequest({required this.setup, required this.path});
  final SwingCheckSetup setup;
  final String path;
}

enum ClipPhase { idle, analysing, saving, saved, failed, cancelled }

class ClipAnalysisState {
  const ClipAnalysisState({
    this.phase = ClipPhase.idle,
    this.progress = const ClipProgress(0, 0),
    this.analysis,
    this.savedId,
    this.error,
  });

  final ClipPhase phase;
  final ClipProgress progress;
  final SwingSessionAnalysis? analysis;
  final String? savedId;
  final String? error;

  ClipAnalysisState copyWith({
    ClipPhase? phase,
    ClipProgress? progress,
    SwingSessionAnalysis? analysis,
    String? savedId,
    String? error,
  }) => ClipAnalysisState(
    phase: phase ?? this.phase,
    progress: progress ?? this.progress,
    analysis: analysis ?? this.analysis,
    savedId: savedId ?? this.savedId,
    error: error,
  );
}

/// Drives one clip: native pose pass with progress, the same analysis as a
/// live session, then a save of the numbers. The clip itself never leaves the
/// phone; the landmarks are dropped once measured.
class ClipAnalysisController extends StateNotifier<ClipAnalysisState> {
  ClipAnalysisController(this._source, this._repository, this.request, {
    SwingAnalyzer analyzer = const SwingAnalyzer(),
  }) : _analyzer = analyzer,
       super(const ClipAnalysisState());

  final ClipPoseSource _source;
  final SwingCheckRepository _repository;
  final SwingAnalyzer _analyzer;
  final SwingClipRequest request;

  StreamSubscription<ClipProgress>? _progressSub;

  Future<void> start() async {
    if (state.phase != ClipPhase.idle) return;
    state = const ClipAnalysisState(phase: ClipPhase.analysing);
    _progressSub = _source.progress.listen((p) {
      if (mounted && state.phase == ClipPhase.analysing) {
        state = state.copyWith(progress: p);
      }
    });

    final ClipPoses poses;
    try {
      poses = await _source.analyse(request.path);
    } on ClipPoseException catch (e) {
      if (!mounted) return;
      state = e.error == ClipPoseError.cancelled
          ? state.copyWith(phase: ClipPhase.cancelled)
          : state.copyWith(phase: ClipPhase.failed, error: _message(e.error));
      return;
    } catch (_) {
      if (!mounted) return;
      state = state.copyWith(phase: ClipPhase.failed, error: l10nNow.swingClipFailed);
      return;
    } finally {
      // Not awaited: nothing below depends on the listener being gone.
      unawaited(_progressSub?.cancel());
      _progressSub = null;
    }
    if (!mounted) return;
    // Test builds only (DRIFT_POSE_DUMP); a no-op otherwise.
    unawaited(dumpClipPoses(poses, sampleFps: kClipSampleFps));

    if (poses.frames.isEmpty) {
      state = state.copyWith(phase: ClipPhase.failed, error: l10nNow.swingClipNoPerson);
      return;
    }

    final analysis = _analyzer.analyze(
      poses.frames,
      request.setup.stroke,
      request.setup.hand,
      source: SwingSource.clip,
      clip: ClipInfo(analysedMs: poses.analysedMs, truncated: poses.truncated),
    );
    if (analysis.detected == 0) {
      // Usually a rear view: the hitting wrist is hidden, so nothing peaks.
      state = state.copyWith(
        phase: ClipPhase.failed,
        error: l10nNow.swingClipNoneDetected,
      );
      return;
    }
    state = state.copyWith(phase: ClipPhase.saving, analysis: analysis);
    await _save(analysis);
  }

  Future<void> cancel() async {
    if (state.phase != ClipPhase.analysing) return;
    await _source.cancel();
  }

  Future<void> retrySave() async {
    final analysis = state.analysis;
    if (analysis == null || state.phase != ClipPhase.failed) return;
    state = state.copyWith(phase: ClipPhase.saving);
    await _save(analysis);
  }

  Future<void> _save(SwingSessionAnalysis analysis) async {
    try {
      final record = await _repository.save(analysis);
      if (!mounted) return;
      state = state.copyWith(phase: ClipPhase.saved, savedId: record.id);
    } on SwingCheckException catch (e) {
      if (!mounted) return;
      state = state.copyWith(phase: ClipPhase.failed, error: e.message);
    }
  }

  static String _message(ClipPoseError error) => switch (error) {
    ClipPoseError.unsupported => l10nNow.swingUnsupportedDevice,
    ClipPoseError.unreadable => l10nNow.swingClipUnreadable,
    ClipPoseError.cancelled || ClipPoseError.failed => l10nNow.swingClipFailed,
  };

  @override
  void dispose() {
    _progressSub?.cancel();
    if (state.phase == ClipPhase.analysing) _source.cancel();
    super.dispose();
  }
}

/// Overridable in tests with a fake.
final clipPoseSourceFactoryProvider = Provider<ClipPoseSource Function()>(
  (ref) => NativeClipPoseSource.new,
);

final clipAnalysisControllerProvider = StateNotifierProvider.autoDispose
    .family<ClipAnalysisController, ClipAnalysisState, SwingClipRequest>((ref, request) {
      return ClipAnalysisController(
        ref.watch(clipPoseSourceFactoryProvider)(),
        ref.watch(swingCheckRepositoryProvider),
        request,
      );
    });

/// Opens the phone's gallery for a video; null when the player backs out.
/// Overridable in tests.
final swingClipPickerProvider = Provider<Future<String?> Function()>((ref) {
  return () async {
    final picked = await ImagePicker().pickVideo(source: ImageSource.gallery);
    return picked?.path;
  };
});
