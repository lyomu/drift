import 'dart:async';

import 'package:flutter/services.dart';

import '../domain/pose_frame.dart';
import '../swing_check_config.dart';
import 'native_pose_channel.dart';

/// Why a recorded clip couldn't be analysed.
enum ClipPoseError { unsupported, unreadable, cancelled, failed }

class ClipPoseException implements Exception {
  const ClipPoseException(this.error);
  final ClipPoseError error;
}

/// Frames analysed so far out of the frames that will be analysed.
class ClipProgress {
  const ClipProgress(this.done, this.total);
  final int done;
  final int total;

  double get fraction => total <= 0 ? 0 : (done / total).clamp(0, 1).toDouble();
}

/// Pose frames from a recorded clip, plus what was actually analysed.
class ClipPoses {
  const ClipPoses({
    required this.frames,
    required this.durationMs,
    required this.analysedMs,
    required this.truncated,
    required this.sampled,
    this.imageSize,
  });

  /// Frames with a person in them, in time order. `tMs` is the time in the clip.
  final List<PoseFrame> frames;

  /// Length of the whole clip.
  final int durationMs;

  /// How much of it was analysed, from the start.
  final int analysedMs;

  /// True when the clip was longer than [kMaxClipDuration].
  final bool truncated;

  /// Frames decoded, with or without a person.
  final int sampled;

  /// Size of the upright analysed frames.
  final Size? imageSize;

  /// Parses the native bridge's `processVideo` reply.
  factory ClipPoses.fromChannel(Map<Object?, Object?> raw) {
    final frames = <PoseFrame>[];
    for (final item in raw['frames'] as List<dynamic>? ?? const []) {
      if (item is! Map) continue;
      final tMs = item['tMs'];
      final points = NativePoseChannel.parsePoints(item['points'] as List<dynamic>?);
      if (tMs is! num || points == null) continue;
      frames.add(PoseFrame(tMs: tMs.toInt(), points: points));
    }
    frames.sort((a, b) => a.tMs.compareTo(b.tMs));
    int asInt(Object? v) => v is num ? v.toInt() : 0;
    final width = asInt(raw['width']), height = asInt(raw['height']);
    return ClipPoses(
      frames: frames,
      durationMs: asInt(raw['durationMs']),
      analysedMs: asInt(raw['analysedMs']),
      truncated: raw['truncated'] == true,
      sampled: asInt(raw['sampled']),
      imageSize: width > 0 && height > 0
          ? Size(width.toDouble(), height.toDouble())
          : null,
    );
  }
}

/// Pose frames from a video file already on the phone. Sits beside the live
/// camera [PoseSource] (`pose_source.dart`) rather than behind it: a clip has
/// no preview and is analysed in one pass, with progress, not as a live
/// stream. Both produce the same [PoseFrame]s, so the same `SwingAnalyzer`
/// measures either.
abstract class ClipPoseSource {
  /// Progress of the running [analyse] call.
  Stream<ClipProgress> get progress;

  /// Analyses up to [kMaxClipDuration] of the clip at [path]. Throws
  /// [ClipPoseException].
  Future<ClipPoses> analyse(String path);

  /// Stops a running [analyse]; it then throws [ClipPoseError.cancelled].
  Future<void> cancel();
}

/// Decodes and analyses the clip natively through [NativePoseChannel]
/// (ML Kit on Android 13+, Apple Vision on iOS 15+). The video is read from
/// the phone's storage and never uploaded; only frames' landmarks come back,
/// and those are dropped once the swings are measured.
class NativeClipPoseSource implements ClipPoseSource {
  NativeClipPoseSource({NativePoseChannel channel = const NativePoseChannel()})
    : _channel = channel;

  final NativePoseChannel _channel;

  @override
  Stream<ClipProgress> get progress =>
      _channel.videoProgress().map((p) => ClipProgress(p.$1, p.$2));

  @override
  Future<ClipPoses> analyse(String path) async {
    if (!await _channel.isSupported()) {
      throw const ClipPoseException(ClipPoseError.unsupported);
    }
    try {
      final raw = await _channel.processVideo(
        path: path,
        sampleFps: kClipSampleFps,
        maxDuration: kMaxClipDuration,
      );
      return ClipPoses.fromChannel(raw);
    } on PlatformException catch (e) {
      throw ClipPoseException(switch (e.code) {
        'unsupported' => ClipPoseError.unsupported,
        'unreadable' || 'bad_args' => ClipPoseError.unreadable,
        'cancelled' => ClipPoseError.cancelled,
        _ => ClipPoseError.failed,
      });
    } on MissingPluginException {
      throw const ClipPoseException(ClipPoseError.unsupported);
    }
  }

  @override
  Future<void> cancel() => _channel.cancelVideo();
}
