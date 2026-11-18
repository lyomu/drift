import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../data/pose_source.dart';
import '../data/swing_check_repository.dart';
import '../domain/pose_frame.dart';
import '../domain/swing_detector.dart';
import '../domain/swing_metrics.dart';
import '../domain/swing_session.dart';
import '../swing_check_config.dart';

/// What the setup screen chose, passed to capture.
class SwingCheckSetup {
  const SwingCheckSetup({required this.stroke, required this.hand});
  final SwingStroke stroke;
  final HittingHand hand;
}

/// What the framing chip tells the player while filming.
enum FramingStatus { noPerson, armHidden, bodyCut, good }

enum CapturePhase { idle, starting, recording, saving, saved, failed }

class CaptureState {
  const CaptureState({
    this.phase = CapturePhase.idle,
    this.framing = FramingStatus.noPerson,
    this.swingsSoFar = 0,
    this.elapsed = Duration.zero,
    this.latestFrame,
    this.analysis,
    this.savedId,
    this.error,
  });

  final CapturePhase phase;
  final FramingStatus framing;
  final int swingsSoFar;
  final Duration elapsed;
  final PoseFrame? latestFrame;
  final SwingSessionAnalysis? analysis;
  final String? savedId;
  final String? error;

  CaptureState copyWith({
    CapturePhase? phase,
    FramingStatus? framing,
    int? swingsSoFar,
    Duration? elapsed,
    PoseFrame? latestFrame,
    SwingSessionAnalysis? analysis,
    String? savedId,
    String? error,
  }) => CaptureState(
    phase: phase ?? this.phase,
    framing: framing ?? this.framing,
    swingsSoFar: swingsSoFar ?? this.swingsSoFar,
    elapsed: elapsed ?? this.elapsed,
    latestFrame: latestFrame ?? this.latestFrame,
    analysis: analysis ?? this.analysis,
    savedId: savedId ?? this.savedId,
    error: error,
  );
}

/// Drives one capture: camera on, frames collected, live swing count and
/// framing hints, then analysis on stop and a save of the numbers.
class CaptureController extends StateNotifier<CaptureState> {
  CaptureController(this._source, this._repository, this.setup, {
    SwingAnalyzer analyzer = const SwingAnalyzer(),
  }) : _analyzer = analyzer,
       super(const CaptureState());

  final PoseSource _source;
  final SwingCheckRepository _repository;
  final SwingAnalyzer _analyzer;
  final SwingCheckSetup setup;

  final List<PoseFrame> _frames = [];
  StreamSubscription<PoseFrame>? _sub;
  Timer? _ticker;
  final _clock = Stopwatch();

  PoseSource get source => _source;

