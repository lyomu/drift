import 'pose_frame.dart';

/// Thresholds tuned on 79 hand-labelled swings from 7 real clips
/// (2026-11-11, test/features/swing_check/real_clips_calibration_test.dart).
/// The first guess, 6.0, missed 18 of the 24 side-on forehands (4.0 misses 4):
/// seen side-on the wrist covers fewer torso lengths per second than seen
/// from the front.
/// Speeds are in torso lengths per second, so they don't depend on distance.
class SwingDetectorConfig {
  const SwingDetectorConfig({
    this.peakSpeed = 4.0,
    this.mergeWithinMs = 1400,
    this.windowBeforeMs = 800,
    this.windowAfterMs = 500,
  });

  /// Minimum smoothed wrist speed for a peak to count as a swing.
  final double peakSpeed;

  /// Peaks closer than this are one swing (the faster one is kept).
  final int mergeWithinMs;
  final int windowBeforeMs;
  final int windowAfterMs;
}

/// A swing found in the recording, before it's checked or measured.
class DetectedSwing {
  const DetectedSwing({
    required this.peakMs,
    required this.peakSpeed,
    required this.frames,
  });

  /// Moment of peak wrist speed: the "around contact" moment.
  final int peakMs;
  final double peakSpeed;

  /// Every frame inside the swing's window, in time order.
  final List<PoseFrame> frames;

  int get startMs => frames.isEmpty ? peakMs : frames.first.tMs;
  int get endMs => frames.isEmpty ? peakMs : frames.last.tMs;

  /// The frame closest to [peakMs].
  PoseFrame get contactFrame => frames.reduce(
    (a, b) => (a.tMs - peakMs).abs() <= (b.tMs - peakMs).abs() ? a : b,
  );
}

/// Wrist speed at one moment, for detection and for tempo.
class WristSpeedSample {
  const WristSpeedSample(this.tMs, this.speed);
  final int tMs;
  final double speed;
}

/// Finds swings as peaks in the hitting wrist's speed. No classifier: the
/// player chose forehand or serve before filming.
class SwingDetector {
  const SwingDetector({this.config = const SwingDetectorConfig()});

  final SwingDetectorConfig config;

  List<DetectedSwing> detect(List<PoseFrame> frames, HittingHand hand) {
    if (frames.length < 3) return const [];
    final torso = medianTorsoLength(frames);
    if (torso == null) return const [];

    final speeds = smooth(wristSpeeds(frames, hand, torso));
    final peaks = <WristSpeedSample>[];
    for (var i = 1; i < speeds.length - 1; i++) {
      final s = speeds[i];
      if (s.speed >= config.peakSpeed &&
          s.speed >= speeds[i - 1].speed &&
          s.speed > speeds[i + 1].speed) {
        if (peaks.isNotEmpty && s.tMs - peaks.last.tMs < config.mergeWithinMs) {
          if (s.speed > peaks.last.speed) peaks[peaks.length - 1] = s;
        } else {
          peaks.add(s);
        }
      }
    }

    return [
      for (final peak in peaks)
        DetectedSwing(
          peakMs: peak.tMs,
          peakSpeed: peak.speed,
          frames: frames
              .where(
                (f) =>
                    f.tMs >= peak.tMs - config.windowBeforeMs &&
                    f.tMs <= peak.tMs + config.windowAfterMs,
              )
              .toList(),
        ),
    ];
  }

  /// Median torso length across frames where it's visible.
  static double? medianTorsoLength(List<PoseFrame> frames) {
    final lengths = frames.map((f) => f.torsoLength).whereType<double>().toList()
      ..sort();
    if (lengths.isEmpty) return null;
    return lengths[lengths.length ~/ 2];
  }

  /// Hitting-wrist speed between consecutive frames where the wrist is
  /// reliable, in torso lengths per second. Stamped at the later frame.
  static List<WristSpeedSample> wristSpeeds(
    List<PoseFrame> frames,
    HittingHand hand,
    double torso,
  ) {
    final samples = <WristSpeedSample>[];
    PoseFrame? previous;
    for (final frame in frames) {
      final wrist = frame.reliable(hand.wrist);
      if (wrist == null) continue;
      final prevWrist = previous?.reliable(hand.wrist);
      if (previous != null && prevWrist != null) {
        final dtS = (frame.tMs - previous.tMs) / 1000;
        if (dtS > 0) {
          samples.add(
            WristSpeedSample(frame.tMs, wrist.distanceTo(prevWrist) / torso / dtS),
          );
        }
      }
      previous = frame;
    }
    return samples;
  }

  /// Three-point moving average, so a single jittery landmark isn't a swing.
  static List<WristSpeedSample> smooth(List<WristSpeedSample> samples) {
    if (samples.length < 3) return samples;
    return [
      for (var i = 0; i < samples.length; i++)
        WristSpeedSample(
          samples[i].tMs,
          [
                if (i > 0) samples[i - 1].speed,
                samples[i].speed,
                if (i < samples.length - 1) samples[i + 1].speed,
              ].reduce((a, b) => a + b) /
              ((i > 0 ? 1 : 0) + 1 + (i < samples.length - 1 ? 1 : 0)),
        ),
    ];
  }
}
