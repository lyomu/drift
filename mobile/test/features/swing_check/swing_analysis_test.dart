import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/swing_check/domain/pose_frame.dart';
import 'package:drift_tennis/features/swing_check/domain/quality_gate.dart';
import 'package:drift_tennis/features/swing_check/domain/swing_detector.dart';
import 'package:drift_tennis/features/swing_check/domain/swing_metrics.dart';
import 'package:drift_tennis/features/swing_check/domain/swing_session.dart';

/// A scripted side-on player with known answers.
///
/// Body is fixed: nose y=40, shoulders y=80, hips y=160, knees y=220,
/// ankles y=280 (height 240 px, torso 80 px). The hitting wrist rests at
/// x=40, y=120 and, at each swing start, sweeps to x=200 in 150 ms (about 13
/// torso lengths per second), then drifts back over a second. The elbow is
/// always the shoulder-wrist midpoint, so the arm is straight: 180°.
const _swingStarts = [2000, 4500];
const _wristY = 120.0;

double _wristX(int t) {
  for (final s in _swingStarts) {
    if (t >= s && t < s + 150) return 40 + 160 * (t - s) / 150;
    if (t >= s + 150 && t < s + 1150) return 200 - 160 * (t - s - 150) / 1000;
  }
  return 40;
}

PoseFrame _frame(
  int t, {
  HittingHand hand = HittingHand.right,
  double elbowLikelihood = 0.99,
  double kneeLikelihood = 0.99,
}) {
  const ok = 0.99;
  final shoulderX = hand == HittingHand.right ? 105.0 : 95.0;
  final wrist = PosePoint(_wristX(t), _wristY, ok);
  final elbow = PosePoint(
    (shoulderX + wrist.x) / 2,
    (80 + _wristY) / 2,
    elbowLikelihood,
  );
  final otherShoulderX = hand == HittingHand.right ? 95.0 : 105.0;
  return PoseFrame(
    tMs: t,
    points: {
      PoseJoint.nose: const PosePoint(100, 40, ok),
      hand.shoulder: PosePoint(shoulderX, 80, ok),
      (hand == HittingHand.right ? PoseJoint.leftShoulder : PoseJoint.rightShoulder):
          PosePoint(otherShoulderX, 80, ok),
      hand.elbow: elbow,
      hand.wrist: wrist,
      PoseJoint.leftHip: const PosePoint(97, 160, ok),
      PoseJoint.rightHip: const PosePoint(103, 160, ok),
      PoseJoint.leftKnee: PosePoint(98, 220, kneeLikelihood),
      PoseJoint.rightKnee: PosePoint(102, 220, kneeLikelihood),
      PoseJoint.leftAnkle: const PosePoint(98, 280, ok),
      PoseJoint.rightAnkle: const PosePoint(102, 280, ok),
    },
  );
}

/// 30 fps for 6 seconds.
List<PoseFrame> _recording({
  HittingHand hand = HittingHand.right,
  double Function(int t)? elbowLikelihood,
  double Function(int t)? kneeLikelihood,
}) => [
  for (var t = 0; t <= 6000; t += 33)
    _frame(
      t,
      hand: hand,
      elbowLikelihood: elbowLikelihood?.call(t) ?? 0.99,
      kneeLikelihood: kneeLikelihood?.call(t) ?? 0.99,
    ),
];

