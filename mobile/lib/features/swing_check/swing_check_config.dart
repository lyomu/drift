/// Swing Check stays hidden until launch. Build with
/// `--dart-define=DRIFT_SWING_CHECK=true` to show it in the AI Coach menu.
const bool kSwingCheckEnabled = bool.fromEnvironment('DRIFT_SWING_CHECK');

/// Recorded with every session so numbers from different pose models or
/// builds are never compared as like for like. There's no package_info_plus
/// in this app, so the version tracks pubspec's `version:` by hand (same as
/// settings_home_screen.dart).
const String kSwingCheckAppVersion = '0.9.0+6';

/// Swing Check needs Android 13+ or iOS 15+ (checked natively, see
/// NativePoseChannel). The app itself still installs on older versions.

/// Sessions stop on their own after this, to limit heat and battery drain.
const Duration kMaxCaptureDuration = Duration(minutes: 2);

/// Recorded clips: only this much is analysed, from the start. Longer clips
/// are analysed up to here and the result says so.
const Duration kMaxClipDuration = Duration(seconds: 60);

/// Pose model for recorded clips on Android. Test builds only: build with
/// `--dart-define=DRIFT_POSE_MODEL=mediapipe` to run MediaPipe Pose Landmarker
/// (the model the detector was calibrated on) instead of ML Kit
/// (VIDEO_AI_BUILD_PLAN.md B1 spike). Live capture always uses ML Kit.
const String kClipPoseModel = String.fromEnvironment(
  'DRIFT_POSE_MODEL',
  defaultValue: 'mlkit',
);

/// Frames analysed per second of a recorded clip. The detector was calibrated
/// on landmarks sampled at this rate (docs/ml/real-clips-inventory.md).
const double kClipSampleFps = 15;
