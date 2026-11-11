import 'pose_frame.dart';
import 'swing_detector.dart';

/// Why a swing wasn't measured. The API values are shared with the backend.
enum SwingRefusal {
  armHidden('arm_hidden'),
  outOfFrame('out_of_frame'),
  tooFast('too_fast');

  const SwingRefusal(this.apiValue);
  final String apiValue;

  static SwingRefusal? fromApi(String? value) {
    for (final reason in values) {
      if (reason.apiValue == value) return reason;
    }
    return null;
  }
}

/// Decides whether a detected swing can be measured. A swing that fails gets
/// a specific reason and no numbers, never a guessed value.
class QualityGate {
  const QualityGate({
    this.minVisibleShare = 0.8,
    this.minFrames = 6,
    this.maxGapNearContactMs = 120,
  });

  /// Share of window frames in which every required joint must be reliable.
  final double minVisibleShare;

  /// Fewer frames than this in a window means the swing was too fast to follow.
  final int minFrames;

  /// A longer gap between frames around contact means dropped or blurred frames.
  final int maxGapNearContactMs;

  static const _body = [
    PoseJoint.leftShoulder,
    PoseJoint.rightShoulder,
    PoseJoint.leftHip,
    PoseJoint.rightHip,
    PoseJoint.leftKnee,
    PoseJoint.rightKnee,
  ];

  /// Returns null when the swing can be measured.
  SwingRefusal? check(DetectedSwing swing, HittingHand hand) {
    final frames = swing.frames;
    if (frames.length < minFrames) return SwingRefusal.tooFast;
    if (_maxGapNear(frames, swing.peakMs) > maxGapNearContactMs) {
      return SwingRefusal.tooFast;
    }
    if (_visibleShare(frames, [hand.elbow, hand.wrist]) < minVisibleShare) {
      return SwingRefusal.armHidden;
    }
    if (_visibleShare(frames, [..._body, hand.shoulder]) < minVisibleShare) {
      return SwingRefusal.outOfFrame;
    }
    return null;
  }

  double _visibleShare(List<PoseFrame> frames, List<PoseJoint> joints) {
    final visible = frames
        .where((f) => joints.every((j) => f.reliable(j) != null))
        .length;
    return visible / frames.length;
  }

  int _maxGapNear(List<PoseFrame> frames, int peakMs) {
    var maxGap = 0;
    for (var i = 1; i < frames.length; i++) {
      final a = frames[i - 1].tMs, b = frames[i].tMs;
      // Only gaps that touch the 200 ms around contact matter.
      if (b < peakMs - 200 || a > peakMs + 200) continue;
      if (b - a > maxGap) maxGap = b - a;
    }
    return maxGap;
  }
}
