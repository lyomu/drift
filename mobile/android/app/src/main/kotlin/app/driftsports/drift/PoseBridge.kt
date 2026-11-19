package app.driftsports.drift

import android.content.Context
import android.graphics.Bitmap
import android.media.Image
import android.util.Log
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaExtractor
import android.media.MediaFormat
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
class PoseBridge(
    private val context: Context,
    messenger: BinaryMessenger,
) : MethodChannel.MethodCallHandler {
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
        // Test builds only (DRIFT_POSE_MODEL): "mediapipe" runs the model the
        // detector was calibrated on instead of ML Kit. Default ML Kit.
        val poseModel = call.argument<String>("poseModel") ?: "mlkit"
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
                val reply = analyseClip(path, sampleFps, maxSeconds, poseModel)
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
     * Analyses one frame every 1/[sampleFps] s for up to [maxSeconds]. Runs on
     * [clipExecutor], never the main thread.
     *
     * Frames come from a sequential [MediaCodec] decode ([analyseWithCodec]):
     * seeking with `MediaMetadataRetriever.getScaledFrameAtTime` decodes forward
     * from the previous keyframe for every sample, which measured 0.85-0.97 s per
     * frame on a Helio G37 phone (docs/ml/real-clips-inventory.md, B1). If the
     * decoder can't hand out images, the retriever path is the fallback.
     */
    private fun analyseClip(
        path: String,
        sampleFps: Double,
        maxSeconds: Double,
        poseModel: String,
    ): Map<String, Any> {
        val retriever = MediaMetadataRetriever()
        try {
            retriever.setDataSource(path)
        } catch (e: Exception) {
            retriever.release()
            throw ClipError("unreadable", e.message)
        }
        val framePose: FramePose = try {
            // MediaPipePose is only real in debug/profile builds (src/mediapipe);
            // the release stub throws, which surfaces as "failed" below.
            if (poseModel == "mediapipe") MediaPipePose.create(context, JOINTS) else MlKitFramePose(newDetector())
        } catch (e: Exception) {
            retriever.release()
            throw ClipError("failed", "Pose model didn't load: ${e.message}")
        }
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
            val run = ClipRun(framePose, total)

            var decoder = "mediacodec"
            if (!analyseWithCodec(path, sampleFps, analysedMs, rotation, run)) {
                decoder = "retriever"
                analyseWithRetriever(retriever, sampleFps, rotation, rawWidth, rawHeight, run)
            }
            run.progress(total)

            val wallNs = System.nanoTime() - run.startedNs
            val perFrame = { ns: Long -> if (run.sampled > 0) ns / 1_000_000.0 / run.sampled else 0.0 }
            Log.i(
                TAG,
                "clip: model=$poseModel decoder=$decoder sampled=${run.sampled} withPerson=${run.frames.size} " +
                    "analysedMs=$analysedMs rotation=$rotation raw=${rawWidth}x$rawHeight " +
                    "upright=${run.uprightWidth}x${run.uprightHeight} " +
                    "decodeMsPerFrame=%.1f poseMsPerFrame=%.1f wallMs=%d".format(
                        perFrame(wallNs - run.poseNs), perFrame(run.poseNs), wallNs / 1_000_000,
                    ),
            )

            return mapOf(
                "frames" to run.frames,
                "durationMs" to durationMs,
                "analysedMs" to analysedMs,
                "truncated" to (durationMs > analysedMs),
                "sampled" to run.sampled,
                "width" to run.uprightWidth,
                "height" to run.uprightHeight,
            )
        } finally {
            framePose.close()
            retriever.release()
        }
    }

    /** Bookkeeping shared by both decode paths. */
    private inner class ClipRun(val framePose: FramePose, val total: Int) {
        val frames = ArrayList<Map<String, Any>>()
        val startedNs = System.nanoTime()
        var poseNs = 0L
        var sampled = 0
        var uprightWidth = 0
        var uprightHeight = 0

        /** Runs [detector] on one frame and keeps the frame if a person was found. */
        fun detect(tMs: Long, detector: () -> List<Map<String, Any>>) {
            try {
                val start = System.nanoTime()
                val points = detector()
                poseNs += System.nanoTime() - start
                if (points.isNotEmpty()) frames.add(mapOf("tMs" to tMs, "points" to points))
            } catch (e: Exception) {
                // A frame the detector can't read is just a dropped frame.
            }
        }

        fun sampledOne() {
            sampled++
            if (sampled % PROGRESS_EVERY == 0) progress(min(sampled, total))
        }

        fun progress(done: Int) {
            main.post { progressSink?.success(mapOf("done" to done, "total" to total)) }
        }
    }

    /**
     * Decodes the clip in order and samples frames by presentation time.
     * Returns false, having analysed nothing, if this phone's decoder can't
     * give YUV images (the caller then falls back to the retriever).
     *
     * Decoder images are in the video's stored orientation, so ML Kit gets the
     * track rotation and returns points in the upright image.
     */
    private fun analyseWithCodec(
        path: String,
        sampleFps: Double,
        analysedMs: Long,
        rotation: Int,
        run: ClipRun,
    ): Boolean {
        val extractor = MediaExtractor()
        var codec: MediaCodec? = null
        try {
            try {
                extractor.setDataSource(path)
            } catch (e: Exception) {
                return false
            }
            val track = (0 until extractor.trackCount).firstOrNull {
                extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("video/") == true
            } ?: return false
            extractor.selectTrack(track)
            val format = extractor.getTrackFormat(track)
            val mime = format.getString(MediaFormat.KEY_MIME) ?: return false
            format.setInteger(
                MediaFormat.KEY_COLOR_FORMAT,
                MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Flexible,
            )
            val decoder = try {
                MediaCodec.createDecoderByType(mime).also {
                    codec = it
                    it.configure(format, null, null, 0)
                    it.start()
                }
            } catch (e: Exception) {
                return false
            }

            val info = MediaCodec.BufferInfo()
            val endUs = analysedMs * 1000
            val stepUs = 1_000_000.0 / sampleFps
            // A quarter of a sample step of slack, so a 30 fps clip sampled at
            // 15 fps takes every other frame instead of drifting.
            val slackUs = stepUs / 4
            var nextSampleUs = 0.0
            var firstPtsUs = -1L
            var inputDone = false
            var outputDone = false

            while (!outputDone) {
                if (clipCancelled.get()) throw ClipError("cancelled", "Cancelled.")
                if (!inputDone) {
                    val inIndex = decoder.dequeueInputBuffer(CODEC_TIMEOUT_US)
                    if (inIndex >= 0) {
                        val buffer = decoder.getInputBuffer(inIndex)
                        val size = if (buffer == null) -1 else extractor.readSampleData(buffer, 0)
                        // Feed a second past the end: B-frames arrive out of order.
                        if (size < 0 || extractor.sampleTime > endUs + 1_000_000) {
                            decoder.queueInputBuffer(inIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                            inputDone = true
                        } else {
                            decoder.queueInputBuffer(inIndex, 0, size, extractor.sampleTime, 0)
                            extractor.advance()
                        }
                    }
                }

                val outIndex = decoder.dequeueOutputBuffer(info, CODEC_TIMEOUT_US)
                if (outIndex < 0) continue
                if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) outputDone = true
                if (info.size <= 0) {
                    decoder.releaseOutputBuffer(outIndex, false)
                    continue
                }
                if (firstPtsUs < 0) firstPtsUs = info.presentationTimeUs
                val ptsUs = info.presentationTimeUs - firstPtsUs
                if (ptsUs > endUs || run.sampled >= run.total) {
                    decoder.releaseOutputBuffer(outIndex, false)
                    outputDone = true
                    continue
                }
                if (ptsUs + slackUs >= nextSampleUs) {
                    while (nextSampleUs <= ptsUs + slackUs) nextSampleUs += stepUs
                    val image = try {
                        decoder.getOutputImage(outIndex)
                    } catch (e: Exception) {
                        null
                    }
                    if (image == null) {
                        decoder.releaseOutputBuffer(outIndex, false)
                        if (run.sampled == 0) return false
                        run.sampledOne()
                        continue
                    }
                    val crop = image.cropRect
                    val quarterTurn = rotation == 90 || rotation == 270
                    run.uprightWidth = if (quarterTurn) crop.height() else crop.width()
                    run.uprightHeight = if (quarterTurn) crop.width() else crop.height()
                    run.detect(ptsUs / 1000) { run.framePose.fromMediaImage(image, rotation, ptsUs / 1000) }
                    image.close()
                    run.sampledOne()
                }
                decoder.releaseOutputBuffer(outIndex, false)
            }
            return true
        } finally {
            try {
                codec?.stop()
            } catch (e: Exception) {
                // Never started, or already stopped.
            }
            codec?.release()
            extractor.release()
        }
    }

    /** The original path: one seek-and-decode per sample. Slow; fallback only. */
    private fun analyseWithRetriever(
        retriever: MediaMetadataRetriever,
        sampleFps: Double,
        rotation: Int,
        rawWidth: Int,
        rawHeight: Int,
        run: ClipRun,
    ) {
        for (i in 0 until run.total) {
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
                run.uprightWidth = if (turn != 0) bitmap.height else bitmap.width
                run.uprightHeight = if (turn != 0) bitmap.width else bitmap.height
                try {
                    run.detect(tMs) { run.framePose.fromBitmap(bitmap, turn, tMs) }
                } finally {
                    bitmap.recycle()
                }
            }
            run.sampledOne()
        }
    }

    /** Google ML Kit, accurate model: the shipped default. */
    private inner class MlKitFramePose(private val detector: PoseDetector) : FramePose {
        override fun fromMediaImage(image: Image, rotation: Int, tMs: Long) =
            pointsOf(Tasks.await(detector.process(InputImage.fromMediaImage(image, rotation))))

        override fun fromBitmap(bitmap: Bitmap, rotation: Int, tMs: Long) =
            pointsOf(Tasks.await(detector.process(InputImage.fromBitmap(bitmap, rotation))))

        override fun close() = detector.close()
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
        private const val TAG = "DriftPose"

        /** How long one MediaCodec dequeue waits, in microseconds. */
        private const val CODEC_TIMEOUT_US = 10_000L

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

/**
 * One pose model for recorded clips. Points come back in the upright image.
 * Internal rather than private so MediaPipePose (src/mediapipe, debug and
 * profile builds only) can implement it.
 */
internal interface FramePose : AutoCloseable {
    /** A decoder image in its stored orientation; [rotation] turns it upright. */
    fun fromMediaImage(image: Image, rotation: Int, tMs: Long): List<Map<String, Any>>

    /** A bitmap; [rotation] turns it upright. */
    fun fromBitmap(bitmap: Bitmap, rotation: Int, tMs: Long): List<Map<String, Any>>
}
