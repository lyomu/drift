import 'dart:io';

import 'package:flutter/services.dart';

import '../domain/pose_frame.dart';
import '../domain/swing_session.dart';
import '../swing_check_config.dart';

/// Our own bridge to the platform's on-device pose detector:
/// Google ML Kit on Android (`android/.../PoseBridge.kt`), Apple Vision on iOS
/// (`ios/Runner/AppDelegate.swift`). Used instead of the google_mlkit Flutter
/// plugin because that plugin's iOS pods require iOS 15.5 for the whole app;
/// this way the app keeps installing on iOS 13 and only Swing Check needs a
/// newer OS (Android 13+, iOS 15+, checked natively).
class NativePoseChannel {
  const NativePoseChannel();

  static const _channel = MethodChannel('app.driftsports.drift/pose');
  static const _progress = EventChannel('app.driftsports.drift/pose_progress');

  /// Which detector produced the numbers, stored with each session.
  static String get poseModel => Platform.isIOS
      ? 'apple-vision-body-pose'
      : 'mlkit-pose-accurate-android';

  /// Like [poseModel], for a session from [source]. Recorded clips on Android
  /// can run MediaPipe in test builds ([kClipPoseModel]); the session says so.
  static String poseModelFor(SwingSource source) =>
      !Platform.isIOS && source == SwingSource.clip && kClipPoseModel == 'mediapipe'
      ? 'mediapipe-pose-landmarker-full-android'
      : poseModel;

  /// Whether this device can run Swing Check. False on older OS versions, on
  /// platforms without the bridge, and in widget tests.
  Future<bool> isSupported() async {
    try {
      return await _channel.invokeMethod<bool>('isSupported') ?? false;
    } on MissingPluginException {
      return false;
    } on PlatformException {
      return false;
    }
  }

  /// Detect a pose in one camera frame. Returns null when no person is found.
  ///
  /// [bytes] is NV21 on Android and BGRA on iOS. [rotation] is the clockwise
  /// rotation (0/90/180/270) that makes the image upright; the returned points
  /// are pixels in that upright image.
  Future<Map<PoseJoint, PosePoint>?> process({
    required Uint8List bytes,
    required int width,
    required int height,
    required int bytesPerRow,
    required int rotation,
  }) async {
    final raw = await _channel.invokeMethod<List<dynamic>>('process', {
      'bytes': bytes,
      'width': width,
      'height': height,
      'bytesPerRow': bytesPerRow,
      'rotation': rotation,
    });
    return parsePoints(raw);
  }

  /// Detect poses in a recorded video, natively: frames are decoded and
  /// analysed on the phone, one every 1/[sampleFps] s, for at most
  /// [maxDuration]. Returns the raw reply (see the contract in PoseBridge);
  /// `ClipPoseSource` turns it into frames. Throws [PlatformException] with
  /// code `unsupported`, `unreadable`, `cancelled`, `busy` or `failed`.
  Future<Map<Object?, Object?>> processVideo({
    required String path,
    required double sampleFps,
    required Duration maxDuration,
  }) async {
    final raw = await _channel.invokeMethod<Map<Object?, Object?>>('processVideo', {
      'path': path,
      'sampleFps': sampleFps,
      'maxSeconds': maxDuration.inMilliseconds / 1000,
      if (kClipPoseModel != 'mlkit') 'poseModel': kClipPoseModel,
    });
    if (raw == null) {
      throw PlatformException(code: 'failed', message: 'No reply from the pose bridge.');
    }
    return raw;
  }

  /// Progress of [processVideo] as `(done, total)` frames.
  Stream<(int, int)> videoProgress() => _progress.receiveBroadcastStream().map((event) {
    if (event is Map && event['done'] is int && event['total'] is int) {
      return (event['done'] as int, event['total'] as int);
    }
    return null;
  }).where((p) => p != null).cast<(int, int)>();

  /// Stops a running [processVideo]; it then fails with `cancelled`.
  Future<void> cancelVideo() async {
    try {
      await _channel.invokeMethod<void>('cancelVideo');
    } on MissingPluginException {
      // Nothing running.
    }
  }

  /// One frame's points from the bridge's `[{joint, x, y, likelihood}]`.
  /// Null when no known joint came back.
  static Map<PoseJoint, PosePoint>? parsePoints(List<dynamic>? raw) {
    if (raw == null || raw.isEmpty) return null;
    final points = <PoseJoint, PosePoint>{};
    for (final item in raw) {
      if (item is! Map) continue;
      final joint = _jointByName[item['joint']];
      final x = item['x'], y = item['y'], likelihood = item['likelihood'];
      if (joint == null || x is! num || y is! num || likelihood is! num) continue;
      points[joint] = PosePoint(x.toDouble(), y.toDouble(), likelihood.toDouble());
    }
    return points.isEmpty ? null : points;
  }

  Future<void> close() async {
    try {
      await _channel.invokeMethod<void>('close');
    } on MissingPluginException {
      // Nothing to close.
    }
  }

  static final _jointByName = {for (final j in PoseJoint.values) j.name: j};
}
