package app.driftsports.drift

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import android.media.Image
import android.util.Log
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker

/**
 * Debug and profile builds only (source set `src/mediapipe`, wired in
 * build.gradle.kts). Release builds get the stub in `src/release`, so neither
 * the MediaPipe runtime nor its 9 MB model ships to the store.
 */
internal object MediaPipePose {
    fun create(context: Context, joints: List<Pair<String, Int>>): FramePose =
        MediaPipeFramePose(context, joints)
}

/**
 * MediaPipe Pose Landmarker *full* (Apache-2.0), configured exactly like
 * `cv-service/tools/pose_fixtures.py`, which produced the landmarks Swing
 * Check was calibrated on. Unlike ML Kit it reports per-joint visibility,
 * used here as the likelihood, so a wrist hidden behind the body reads as
 * hidden. Test builds only for now (VIDEO_AI_BUILD_PLAN.md B1 spike).
 *
 * [joints] maps Dart joint names to landmark indices; ML Kit's PoseLandmark
 * constants use the same 33-point topology, so PoseBridge passes its table.
 */
private class MediaPipeFramePose(
    context: Context,
    private val joints: List<Pair<String, Int>>,
) : FramePose {
    /** GPU when this phone's driver takes the model, otherwise CPU. */
    private val delegate: String
    private val landmarker: PoseLandmarker
    private var convertNs = 0L
    private var inferNs = 0L
    private var frames = 0

    init {
        fun build(d: Delegate) = PoseLandmarker.createFromOptions(
            context,
            PoseLandmarker.PoseLandmarkerOptions.builder()
                .setBaseOptions(
                    BaseOptions.builder().setModelAssetPath(MODEL).setDelegate(d).build(),
                )
                .setRunningMode(RunningMode.VIDEO)
                .setNumPoses(1)
                .setMinPoseDetectionConfidence(0.5f)
                .setMinPosePresenceConfidence(0.5f)
                .setMinTrackingConfidence(0.5f)
                .build(),
        )
        var chosen = "gpu"
        landmarker = try {
            build(Delegate.GPU)
        } catch (e: Exception) {
            chosen = "cpu"
            build(Delegate.CPU)
        }
        delegate = chosen
    }

    override fun fromMediaImage(image: Image, rotation: Int, tMs: Long): List<Map<String, Any>> {
        // Half resolution: the model looks at 256 px crops, so full-size
        // frames only cost conversion time. Points are scaled back up.
        val start = System.nanoTime()
        val bitmap = yuvToBitmap(image, YUV_STEP)
        convertNs += System.nanoTime() - start
        try {
            return detect(bitmap, rotation, tMs, YUV_STEP.toDouble())
        } finally {
            bitmap.recycle()
        }
    }

    override fun fromBitmap(bitmap: Bitmap, rotation: Int, tMs: Long) = detect(bitmap, rotation, tMs, 1.0)

    private fun detect(bitmap: Bitmap, rotation: Int, tMs: Long, scale: Double): List<Map<String, Any>> {
        // Turned here rather than through ImageProcessingOptions, so the
        // normalised points are plainly in the upright image.
        val upright = if (rotation == 0) bitmap else Bitmap.createBitmap(
            bitmap, 0, 0, bitmap.width, bitmap.height,
            Matrix().apply { postRotate(rotation.toFloat()) }, true,
        )
        try {
            val start = System.nanoTime()
            val result = landmarker.detectForVideo(BitmapImageBuilder(upright).build(), tMs)
            inferNs += System.nanoTime() - start
            frames++
            val landmarks = result.landmarks().firstOrNull() ?: return emptyList()
            return joints.mapNotNull { (name, index) ->
                landmarks.getOrNull(index)?.let { lm ->
                    mapOf(
                        "joint" to name,
                        "x" to lm.x() * upright.width * scale,
                        "y" to lm.y() * upright.height * scale,
                        "likelihood" to (lm.visibility().orElse(0f)).toDouble(),
                    )
                }
            }
        } finally {
            if (upright !== bitmap) upright.recycle()
        }
    }

    override fun close() {
        if (frames > 0) {
            Log.i(
                TAG,
                "mediapipe: delegate=$delegate frames=$frames convertMsPerFrame=%.1f inferMsPerFrame=%.1f"
                    .format(convertNs / 1e6 / frames, inferNs / 1e6 / frames),
            )
        }
        landmarker.close()
    }

    /**
     * YUV_420_888 (limited-range BT.601, as phone video is) to ARGB_8888,
     * taking every [step]th pixel in each direction.
     */
    private fun yuvToBitmap(image: Image, step: Int): Bitmap {
        val crop = image.cropRect
        val w = crop.width() / step
        val h = crop.height() / step
        val (yPlane, uPlane, vPlane) = image.planes
        val yBuf = yPlane.buffer
        val uBuf = uPlane.buffer
        val vBuf = vPlane.buffer
        val yRow = yPlane.rowStride
        val yPix = yPlane.pixelStride
        val uvRow = uPlane.rowStride
        val uvPix = uPlane.pixelStride
        val out = IntArray(w * h)
        for (j in 0 until h) {
            val yy = crop.top + j * step
            val uvBase = (yy / 2) * uvRow
            val yBase = yy * yRow
            for (i in 0 until w) {
                val xx = crop.left + i * step
                val c = 1.164f * ((yBuf.get(yBase + xx * yPix).toInt() and 0xFF) - 16)
                val uvIndex = uvBase + (xx / 2) * uvPix
                val d = (uBuf.get(uvIndex).toInt() and 0xFF) - 128
                val e = (vBuf.get(uvIndex).toInt() and 0xFF) - 128
                val r = (c + 1.596f * e).toInt().coerceIn(0, 255)
                val g = (c - 0.392f * d - 0.813f * e).toInt().coerceIn(0, 255)
                val b = (c + 2.017f * d).toInt().coerceIn(0, 255)
                out[j * w + i] = (0xFF shl 24) or (r shl 16) or (g shl 8) or b
            }
        }
        return Bitmap.createBitmap(out, w, h, Bitmap.Config.ARGB_8888)
    }

    private companion object {
        const val TAG = "DriftPose"

        /** In src/mediapipe/assets, so only debug and profile builds carry it. */
        const val MODEL = "pose_landmarker_full.task"

        /** Clip frames are converted at 1/YUV_STEP resolution. */
        const val YUV_STEP = 2
    }
}
