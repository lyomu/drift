import 'dart:math' as math;

import 'pose_frame.dart';
import 'swing_detector.dart';

/// Forehand or serve, chosen before filming.
enum SwingStroke {
  forehand('FOREHAND'),
  serve('SERVE');

  const SwingStroke(this.apiValue);
  final String apiValue;

  static SwingStroke fromApi(String? value) =>
      value == 'SERVE' ? SwingStroke.serve : SwingStroke.forehand;
}

/// Metric keys. Shared with the backend (`SWING_METRIC_KEYS`), so renaming one
/// is a contract change.
abstract final class SwingMetric {
  static const contactHeightPct = 'contactHeightPct';
  static const elbowAngleDeg = 'elbowAngleDeg';
  static const kneeBendDeg = 'kneeBendDeg';
  static const contactInFrontPct = 'contactInFrontPct';
  static const tempoMs = 'tempoMs';
  static const finishAboveShoulderPct = 'finishAboveShoulderPct';
  static const trophyToContactMs = 'trophyToContactMs';

  /// Which metrics each stroke reports, in display order.
  static List<String> forStroke(SwingStroke stroke) => switch (stroke) {
    SwingStroke.forehand => const [
      contactHeightPct,
      elbowAngleDeg,
      contactInFrontPct,
      kneeBendDeg,
      tempoMs,
      finishAboveShoulderPct,
    ],
    SwingStroke.serve => const [
      contactHeightPct,
      elbowAngleDeg,
      kneeBendDeg,
      trophyToContactMs,
      tempoMs,
    ],
  };
}

/// Computes body-mechanics numbers for one swing that passed the quality gate.
///
/// Everything is 2D in the image plane from a side-on view. Angles are
/// scale-free; heights and offsets are relative to the player's own body, so
/// camera distance doesn't change them. A metric whose landmarks aren't
/// visible is left out rather than estimated.
class SwingMetricsCalculator {
  const SwingMetricsCalculator();

  Map<String, double> compute(
    DetectedSwing swing,
    SwingStroke stroke,
    HittingHand hand,
  ) {
    final values = <String, double>{};
    final contact = swing.contactFrame;
    final torso = SwingDetector.medianTorsoLength(swing.frames);

    void put(String key, double? value) {
      if (value != null && value.isFinite) {
        values[key] = (value * 10).roundToDouble() / 10;
      }
    }

    put(SwingMetric.contactHeightPct, _contactHeightPct(contact, hand));
    put(SwingMetric.elbowAngleDeg, _elbowAngle(contact, hand));
    put(SwingMetric.kneeBendDeg, _minKneeAngle(swing));
    put(SwingMetric.tempoMs, _tempoMs(swing, hand, torso));

    if (stroke == SwingStroke.forehand) {
      put(SwingMetric.contactInFrontPct, _contactInFrontPct(swing, hand, torso));
      put(
        SwingMetric.finishAboveShoulderPct,
        _finishAboveShoulderPct(swing, hand, torso),
      );
    } else {
      put(SwingMetric.trophyToContactMs, _trophyToContactMs(swing, hand));
    }
    return values;
  }

  /// Wrist height at contact as % of the player's height (ankles to nose).
  double? _contactHeightPct(PoseFrame f, HittingHand hand) {
    final wrist = f.reliable(hand.wrist);
    final nose = f.reliable(PoseJoint.nose);
    final ankles = f.midpoint(PoseJoint.leftAnkle, PoseJoint.rightAnkle);
    if (wrist == null || nose == null || ankles == null) return null;
    final height = ankles.y - nose.y;
    if (height <= 0) return null;
    return (ankles.y - wrist.y) / height * 100;
  }

  double? _elbowAngle(PoseFrame f, HittingHand hand) {
    final s = f.reliable(hand.shoulder);
    final e = f.reliable(hand.elbow);
    final w = f.reliable(hand.wrist);
    if (s == null || e == null || w == null) return null;
    return jointAngle(s, e, w);
  }

  /// Smallest knee angle (hip-knee-ankle) from the window start to contact.
  double? _minKneeAngle(DetectedSwing swing) {
    double? best;
    for (final f in swing.frames.where((f) => f.tMs <= swing.peakMs)) {
      for (final side in const [
        (PoseJoint.leftHip, PoseJoint.leftKnee, PoseJoint.leftAnkle),
        (PoseJoint.rightHip, PoseJoint.rightKnee, PoseJoint.rightAnkle),
      ]) {
        final hip = f.reliable(side.$1);
        final knee = f.reliable(side.$2);
        final ankle = f.reliable(side.$3);
        if (hip == null || knee == null || ankle == null) continue;
        final angle = jointAngle(hip, knee, ankle);
        if (angle.isFinite && (best == null || angle < best)) best = angle;
      }
    }
    return best;
  }