  Future<void> start() async {
    if (state.phase != CapturePhase.idle && state.phase != CapturePhase.failed) {
      return;
    }
    _frames.clear();
    state = const CaptureState(phase: CapturePhase.starting);
    try {
      _sub = _source.frames.listen(_onFrame);
      await _source.start();
    } on PoseSourceException catch (e) {
      if (!mounted) return;
      state = CaptureState(
        phase: CapturePhase.failed,
        error: switch (e.error) {
          PoseSourceError.unsupported => l10nNow.swingUnsupportedDevice,
          PoseSourceError.permissionDenied => l10nNow.swingCameraDenied,
          PoseSourceError.noCamera => l10nNow.swingNoCamera,
          PoseSourceError.failed => l10nNow.swingCameraFailed,
        },
      );
      return;
    } catch (_) {
      if (!mounted) return;
      state = CaptureState(
        phase: CapturePhase.failed,
        error: l10nNow.swingCameraFailed,
      );
      return;
    }
    if (!mounted) return;
    _clock
      ..reset()
      ..start();
    state = state.copyWith(phase: CapturePhase.recording);
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _onFrame(PoseFrame frame) {
    if (!mounted || state.phase != CapturePhase.recording) return;
    _frames.add(frame);
    state = state.copyWith(latestFrame: frame, framing: framingOf(frame, setup.hand));
  }

  void _tick() {
    if (!mounted || state.phase != CapturePhase.recording) return;
    final count = const SwingDetector().detect(_frames, setup.hand).length;
    state = state.copyWith(elapsed: _clock.elapsed, swingsSoFar: count);
    if (_clock.elapsed >= kMaxCaptureDuration) stop();
  }

  /// Stops filming, analyses, and saves the numbers if any swing was found.
  Future<void> stop() async {
    if (state.phase != CapturePhase.recording) return;
    _ticker?.cancel();
    _clock.stop();
    await _source.stop();
    await _sub?.cancel();
    if (!mounted) return;

    final analysis = _analyzer.analyze(_frames, setup.stroke, setup.hand);
    // The frames held landmarks; they're no longer needed once measured.
    _frames.clear();
    state = state.copyWith(phase: CapturePhase.saving, analysis: analysis);
    await _save(analysis);
  }

  Future<void> retrySave() async {
    final analysis = state.analysis;
    if (analysis == null || state.phase != CapturePhase.failed) return;
    state = state.copyWith(phase: CapturePhase.saving);
    await _save(analysis);
  }

  Future<void> _save(SwingSessionAnalysis analysis) async {
    if (analysis.detected == 0) {
      state = state.copyWith(phase: CapturePhase.failed, error: l10nNow.swingNoneDetected);
      return;
    }
    try {
      final record = await _repository.save(analysis);
      if (!mounted) return;
      state = state.copyWith(phase: CapturePhase.saved, savedId: record.id);
    } on SwingCheckException catch (e) {
      if (!mounted) return;
      state = state.copyWith(phase: CapturePhase.failed, error: e.message);
    }
  }

  /// What's missing from the frame right now, most important first.
  static FramingStatus framingOf(PoseFrame frame, HittingHand hand) {
    if (frame.reliable(PoseJoint.leftShoulder) == null &&
        frame.reliable(PoseJoint.rightShoulder) == null) {
      return FramingStatus.noPerson;
    }
    if (frame.reliable(hand.elbow) == null || frame.reliable(hand.wrist) == null) {
      return FramingStatus.armHidden;
    }
    const body = [
      PoseJoint.leftHip,
      PoseJoint.rightHip,
      PoseJoint.leftKnee,
      PoseJoint.rightKnee,
      PoseJoint.leftAnkle,
      PoseJoint.rightAnkle,
      PoseJoint.nose,
    ];
    if (body.any((j) => frame.reliable(j) == null)) return FramingStatus.bodyCut;
    return FramingStatus.good;
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _sub?.cancel();
    _source.dispose();
    super.dispose();
  }
}

/// Overridable in tests with a fake.
final poseSourceFactoryProvider = Provider<PoseSource Function()>(
  (ref) => CameraPoseSource.new,
);
final captureControllerProvider = StateNotifierProvider.autoDispose
    .family<CaptureController, CaptureState, SwingCheckSetup>((ref, setup) {
      return CaptureController(
        ref.watch(poseSourceFactoryProvider)(),
        ref.watch(swingCheckRepositoryProvider),
        setup,
      );
    });

final swingHistoryProvider = FutureProvider.autoDispose<List<SwingSessionRecord>>(
  (ref) => ref.watch(swingCheckRepositoryProvider).list(),
);

class SessionDetailState {
  const SessionDetailState({
    required this.session,
    this.feedbackLoading = false,
    this.feedbackError,
  });

  final AsyncValue<SwingSessionRecord> session;
  final bool feedbackLoading;
  final String? feedbackError;
}

/// One saved session, plus the coach-feedback request on it.
class SessionDetailController extends StateNotifier<SessionDetailState> {
  SessionDetailController(this._repository, this._id)
    : super(const SessionDetailState(session: AsyncValue.loading())) {
    load();
  }

  final SwingCheckRepository _repository;
  final String _id;

  Future<void> load() async {
    try {
      final record = await _repository.fetch(_id);
      if (!mounted) return;
      state = SessionDetailState(session: AsyncValue.data(record));
      if (record.hasEnoughSwings &&
          record.feedback?.locale != CurrentAppLocale.code) {
        await requestFeedback();
      }
    } catch (error, stack) {
      if (!mounted) return;
      state = SessionDetailState(session: AsyncValue.error(error, stack));
    }
  }

  Future<void> requestFeedback() async {
    final current = state.session.valueOrNull;
    if (current == null || state.feedbackLoading) return;
    state = SessionDetailState(session: state.session, feedbackLoading: true);
    try {
      final record = await _repository.requestFeedback(_id);
      if (!mounted) return;
      state = SessionDetailState(session: AsyncValue.data(record));
    } on SwingCheckException catch (e) {
      if (!mounted) return;
      state = SessionDetailState(session: state.session, feedbackError: e.message);
    }
  }
}

final sessionDetailProvider = StateNotifierProvider.autoDispose
    .family<SessionDetailController, SessionDetailState, String>((ref, id) {
      return SessionDetailController(ref.watch(swingCheckRepositoryProvider), id);
    });
