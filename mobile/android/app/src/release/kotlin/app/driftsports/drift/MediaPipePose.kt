package app.driftsports.drift

import android.content.Context

/**
 * Release builds don't carry MediaPipe (its runtime and 9 MB model added
 * ~13 MB to every phone's download for a test-only spike). The real
 * implementation lives in src/mediapipe and is compiled into debug and
 * profile builds only. A release build always runs ML Kit, because
 * DRIFT_POSE_MODEL defaults to "mlkit", so this is only reached if someone
 * builds a release with DRIFT_POSE_MODEL=mediapipe.
 */
internal object MediaPipePose {
    fun create(context: Context, joints: List<Pair<String, Int>>): FramePose =
        throw UnsupportedOperationException("MediaPipe isn't included in release builds.")
}