void main() {
  group('jointAngle', () {
    test('a right angle is 90°', () {
      expect(
        jointAngle(const PosePoint(0, 10, 1), const PosePoint(0, 0, 1), const PosePoint(10, 0, 1)),
        closeTo(90, 0.001),
      );
    });

    test('a straight line is 180°', () {
      expect(
        jointAngle(const PosePoint(0, 0, 1), const PosePoint(5, 5, 1), const PosePoint(10, 10, 1)),
        closeTo(180, 0.001),
      );
    });
  });

  group('SwingDetector', () {
    test('finds one swing per wrist sweep, near the sweep', () {
      final swings = const SwingDetector().detect(_recording(), HittingHand.right);
      expect(swings, hasLength(2));
      expect(swings[0].peakMs, inInclusiveRange(2000, 2200));
      expect(swings[1].peakMs, inInclusiveRange(4500, 4700));
    });

    test('works the same for a left-handed player', () {
      final swings = const SwingDetector().detect(
        _recording(hand: HittingHand.left),
        HittingHand.left,
      );
      expect(swings, hasLength(2));
    });

    test('finds nothing when the player stands still', () {
      final still = [
        for (var t = 0; t <= 3000; t += 33) _frame(t).copyWithWristAt(40),
      ];
      expect(const SwingDetector().detect(still, HittingHand.right), isEmpty);
    });
  });

  group('SwingAnalyzer', () {
    test('measures clean swings with the known answers', () {
      final analysis = const SwingAnalyzer().analyze(
        _recording(),
        SwingStroke.forehand,
        HittingHand.right,
      );
      expect(analysis.detected, 2);
      expect(analysis.measured, 2);
      final values = analysis.swings.first.values;
      expect(values[SwingMetric.elbowAngleDeg], closeTo(180, 0.5));
      // (280 - 120) / 240 = 66.7 %
      expect(values[SwingMetric.contactHeightPct], closeTo(66.7, 0.2));
      expect(values[SwingMetric.kneeBendDeg], greaterThan(170));
      // The wrist travels toward +x, and contact is past the hips (x=100).
      expect(values[SwingMetric.contactInFrontPct], isNotNull);
      expect(values.containsKey(SwingMetric.trophyToContactMs), isFalse);
    });

    test('serve reports trophy-to-contact and not forehand-only metrics', () {
      final analysis = const SwingAnalyzer().analyze(
        _recording(),
        SwingStroke.serve,
        HittingHand.right,
      );
      final values = analysis.swings.first.values;
      expect(values.containsKey(SwingMetric.contactInFrontPct), isFalse);
      expect(values.containsKey(SwingMetric.finishAboveShoulderPct), isFalse);
    });

    test('a hidden elbow during a swing refuses it as arm hidden', () {
      final analysis = const SwingAnalyzer().analyze(
        _recording(elbowLikelihood: (t) => t > 1300 && t < 2700 ? 0.1 : 0.99),
        SwingStroke.forehand,
        HittingHand.right,
      );
      expect(analysis.swings.first.measured, isFalse);
      expect(analysis.swings.first.reason, SwingRefusal.armHidden);
      expect(analysis.swings.first.values, isEmpty);
      expect(analysis.swings.last.measured, isTrue);
    });

    test('hidden knees refuse a swing as out of frame', () {
      final analysis = const SwingAnalyzer().analyze(
        _recording(kneeLikelihood: (t) => t > 3800 ? 0.1 : 0.99),
        SwingStroke.forehand,
        HittingHand.right,
      );
      expect(analysis.swings.last.reason, SwingRefusal.outOfFrame);
    });

    test('no summary below 3 measured swings', () {
      final analysis = const SwingAnalyzer().analyze(
        _recording(),
        SwingStroke.forehand,
        HittingHand.right,
      );
      expect(analysis.measured, 2);
      expect(analysis.summary, isEmpty);
      expect(analysis.hasEnoughSwings, isFalse);
    });

    test('create payload carries reasons only for refused swings and no landmarks', () {
      final analysis = const SwingAnalyzer().analyze(
        _recording(elbowLikelihood: (t) => t > 1300 && t < 2700 ? 0.1 : 0.99),
        SwingStroke.forehand,
        HittingHand.right,
      );
      final json = analysis.toCreateJson(poseModel: 'm', appVersion: 'v');
      final swings = (json['metrics'] as Map)['swings'] as List;
      expect(swings.first, containsPair('reason', 'arm_hidden'));
      expect((swings.first as Map).containsKey('values'), isFalse);
      expect((swings.last as Map).containsKey('reason'), isFalse);
      expect(json['dominantHand'], 'RIGHT');
      expect(json.toString().contains('landmark'), isFalse);
    });
  });

  group('QualityGate', () {
    test('a gap of dropped frames around contact is too fast to follow', () {
      final frames = [
        for (var t = 1200; t <= 2500; t += 33)
          if (t < 1950 || t > 2150) _frame(t),
      ];
      final swing = DetectedSwing(peakMs: 2075, peakSpeed: 10, frames: frames);
      expect(const QualityGate().check(swing, HittingHand.right), SwingRefusal.tooFast);
    });

    test('too few frames is too fast to follow', () {
      final swing = DetectedSwing(
        peakMs: 2075,
        peakSpeed: 10,
        frames: [_frame(2000), _frame(2033), _frame(2066)],
      );
      expect(const QualityGate().check(swing, HittingHand.right), SwingRefusal.tooFast);
    });
  });

  group('summaries', () {
    test('mean and population spread', () {
      final s = MetricSummary.of([10, 20, 30]);
      expect(s.mean, 20);
      expect(s.spread, closeTo(8.2, 0.05));
      expect(s.count, 3);
    });

    test('summarize needs 3 measured swings', () {
      SwingResult measured(int i, double v) => SwingResult(
        index: i,
        peakMs: i * 1000,
        measured: true,
        values: {SwingMetric.elbowAngleDeg: v},
      );
      expect(SwingAnalyzer.summarize([measured(0, 150), measured(1, 160)]), isEmpty);
      final summary = SwingAnalyzer.summarize([
        measured(0, 150),
        measured(1, 160),
        measured(2, 170),
      ]);
      expect(summary[SwingMetric.elbowAngleDeg]!.mean, 160);
    });
  });
}

extension on PoseFrame {
  /// The same frame with the hitting wrist (right) pinned at [x].
  PoseFrame copyWithWristAt(double x) => PoseFrame(
    tMs: tMs,
    points: {
      ...points,
      PoseJoint.rightWrist: PosePoint(x, _wristY, 0.99),
      PoseJoint.rightElbow: PosePoint((105 + x) / 2, (80 + _wristY) / 2, 0.99),
    },
  );
}
