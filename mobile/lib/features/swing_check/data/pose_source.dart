import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/services.dart';

import '../domain/pose_frame.dart';
import 'native_pose_channel.dart';

/// Why the camera couldn't start.
enum PoseSourceError { unsupported, noCamera, permissionDenied, failed }

class PoseSourceException implements Exception {
  const PoseSourceException(this.error);
  final PoseSourceError error;
}

/// Live pose frames from the camera. An interface so screens and tests don't
/// depend on the camera or the native detector.
abstract class PoseSource {
  /// Pose frames as they're processed. Frames with no person are skipped.
  Stream<PoseFrame> get frames;

  /// The camera preview controller, once started. Null for fakes.
  CameraController? get previewController;

  /// Size of the analysed image after rotation, for drawing the overlay.
  Size? get imageSize;

  Future<void> start();
  Future<void> stop();
  Future<void> dispose();
}

/// Back camera + the platform's pose detector through [NativePoseChannel]
/// (ML Kit on Android 13+, Apple Vision on iOS 15+).
///
/// Processes one frame at a time: frames that arrive while the detector is
/// busy are dropped, so latency never builds up. Nothing here records video,
/// writes files, or sends anything over the network.
class CameraPoseSource implements PoseSource {
  CameraPoseSource({NativePoseChannel channel = const NativePoseChannel()})
    : _channel = channel;

  final NativePoseChannel _channel;
  final _out = StreamController<PoseFrame>.broadcast();

  CameraController? _camera;
  Size? _imageSize;
  bool _busy = false;
  final _clock = Stopwatch();

  static const _orientations = {
    DeviceOrientation.portraitUp: 0,
    DeviceOrientation.landscapeLeft: 90,
    DeviceOrientation.portraitDown: 180,
    DeviceOrientation.landscapeRight: 270,
  };

  @override
  Stream<PoseFrame> get frames => _out.stream;

  @override
  CameraController? get previewController => _camera;

  @override
  Size? get imageSize => _imageSize;

  @override
  Future<void> start() async {
    if (!await _channel.isSupported()) {
      throw const PoseSourceException(PoseSourceError.unsupported);
    }
    final cameras = await availableCameras();
    final back = cameras.where(
      (c) => c.lensDirection == CameraLensDirection.back,
    );
    if (back.isEmpty) throw const PoseSourceException(PoseSourceError.noCamera);

    final camera = CameraController(
      back.first,
      ResolutionPreset.medium,
      enableAudio: false,
      imageFormatGroup: Platform.isAndroid
          ? ImageFormatGroup.nv21
          : ImageFormatGroup.bgra8888,
    );
    try {
      await camera.initialize();
    } on CameraException catch (e) {
      await camera.dispose();
      throw PoseSourceException(
        e.code.toLowerCase().contains('denied')
            ? PoseSourceError.permissionDenied
            : PoseSourceError.failed,
      );
    }
    _camera = camera;
    _clock
      ..reset()
      ..start();
    await camera.startImageStream(_onImage);
  }

  Future<void> _onImage(CameraImage image) async {
    if (_busy) return;
    final camera = _camera;
    if (camera == null || image.planes.length != 1) return;
    final rotation = _rotation(camera);
    if (rotation == null) return;

    final quarterTurn = rotation == 90 || rotation == 270;
    _imageSize = quarterTurn
        ? Size(image.height.toDouble(), image.width.toDouble())
        : Size(image.width.toDouble(), image.height.toDouble());

    _busy = true;
    final tMs = _clock.elapsedMilliseconds;
    try {
      final plane = image.planes.first;
      final points = await _channel.process(
        bytes: plane.bytes,
        width: image.width,
        height: image.height,
        bytesPerRow: plane.bytesPerRow,
        rotation: rotation,
      );
      if (points != null && !_out.isClosed) {
        _out.add(PoseFrame(tMs: tMs, points: points));
      }
    } catch (_) {
      // A frame the detector can't read is just a dropped frame.
    } finally {
      _busy = false;
    }
  }

  /// Clockwise rotation that makes the camera image upright.
  int? _rotation(CameraController camera) {
    final sensor = camera.description.sensorOrientation;
    if (Platform.isIOS) return sensor;
    final compensation = _orientations[camera.value.deviceOrientation];
    if (compensation == null) return null;
    return (sensor - compensation + 360) % 360;
  }

  @override
  Future<void> stop() async {
    _clock.stop();
    final camera = _camera;
    if (camera != null && camera.value.isStreamingImages) {
      await camera.stopImageStream();
    }
  }

  @override
  Future<void> dispose() async {
    await stop();
    await _camera?.dispose();
    _camera = null;
    await _channel.close();
    await _out.close();
  }
}
