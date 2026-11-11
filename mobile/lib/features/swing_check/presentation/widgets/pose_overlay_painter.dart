import 'package:flutter/material.dart';

import '../../domain/pose_frame.dart';

/// Draws the detected skeleton over the camera preview, so the player can see
/// what the phone sees. Reliable joints only; the hitting arm is highlighted.
class PoseOverlayPainter extends CustomPainter {
  PoseOverlayPainter({
    required this.frame,
    required this.imageSize,
    required this.hand,
    required this.boneColor,
    required this.armColor,
  });

  final PoseFrame? frame;
  final Size? imageSize;
  final HittingHand hand;
  final Color boneColor;
  final Color armColor;

  static const _bones = [
    (PoseJoint.leftShoulder, PoseJoint.rightShoulder),
    (PoseJoint.leftShoulder, PoseJoint.leftHip),
    (PoseJoint.rightShoulder, PoseJoint.rightHip),
    (PoseJoint.leftHip, PoseJoint.rightHip),
    (PoseJoint.leftShoulder, PoseJoint.leftElbow),
    (PoseJoint.leftElbow, PoseJoint.leftWrist),
    (PoseJoint.rightShoulder, PoseJoint.rightElbow),
    (PoseJoint.rightElbow, PoseJoint.rightWrist),
    (PoseJoint.leftHip, PoseJoint.leftKnee),
    (PoseJoint.leftKnee, PoseJoint.leftAnkle),
    (PoseJoint.rightHip, PoseJoint.rightKnee),
    (PoseJoint.rightKnee, PoseJoint.rightAnkle),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final f = frame;
    final src = imageSize;
    if (f == null || src == null || src.width == 0 || src.height == 0) return;

    // The preview is shown with BoxFit.cover, so scale by the larger ratio and
    // centre, matching what's on screen.
    final scale = (size.width / src.width) > (size.height / src.height)
        ? size.width / src.width
        : size.height / src.height;
    final dx = (size.width - src.width * scale) / 2;
    final dy = (size.height - src.height * scale) / 2;
    Offset map(PosePoint p) => Offset(p.x * scale + dx, p.y * scale + dy);

    final arm = {hand.shoulder, hand.elbow, hand.wrist};
    for (final (a, b) in _bones) {
      final pa = f.reliable(a), pb = f.reliable(b);
      if (pa == null || pb == null) continue;
      final isArm = arm.contains(a) && arm.contains(b);
      canvas.drawLine(
        map(pa),
        map(pb),
        Paint()
          ..color = isArm ? armColor : boneColor
          ..strokeWidth = isArm ? 5 : 3
          ..strokeCap = StrokeCap.round,
      );
    }
    for (final point in f.points.values.where((p) => p.isReliable)) {
      canvas.drawCircle(map(point), 4, Paint()..color = boneColor);
    }
  }

  @override
  bool shouldRepaint(PoseOverlayPainter old) =>
      old.frame != frame || old.imageSize != imageSize || old.hand != hand;
}