  /// Backswing start (last moment before the peak when the wrist moved at
  /// under 25% of peak speed) to contact.
  double? _tempoMs(DetectedSwing swing, HittingHand hand, double? torso) {
    if (torso == null) return null;
    final speeds = SwingDetector.smooth(
      SwingDetector.wristSpeeds(swing.frames, hand, torso),
    ).where((s) => s.tMs <= swing.peakMs).toList();
    if (speeds.length < 2) return null;
    final threshold = swing.peakSpeed * 0.25;
    for (var i = speeds.length - 1; i >= 0; i--) {
      if (speeds[i].speed < threshold) {
        return (swing.peakMs - speeds[i].tMs).toDouble();
      }
    }
    return null; // Already fast when the window opened: no clean start.
  }

  /// Wrist ahead of the hip midpoint at contact, as % of torso length.
  /// "Ahead" is the direction the wrist is travelling at contact, so it works
  /// whichever way the player faces the camera.
  double? _contactInFrontPct(DetectedSwing swing, HittingHand hand, double? torso) {
    if (torso == null) return null;
    final contact = swing.contactFrame;
    final wrist = contact.reliable(hand.wrist);
    final hips = contact.midpoint(PoseJoint.leftHip, PoseJoint.rightHip);
    final direction = _travelDirectionX(swing, hand);
    if (wrist == null || hips == null || direction == 0) return null;
    return (wrist.x - hips.x) * direction / torso * 100;
  }

  /// Wrist height above the hitting shoulder at the end of the window, as % of
  /// torso length (negative = finished below the shoulder).
  double? _finishAboveShoulderPct(
    DetectedSwing swing,
    HittingHand hand,
    double? torso,
  ) {
    if (torso == null) return null;
    final end = swing.frames.lastWhere(
      (f) => f.reliable(hand.wrist) != null && f.reliable(hand.shoulder) != null,
      orElse: () => swing.frames.last,
    );
    final wrist = end.reliable(hand.wrist);
    final shoulder = end.reliable(hand.shoulder);
    if (wrist == null || shoulder == null) return null;
    return (shoulder.y - wrist.y) / torso * 100;
  }

  /// Racket-arm low point (wrist lowest in the image before contact) to contact.
  double? _trophyToContactMs(DetectedSwing swing, HittingHand hand) {
    PoseFrame? lowest;
    for (final f in swing.frames.where((f) => f.tMs < swing.peakMs)) {
      final wrist = f.reliable(hand.wrist);
      if (wrist == null) continue;
      if (lowest == null || wrist.y > lowest.reliable(hand.wrist)!.y) lowest = f;
    }
    if (lowest == null) return null;
    return (swing.peakMs - lowest.tMs).toDouble();
  }

  /// Sign of the wrist's horizontal movement around contact: 1, -1, or 0.
  int _travelDirectionX(DetectedSwing swing, HittingHand hand) {
    final around = swing.frames
        .where((f) => (f.tMs - swing.peakMs).abs() <= 150)
        .map((f) => f.reliable(hand.wrist))
        .whereType<PosePoint>()
        .toList();
    if (around.length < 2) return 0;
    final dx = around.last.x - around.first.x;
    if (dx.abs() < 1e-6) return 0;
    return dx > 0 ? 1 : -1;
  }
}

/// Mean, spread (population standard deviation) and count for one metric.
class MetricSummary {
  const MetricSummary({
    required this.mean,
    required this.spread,
    required this.count,
  });

  final double mean;
  final double spread;
  final int count;

  factory MetricSummary.of(List<double> values) {
    final mean = values.reduce((a, b) => a + b) / values.length;
    final variance =
        values.map((v) => math.pow(v - mean, 2)).reduce((a, b) => a + b) /
        values.length;
    return MetricSummary(
      mean: (mean * 10).roundToDouble() / 10,
      spread: (math.sqrt(variance) * 10).roundToDouble() / 10,
      count: values.length,
    );
  }

  factory MetricSummary.fromJson(Map<String, dynamic> json) => MetricSummary(
    mean: (json['mean'] as num?)?.toDouble() ?? 0,
    spread: (json['spread'] as num?)?.toDouble() ?? 0,
    count: (json['count'] as num?)?.toInt() ?? 0,
  );

  Map<String, dynamic> toJson() => {
    'mean': mean,
    'spread': spread,
    'count': count,
  };
}
