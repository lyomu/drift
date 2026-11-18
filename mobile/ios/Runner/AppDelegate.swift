import AVFoundation
import Flutter
import UIKit
import Vision

@main
@objc class AppDelegate: FlutterAppDelegate {
  private var poseBridge: PoseBridge?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    if let controller = window?.rootViewController as? FlutterViewController {
      poseBridge = PoseBridge(messenger: controller.binaryMessenger)
    }
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}

/// Swing Check pose detection on iOS: Apple Vision body pose on BGRA camera
/// frames sent from Dart, or on frames decoded here from a video file the
/// player picked. Lives in this file (not its own) so it's compiled without
/// editing the Xcode project.
///
/// Available on iOS 15 and later only (a product floor; Vision body pose
/// exists from iOS 14). The app itself still runs on iOS 13. Frames are
/// processed in memory and dropped; nothing is stored or sent anywhere.
///
/// Channel contract (shared with lib/features/swing_check/data/native_pose_channel.dart):
///  - isSupported() -> Bool
///  - process({bytes, width, height, bytesPerRow, rotation}) -> [[joint, x, y, likelihood]]
///    Coordinates are pixels in the upright (rotated) image. Empty list = no person.
///  - processVideo({path, sampleFps, maxSeconds}) -> {frames: [{tMs, points}],
///    durationMs, analysedMs, truncated, sampled, width, height}
///    Frames with no person are left out. Progress goes out on the
///    `pose_progress` event channel as {done, total}. Errors: unsupported,
///    bad_args, busy, unreadable, cancelled, failed.
///  - cancelVideo()
///  - close()
final class PoseBridge {
  private let channel: FlutterMethodChannel
  private let progressChannel: FlutterEventChannel
  private let progress = PoseProgressStream()
  private let queue = DispatchQueue(label: "app.driftsports.drift.pose", qos: .userInitiated)
  private let clipQueue = DispatchQueue(label: "app.driftsports.drift.pose.clip", qos: .userInitiated)
  private let clipState = ClipState()

  /// Long side of decoded clip frames; enough for a player 3-5 m away.
  private static let maxFrameSide: CGFloat = 640
  /// Progress events every this many frames.
  private static let progressEvery = 5

  init(messenger: FlutterBinaryMessenger) {
    channel = FlutterMethodChannel(name: "app.driftsports.drift/pose", binaryMessenger: messenger)
    progressChannel = FlutterEventChannel(
      name: "app.driftsports.drift/pose_progress", binaryMessenger: messenger
    )
    progressChannel.setStreamHandler(progress)
    channel.setMethodCallHandler { [weak self] call, result in
      self?.handle(call, result: result)
    }
  }

