import 'dart:math' as math;

/// The body points Swing Check uses. A subset of ML Kit's 33 landmarks, named
/// the same way so the camera layer can map them one to one.
enum PoseJoint {
  nose,
  leftShoulder,
  rightShoulder,
  leftElbow,
  rightElbow,
  leftWrist,
  rightWrist,
  leftHip,
  rightHip,
  leftKnee,
  rightKnee,
  leftAnkle,
  rightAnkle,
}

/// The playing hand for one session. Ambidextrous players pick one on the
/// setup screen, because a swing is measured on one arm.
enum HittingHand {
  left,
  right;

  String get apiValue => this == HittingHand.left ? 'LEFT' : 'RIGHT';

  static HittingHand fromProfile(String? value) =>
      value == 'LEFT' ? HittingHand.left : HittingHand.right;

  PoseJoint get shoulder =>
      this == HittingHand.left ? PoseJoint.leftShoulder : PoseJoint.rightShoulder;
  PoseJoint get elbow =>
      this == HittingHand.left ? PoseJoint.leftElbow : PoseJoint.rightElbow;
  PoseJoint get wrist =>
      this == HittingHand.left ? PoseJoint.leftWrist : PoseJoint.rightWrist;
}

/// One landmark in image coordinates (pixels, y grows downward).
class PosePoint {
  const PosePoint(this.x, this.y, this.likelihood);

  final double x;
  final double y;

  /// ML Kit's in-frame likelihood, 0..1.
  final double likelihood;

  bool get isReliable => likelihood >= kReliableLikelihood;

  double distanceTo(PosePoint other) =>
      math.sqrt(math.pow(x - other.x, 2) + math.pow(y - other.y, 2));
}

/// Below this, a landmark is treated as not visible.
const double kReliableLikelihood = 0.5;

/// All landmarks detected in one camera frame.
class PoseFrame {
  const PoseFrame({required this.tMs, required this.points});

  /// Milliseconds since capture started.
  final int tMs;
  final Map<PoseJoint, PosePoint> points;

  PosePoint? operator [](PoseJoint joint) => points[joint];

  /// The landmark only if it's reliable, otherwise null.
  PosePoint? reliable(PoseJoint joint) {
    final point = points[joint];
    return point != null && point.isReliable ? point : null;
  }

  PosePoint? midpoint(PoseJoint a, PoseJoint b) {
    final pa = reliable(a);
    final pb = reliable(b);
    if (pa == null || pb == null) return null;
    return PosePoint(
      (pa.x + pb.x) / 2,
      (pa.y + pb.y) / 2,
      math.min(pa.likelihood, pb.likelihood),
    );
  }

  /// Shoulder-midpoint to hip-midpoint distance: the unit every speed and
  /// offset is divided by, so measurements don't depend on camera distance.
  double? get torsoLength {
    final shoulders = midpoint(PoseJoint.leftShoulder, PoseJoint.rightShoulder);
    final hips = midpoint(PoseJoint.leftHip, PoseJoint.rightHip);
    if (shoulders == null || hips == null) return null;
    final length = shoulders.distanceTo(hips);
    return length > 0 ? length : null;
  }
}

/// Angle at [b] formed by [a]-[b]-[c], in degrees (0..180).
double jointAngle(PosePoint a, PosePoint b, PosePoint c) {
  final v1x = a.x - b.x, v1y = a.y - b.y;
  final v2x = c.x - b.x, v2y = c.y - b.y;
  final n1 = math.sqrt(v1x * v1x + v1y * v1y);
  final n2 = math.sqrt(v2x * v2x + v2y * v2y);
  if (n1 == 0 || n2 == 0) return double.nan;
  final cos = ((v1x * v2x + v1y * v2y) / (n1 * n2)).clamp(-1.0, 1.0);
  return math.acos(cos) * 180 / math.pi;
}
