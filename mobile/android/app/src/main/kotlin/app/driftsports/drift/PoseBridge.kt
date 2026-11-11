package app.driftsports.drift

import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.Pose
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.PoseLandmark
import com.google.mlkit.vision.pose.accurate.AccuratePoseDetectorOptions
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToLong

/**
 * Swing Check pose detection on Android: Google ML Kit (accurate model,
 * stream mode) on NV21 camera frames sent from Dart, or on frames decoded
 * here from a video file the player picked.
 *
 * Available on Android 13 (API 33) and later only; that's a product floor,
 * not an ML Kit limit. Frames are processed in memory and dropped; nothing is
 * stored or sent anywhere.
 *
 * Channel contract (shared with lib/features/swing_check/data/native_pose_channel.dart):
 *  - isSupported() -> Boolean
 *  - process({bytes, width, height, rotation}) -> List<Map{joint, x, y, likelihood}>
 *    Coordinates are pixels in the upright (rotated) image. Empty list = no person.
 *  - processVideo({path, sampleFps, maxSeconds}) -> Map{frames: List<Map{tMs, points}>,
 *    durationMs, analysedMs, truncated, sampled, width, height}
 *    Frames with no person are left out. Progress goes out on the
 *    `pose_progress` event channel as {done, total}. Errors: unsupported,
 *    bad_args, busy, unreadable, cancelled, failed.
 *  - cancelVideo()
 *  - close()
 */
class PoseBridge(messenger: BinaryMessenger) : MethodChannel.MethodCallHandler {
    private val channel = MethodChannel(messenger, CHANNEL)
    private val progressChannel = EventChannel(messenger, PROGRESS_CHANNEL)
    private val main = Handler(Looper.getMainLooper())
    private var detector: PoseDetector? = null

    private val clipExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private val clipRunning = AtomicBoolean(false)
    private val clipCancelled = AtomicBoolean(false)
    @Volatile private var progressSink: EventChannel.EventSink? = null

