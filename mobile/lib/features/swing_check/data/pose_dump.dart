import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import '../domain/pose_frame.dart';
import '../swing_check_config.dart';
import 'clip_pose_source.dart';

/// Test builds only: build with `--dart-define=DRIFT_POSE_DUMP=true` to keep
/// the landmarks of each analysed clip in the app's own external files folder
/// (`Android/data/app.driftsports.drift/files/pose_dumps/`), for pulling over
/// USB during the real-phone pass (VIDEO_AI_BUILD_PLAN.md B1). Never set in a
/// release build; nothing here is uploaded.
const bool kPoseDumpEnabled = bool.fromEnvironment('DRIFT_POSE_DUMP');

/// Writes [poses] in the same shape as the MediaPipe fixtures from
/// `cv-service/tools/pose_fixtures.py`, so the calibration test can replay
/// ML Kit landmarks exactly like MediaPipe ones. Failures are only logged.
Future<void> dumpClipPoses(ClipPoses poses, {required double sampleFps}) async {
  if (!kPoseDumpEnabled) return;
  try {
    final base = await getExternalStorageDirectory() ??
        await getApplicationDocumentsDirectory();
    final dir = Directory('${base.path}/pose_dumps');
    await dir.create(recursive: true);
    final stamp = DateTime.now().toIso8601String().replaceAll(RegExp('[^0-9]'), '');
    final file = File('${dir.path}/clip_$stamp.json');
    await file.writeAsString(jsonEncode(poseDumpJson(poses, sampleFps: sampleFps)));
    debugPrint('DriftPose dump: ${file.path} (${poses.frames.length} frames)');
  } catch (e) {
    debugPrint('DriftPose dump failed: $e');
  }
}

/// The fixture JSON for [poses]. A joint the detector didn't return is
/// written as `[0, 0, 0]` (likelihood 0), as the fixtures do for MediaPipe.
@visibleForTesting
Map<String, Object?> poseDumpJson(ClipPoses poses, {required double sampleFps}) => {
  'clip': 'phone',
  'source': kClipPoseModel == 'mediapipe'
      ? 'mediapipe-pose-landmarker-full-android'
      : 'mlkit-pose-accurate',
  'width': poses.imageSize?.width.round() ?? 0,
  'height': poses.imageSize?.height.round() ?? 0,
  'sampleFps': sampleFps,
  'framesSampled': poses.sampled,
  'joints': [for (final j in PoseJoint.values) j.name],
  'frames': [
    for (final f in poses.frames)
      {
        't': f.tMs,
        'p': [
          for (final j in PoseJoint.values)
            switch (f[j]) {
              final p? => [
                  double.parse(p.x.toStringAsFixed(1)),
                  double.parse(p.y.toStringAsFixed(1)),
                  double.parse(p.likelihood.toStringAsFixed(2)),
                ],
              null => [0, 0, 0],
            },
        ],
      },
  ],
};