  private func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "isSupported":
      if #available(iOS 15.0, *) { result(true) } else { result(false) }
    case "process":
      if #available(iOS 15.0, *) {
        process(call.arguments, result: result)
      } else {
        result(Self.unsupported)
      }
    case "processVideo":
      if #available(iOS 15.0, *) {
        processVideo(call.arguments, result: result)
      } else {
        result(Self.unsupported)
      }
    case "cancelVideo":
      clipState.cancel()
      result(nil)
    case "close":
      result(nil)
    default:
      result(FlutterMethodNotImplemented)
    }
  }

  private static let unsupported = FlutterError(
    code: "unsupported", message: "Swing Check needs iOS 15 or later.", details: nil
  )

  // MARK: - Camera frames

  @available(iOS 15.0, *)
  private func process(_ arguments: Any?, result: @escaping FlutterResult) {
    guard
      let args = arguments as? [String: Any],
      let bytes = args["bytes"] as? FlutterStandardTypedData,
      let width = args["width"] as? Int,
      let height = args["height"] as? Int,
      let bytesPerRow = args["bytesPerRow"] as? Int,
      bytes.data.count >= bytesPerRow * height
    else {
      result(FlutterError(code: "bad_args", message: "bytes, width, height and bytesPerRow are required.", details: nil))
      return
    }
    let rotation = args["rotation"] as? Int ?? 0

    queue.async {
      let reply: Any
      do {
        reply = try Self.detect(
          data: bytes.data, width: width, height: height,
          bytesPerRow: bytesPerRow, rotation: rotation
        )
      } catch {
        reply = FlutterError(code: "failed", message: error.localizedDescription, details: nil)
      }
      DispatchQueue.main.async { result(reply) }
    }
  }

  @available(iOS 15.0, *)
  private static func detect(
    data: Data, width: Int, height: Int, bytesPerRow: Int, rotation: Int
  ) throws -> [[String: Any]] {
    var created: CVPixelBuffer?
    guard CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32BGRA, nil, &created) == kCVReturnSuccess,
          let buffer = created
    else { return [] }

    CVPixelBufferLockBaseAddress(buffer, [])
    if let destination = CVPixelBufferGetBaseAddress(buffer) {
      let destinationBytesPerRow = CVPixelBufferGetBytesPerRow(buffer)
      let rowBytes = min(bytesPerRow, destinationBytesPerRow)
      data.withUnsafeBytes { (source: UnsafeRawBufferPointer) in
        guard let base = source.baseAddress else { return }
        for row in 0..<height {
          memcpy(destination + row * destinationBytesPerRow, base + row * bytesPerRow, rowBytes)
        }
      }
    }
    CVPixelBufferUnlockBaseAddress(buffer, [])

    let orientation: CGImagePropertyOrientation
    switch rotation {
    case 90: orientation = .right
    case 180: orientation = .down
    case 270: orientation = .left
    default: orientation = .up
    }

    let request = VNDetectHumanBodyPoseRequest()
    try VNImageRequestHandler(cvPixelBuffer: buffer, orientation: orientation, options: [:]).perform([request])
    guard let observation = request.results?.first else { return [] }

    let quarterTurn = rotation == 90 || rotation == 270
    return try points(
      from: observation,
      uprightWidth: Double(quarterTurn ? height : width),
      uprightHeight: Double(quarterTurn ? width : height)
    )
  }

  /// Vision points are normalized (0...1) in the oriented image, origin at
  /// the bottom-left. Convert to pixels with a top-left origin, like ML Kit.
  @available(iOS 15.0, *)
  private static func points(
    from observation: VNHumanBodyPoseObservation, uprightWidth: Double, uprightHeight: Double
  ) throws -> [[String: Any]] {
    let recognized = try observation.recognizedPoints(.all)
    var points: [[String: Any]] = []
    for (name, joint) in joints {
      guard let point = recognized[joint], point.confidence > 0 else { continue }
      points.append([
        "joint": name,
        "x": Double(point.location.x) * uprightWidth,
        "y": (1 - Double(point.location.y)) * uprightHeight,
        "likelihood": Double(point.confidence),
      ])
    }
    return points
  }

  // MARK: - Recorded clips

  @available(iOS 15.0, *)
  private func processVideo(_ arguments: Any?, result: @escaping FlutterResult) {
    guard
      let args = arguments as? [String: Any],
      let path = args["path"] as? String, !path.isEmpty
    else {
      result(FlutterError(code: "bad_args", message: "path is required.", details: nil))
      return
    }
    let sampleFps = (args["sampleFps"] as? NSNumber)?.doubleValue ?? 15
    let maxSeconds = (args["maxSeconds"] as? NSNumber)?.doubleValue ?? 60
    guard sampleFps > 0, sampleFps <= 60, maxSeconds > 0 else {
      result(FlutterError(code: "bad_args", message: "sampleFps (0-60] and maxSeconds > 0 are required.", details: nil))
      return
    }
    guard clipState.begin() else {
      result(FlutterError(code: "busy", message: "A clip is already being analysed.", details: nil))
      return
    }

    let state = clipState
    let progress = self.progress
    clipQueue.async {
      let reply: Any
      do {
        reply = try Self.analyseClip(
          path: path, sampleFps: sampleFps, maxSeconds: maxSeconds,
          isCancelled: { state.isCancelled },
          onProgress: { done, total in
            guard done == total || done % Self.progressEvery == 0 else { return }
            DispatchQueue.main.async { progress.send(["done": done, "total": total]) }
          }
        )
      } catch let error as ClipError {
        reply = FlutterError(code: error.code, message: error.message, details: nil)
      } catch {
        reply = FlutterError(code: "failed", message: error.localizedDescription, details: nil)
      }
      state.end()
      DispatchQueue.main.async { result(reply) }
    }
  }

  /// Decodes one frame every 1/sampleFps s for up to maxSeconds and runs
  /// Vision on each. Runs on clipQueue, never the main thread.
  @available(iOS 15.0, *)
  private static func analyseClip(
    path: String, sampleFps: Double, maxSeconds: Double,
    isCancelled: () -> Bool, onProgress: (Int, Int) -> Void
  ) throws -> [String: Any] {
    let asset = AVURLAsset(url: URL(fileURLWithPath: path))
    guard !asset.tracks(withMediaType: .video).isEmpty else {
      throw ClipError(code: "unreadable", message: "The file has no video track.")
    }
    let seconds = CMTimeGetSeconds(asset.duration)
    guard seconds.isFinite, seconds > 0 else {
      throw ClipError(code: "unreadable", message: "The video has no duration.")
    }
    let durationMs = Int((seconds * 1000).rounded())
    let analysedMs = min(durationMs, Int((maxSeconds * 1000).rounded()))
    let total = max(1, Int(Double(analysedMs) * sampleFps / 1000))

    let generator = AVAssetImageGenerator(asset: asset)
    // Frames come out upright, so points are in the upright image.
    generator.appliesPreferredTrackTransform = true
    generator.maximumSize = CGSize(width: maxFrameSide, height: maxFrameSide)
    let tolerance = CMTime(seconds: 0.5 / sampleFps, preferredTimescale: 600)
    generator.requestedTimeToleranceBefore = tolerance
    generator.requestedTimeToleranceAfter = tolerance

    var frames: [[String: Any]] = []
    var width = 0
    var height = 0
    for i in 0..<total {
      if isCancelled() { throw ClipError(code: "cancelled", message: "Cancelled.") }
      let tMs = Int((Double(i) * 1000 / sampleFps).rounded())
      autoreleasepool {
        var actual = CMTime.zero
        guard let image = try? generator.copyCGImage(
          at: CMTime(value: CMTimeValue(tMs), timescale: 1000), actualTime: &actual
        ) else { return }
        width = image.width
        height = image.height
        let request = VNDetectHumanBodyPoseRequest()
        // A frame Vision can't read is just a dropped frame.
        guard
          (try? VNImageRequestHandler(cgImage: image, orientation: .up, options: [:]).perform([request])) != nil,
          let observation = request.results?.first,
          let found = try? points(
            from: observation, uprightWidth: Double(width), uprightHeight: Double(height)
          ),
          !found.isEmpty
        else { return }
        frames.append(["tMs": tMs, "points": found])
      }
      onProgress(i + 1, total)
    }

    return [
      "frames": frames,
      "durationMs": durationMs,
      "analysedMs": analysedMs,
      "truncated": durationMs > analysedMs,
      "sampled": total,
      "width": width,
      "height": height,
    ]
  }

  /// Joint names match the Dart PoseJoint enum.
  @available(iOS 15.0, *)
  private static let joints: [(String, VNHumanBodyPoseObservation.JointName)] = [
    ("nose", .nose),
    ("leftShoulder", .leftShoulder),
    ("rightShoulder", .rightShoulder),
    ("leftElbow", .leftElbow),
    ("rightElbow", .rightElbow),
    ("leftWrist", .leftWrist),
    ("rightWrist", .rightWrist),
    ("leftHip", .leftHip),
    ("rightHip", .rightHip),
    ("leftKnee", .leftKnee),
    ("rightKnee", .rightKnee),
    ("leftAnkle", .leftAnkle),
    ("rightAnkle", .rightAnkle),
  ]
}

private struct ClipError: Error {
  let code: String
  let message: String
}

/// One clip at a time, cancellable from the main thread.
private final class ClipState {
  private let lock = NSLock()
  private var running = false
  private var cancelled = false

  func begin() -> Bool {
    lock.lock(); defer { lock.unlock() }
    if running { return false }
    running = true
    cancelled = false
    return true
  }

  func end() {
    lock.lock(); defer { lock.unlock() }
    running = false
  }

  func cancel() {
    lock.lock(); defer { lock.unlock() }
    cancelled = true
  }

  var isCancelled: Bool {
    lock.lock(); defer { lock.unlock() }
    return cancelled
  }
}

/// Clip progress events for Dart. Touched on the main thread only.
private final class PoseProgressStream: NSObject, FlutterStreamHandler {
  private var sink: FlutterEventSink?

  func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
    sink = events
    return nil
  }

  func onCancel(withArguments arguments: Any?) -> FlutterError? {
    sink = nil
    return nil
  }

  func send(_ event: [String: Any]) {
    sink?(event)
  }
}