    init {
        channel.setMethodCallHandler(this)
        progressChannel.setStreamHandler(object : EventChannel.StreamHandler {
            override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
                progressSink = events
            }

            override fun onCancel(arguments: Any?) {
                progressSink = null
            }
        })
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "isSupported" -> result.success(isSupported())
            "process" -> process(call, result)
            "processVideo" -> processVideo(call, result)
            "cancelVideo" -> {
                clipCancelled.set(true)
                result.success(null)
            }
            "close" -> {
                detector?.close()
                detector = null
                result.success(null)
            }
            else -> result.notImplemented()
        }
    }

    private fun isSupported() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU

    private fun process(call: MethodCall, result: MethodChannel.Result) {
        if (!isSupported()) {
            result.error("unsupported", "Swing Check needs Android 13 or later.", null)
            return
        }
        val bytes = call.argument<ByteArray>("bytes")
        val width = call.argument<Int>("width")
        val height = call.argument<Int>("height")
        val rotation = call.argument<Int>("rotation") ?: 0
        if (bytes == null || width == null || height == null) {
            result.error("bad_args", "bytes, width and height are required.", null)
            return
        }

        val image = try {
            InputImage.fromByteArray(bytes, width, height, rotation, InputImage.IMAGE_FORMAT_NV21)
        } catch (e: Exception) {
            result.error("bad_image", e.message, null)
            return
        }

        val pose = detector ?: newDetector().also { detector = it }

        pose.process(image)
            .addOnSuccessListener { found ->
                val points = pointsOf(found)
                main.post { result.success(points) }
            }
            .addOnFailureListener { e ->
                main.post { result.error("failed", e.message, null) }
            }
    }

    private fun processVideo(call: MethodCall, result: MethodChannel.Result) {
        if (!isSupported()) {
            result.error("unsupported", "Swing Check needs Android 13 or later.", null)
            return
        }
        val path = call.argument<String>("path")
        val sampleFps = call.argument<Number>("sampleFps")?.toDouble() ?: 15.0
        val maxSeconds = call.argument<Number>("maxSeconds")?.toDouble() ?: 60.0
        if (path.isNullOrBlank() || sampleFps <= 0 || sampleFps > 60 || maxSeconds <= 0) {
            result.error("bad_args", "path, sampleFps (0-60] and maxSeconds > 0 are required.", null)
            return
        }
        if (!clipRunning.compareAndSet(false, true)) {
            result.error("busy", "A clip is already being analysed.", null)
            return
        }
        clipCancelled.set(false)
        clipExecutor.execute {
            try {
                val reply = analyseClip(path, sampleFps, maxSeconds)
                main.post { result.success(reply) }
            } catch (e: ClipError) {
                main.post { result.error(e.code, e.message, null) }
            } catch (e: Exception) {
                main.post { result.error("failed", e.message, null) }
            } finally {
                clipRunning.set(false)
            }
        }
    }

    /**
     * Decodes one frame every 1/[sampleFps] s for up to [maxSeconds] and runs
     * the pose detector on each. Runs on [clipExecutor], never the main thread.
     */
    private fun analyseClip(path: String, sampleFps: Double, maxSeconds: Double): Map<String, Any> {
        val retriever = MediaMetadataRetriever()
        try {
            retriever.setDataSource(path)
        } catch (e: Exception) {
            retriever.release()
            throw ClipError("unreadable", e.message)
        }
        val clipDetector = newDetector()
        try {
            if (retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_VIDEO) != "yes") {
                throw ClipError("unreadable", "The file has no video track.")
            }
            val durationMs = retriever
                .extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                ?.toLongOrNull()
                ?.takeIf { it > 0 }
                ?: throw ClipError("unreadable", "The video has no duration.")
            val rotation = retriever
                .extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)
                ?.toIntOrNull() ?: 0
            val rawWidth = retriever
                .extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)
                ?.toIntOrNull() ?: 0
            val rawHeight = retriever
                .extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)
                ?.toIntOrNull() ?: 0

            val analysedMs = min(durationMs, (maxSeconds * 1000).roundToLong())
            val total = max(1, (analysedMs * sampleFps / 1000.0).toInt())
            val frames = ArrayList<Map<String, Any>>()
            var uprightWidth = 0
            var uprightHeight = 0

            for (i in 0 until total) {
                if (clipCancelled.get()) throw ClipError("cancelled", "Cancelled.")
                val tMs = (i * 1000.0 / sampleFps).roundToLong()
                val bitmap: Bitmap? = retriever.getScaledFrameAtTime(
                    tMs * 1000,
                    MediaMetadataRetriever.OPTION_CLOSEST,
                    MAX_FRAME_SIDE,
                    MAX_FRAME_SIDE,
                )
                if (bitmap != null) {
                    // The platform normally returns frames already upright. If a
                    // quarter-turn video comes back in its stored shape, turn it
                    // here so the points are in the upright image either way.
                    val quarterTurn = rotation == 90 || rotation == 270
                    val storedShape = rawWidth > 0 && rawHeight > 0 &&
                        (bitmap.width > bitmap.height) == (rawWidth > rawHeight)
                    val turn = if (quarterTurn && storedShape) rotation else 0
                    uprightWidth = if (turn != 0) bitmap.height else bitmap.width
                    uprightHeight = if (turn != 0) bitmap.width else bitmap.height
                    try {
                        val pose = Tasks.await(clipDetector.process(InputImage.fromBitmap(bitmap, turn)))
                        val points = pointsOf(pose)
                        if (points.isNotEmpty()) {
                            frames.add(mapOf("tMs" to tMs, "points" to points))
                        }
                    } catch (e: Exception) {
                        // A frame the detector can't read is just a dropped frame.
                    } finally {
                        bitmap.recycle()
                    }
                }
                val done = i + 1
                if (done == total || done % PROGRESS_EVERY == 0) {
                    main.post { progressSink?.success(mapOf("done" to done, "total" to total)) }
                }
            }

            return mapOf(
                "frames" to frames,
                "durationMs" to durationMs,
                "analysedMs" to analysedMs,
                "truncated" to (durationMs > analysedMs),
                "sampled" to total,
                "width" to uprightWidth,
                "height" to uprightHeight,
            )
        } finally {
            clipDetector.close()
            retriever.release()
        }
    }

    private fun newDetector(): PoseDetector = PoseDetection.getClient(
        AccuratePoseDetectorOptions.Builder()
            .setDetectorMode(AccuratePoseDetectorOptions.STREAM_MODE)
            .build(),
    )

    private fun pointsOf(pose: Pose): List<Map<String, Any>> = JOINTS.mapNotNull { (name, type) ->
        pose.getPoseLandmark(type)?.let { landmark ->
            mapOf(
                "joint" to name,
                "x" to landmark.position.x.toDouble(),
                "y" to landmark.position.y.toDouble(),
                "likelihood" to landmark.inFrameLikelihood.toDouble(),
            )
        }
    }

    fun dispose() {
        clipCancelled.set(true)
        clipExecutor.shutdown()
        channel.setMethodCallHandler(null)
        progressChannel.setStreamHandler(null)
        progressSink = null
        detector?.close()
        detector = null
    }

    private class ClipError(val code: String, message: String?) : Exception(message)

    companion object {
        const val CHANNEL = "app.driftsports.drift/pose"
        const val PROGRESS_CHANNEL = "app.driftsports.drift/pose_progress"

        /** Long side of decoded clip frames; enough for a player 3-5 m away. */
        private const val MAX_FRAME_SIDE = 640

        /** Progress events every this many frames. */
        private const val PROGRESS_EVERY = 5

        /** Joint names match the Dart PoseJoint enum. */
        private val JOINTS = listOf(
            "nose" to PoseLandmark.NOSE,
            "leftShoulder" to PoseLandmark.LEFT_SHOULDER,
            "rightShoulder" to PoseLandmark.RIGHT_SHOULDER,
            "leftElbow" to PoseLandmark.LEFT_ELBOW,
            "rightElbow" to PoseLandmark.RIGHT_ELBOW,
            "leftWrist" to PoseLandmark.LEFT_WRIST,
            "rightWrist" to PoseLandmark.RIGHT_WRIST,
            "leftHip" to PoseLandmark.LEFT_HIP,
            "rightHip" to PoseLandmark.RIGHT_HIP,
            "leftKnee" to PoseLandmark.LEFT_KNEE,
            "rightKnee" to PoseLandmark.RIGHT_KNEE,
            "leftAnkle" to PoseLandmark.LEFT_ANKLE,
            "rightAnkle" to PoseLandmark.RIGHT_ANKLE,
        )
    }
}
