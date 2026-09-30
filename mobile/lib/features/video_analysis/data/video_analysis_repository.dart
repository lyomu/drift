import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http_parser/http_parser.dart';

import '../../../core/network/dio_client.dart';

/// Mirrors the backend's `VideoAnalysisStatus`.
enum VideoAnalysisStatus {
  pending,
  rejected,
  accepted,
  analyzing,
  completed,
  failed;

  static VideoAnalysisStatus fromJson(String value) => switch (value) {
    'REJECTED' => VideoAnalysisStatus.rejected,
    'ACCEPTED' => VideoAnalysisStatus.accepted,
    'ANALYZING' => VideoAnalysisStatus.analyzing,
    'COMPLETED' => VideoAnalysisStatus.completed,
    'FAILED' => VideoAnalysisStatus.failed,
    _ => VideoAnalysisStatus.pending,
  };

  /// What to tell the person, in their terms rather than the enum's.
  ///
  /// `accepted` deliberately does not say "done". The clip passed the checks and
  /// nothing has analysed it yet — analysis is a separate, queued step — and a
  /// label like "Analysed" would be a straightforward lie to the user.
  String get label => switch (this) {
    VideoAnalysisStatus.pending => 'Checking…',
    VideoAnalysisStatus.rejected => "Can't be analysed",
    VideoAnalysisStatus.accepted => 'Ready to analyse',
    VideoAnalysisStatus.analyzing => 'Analysing…',
    VideoAnalysisStatus.completed => 'Analysed',
    VideoAnalysisStatus.failed => 'Something went wrong',
  };

  bool get isRejected => this == VideoAnalysisStatus.rejected;
}

/// One check from the CV service's precheck.
class PrecheckFinding {
  const PrecheckFinding({
    required this.check,
    required this.severity,
    required this.message,
  });

  final String check;
  final String severity; // pass | warn | reject
  final String message;

  bool get isBlocking => severity == 'reject';
  bool get isWarning => severity == 'warn';

  factory PrecheckFinding.fromJson(Map<String, dynamic> json) {
    return PrecheckFinding(
      check: json['check'] as String? ?? '',
      severity: json['severity'] as String? ?? 'pass',
      message: json['message'] as String? ?? '',
    );
  }
}

class VideoAnalysisJob {
  const VideoAnalysisJob({
    required this.id,
    required this.status,
    required this.originalFilename,
    required this.createdAt,
    this.rejectionReasons = const [],
    this.findings = const [],
    this.courtChecked = false,
    this.analysisResult,
    this.failureReason,
  });

  final String id;
  final VideoAnalysisStatus status;
  final String originalFilename;
  final DateTime createdAt;

  /// Messages written by the CV service to be shown as-is. They are not
  /// rephrased here: they are calibrated against real footage and say what to do
  /// about the problem, which a generic "invalid video" never could.
  final List<String> rejectionReasons;
  final List<PrecheckFinding> findings;

  /// Whether the court itself was judged. A clip can pass every check that ran
  /// while the court was never looked at, and saying "looks good" in that case
  /// would overstate what we know.
  final bool courtChecked;

  /// The pipeline's summary, exactly as it produced it.
  ///
  /// Deliberately an untyped map. Its shape belongs to the CV service and moves
  /// with it, and a Dart class mirroring it would be a third copy of a contract
  /// that already exists in Python and in Postgres. The screen reads the keys it
  /// knows and ignores the rest.
  final Map<String, dynamic>? analysisResult;

  /// Why an analysis gave up, in words meant for the person who uploaded it.
  final String? failureReason;

  /// Whether the court was successfully calibrated on this run.
  ///
  /// The single most important thing in the summary. Every distance and every
  /// speed is derived from a homography fitted to the court's painted lines; if
  /// that fit failed, those numbers are not measurements, and the pipeline says
  /// so itself rather than leaving it to be inferred.
  bool get courtCalibrated => analysisResult?['court_calibrated'] != false;

  /// The pipeline's own warning about this run, if it issued one.
  String? get analysisWarning => analysisResult?['warning'] as String?;

  /// Whether this job analysed a whole session rather than one rally.
  ///
  /// Read from the summary's own `mode`, not from a column: the backend decides which
  /// pipeline to run from the clip's duration and cv-service stamps the answer into the
  /// result. One source of truth, and it is the one that actually produced the numbers.
  bool get isSession => analysisResult?['mode'] == 'session';

  /// How many passages of play the pre-pass found in the video.
  int get segmentsFound => (analysisResult?['segments_found'] as num?)?.toInt() ?? 0;

  /// How many of those were actually measured.
  ///
  /// This can be fewer than [segmentsFound], and the gap is the single most important
  /// thing on a session screen: a session runs under a frame budget because the service
  /// has one GPU, so totals over 8 of 20 rallies are not totals over the session. The
  /// screen states both rather than letting the totals imply completeness.
  int get segmentsAnalysed =>
      (analysisResult?['segments_analysed'] as num?)?.toInt() ?? 0;

  /// Rallies found but not measured because the session ran out of budget.
  int get segmentsSkippedBudget =>
      (analysisResult?['segments_skipped_budget'] as num?)?.toInt() ?? 0;

  /// Rallies that were measured but had no usable court fit.
  ///
  /// They contribute shot counts and no speeds — the same rule this screen already
  /// applies to a single uncalibrated clip, one level up. See [courtCalibrated].
  int get segmentsUncalibrated =>
      (analysisResult?['segments_uncalibrated'] as num?)?.toInt() ?? 0;

  /// Whether some rallies were found but left unmeasured.
  bool get isPartialSession => isSession && segmentsFound > segmentsAnalysed;

  /// Session-wide totals. Empty for a single-clip job.
  Map<String, dynamic> get sessionTotals =>
      (analysisResult?['totals'] as Map<String, dynamic>?) ?? const {};

  /// Shot types summed across the session's measured rallies.
  Map<String, dynamic> get sessionShotTypes =>
      (analysisResult?['shot_types'] as Map<String, dynamic>?) ?? const {};

  /// Per-rally detail, in clip order, so a number can be traced to the rally it came from.
  List<SessionSegment> get segments {
    final raw = analysisResult?['segments'] as List<dynamic>? ?? const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(SessionSegment.fromJson)
        .toList();
  }

  bool get isFinished =>
      status == VideoAnalysisStatus.completed ||
      status == VideoAnalysisStatus.failed ||
      status == VideoAnalysisStatus.rejected;

  factory VideoAnalysisJob.fromJson(Map<String, dynamic> json) {
    final precheck = json['precheckResult'] as Map<String, dynamic>?;
    final rawFindings = precheck?['findings'] as List<dynamic>? ?? const [];

    return VideoAnalysisJob(
      id: json['id'] as String,
      status: VideoAnalysisStatus.fromJson(json['status'] as String? ?? ''),
      originalFilename: json['originalFilename'] as String? ?? 'video',
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      rejectionReasons:
          (json['rejectionReasons'] as List<dynamic>? ?? const [])
              .map((reason) => reason.toString())
              .toList(),
      findings: rawFindings
          .map((f) => PrecheckFinding.fromJson(f as Map<String, dynamic>))
          .toList(),
      courtChecked: precheck?['court_checked'] as bool? ?? false,
      analysisResult: json['analysisResult'] as Map<String, dynamic>?,
      failureReason: json['failureReason'] as String?,
    );
  }
}

/// One rally inside a session.
///
/// A segment always has a [status], including when it was not measured. "Not in the totals"
/// has to carry a reason a person can read — `skipped_budget` is a different thing from
/// `failed`, and showing an unexplained gap in a list of rallies invites the assumption that
/// the rally did not happen.
class SessionSegment {
  const SessionSegment({
    required this.index,
    required this.status,
    required this.startS,
    required this.endS,
    this.reason,
    this.summary,
  });

  final int index;
  final String status; // analysed | skipped_budget | skipped_too_short | failed
  final double startS;
  final double endS;
  final String? reason;
  final Map<String, dynamic>? summary;

  bool get wasAnalysed => status == 'analysed';

  /// Whether this rally's own court fit succeeded.
  ///
  /// Same reading as the job-level [VideoAnalysisJob.courtCalibrated] — `!= false`, so a
  /// summary omitting the key counts as calibrated. Three layers of this stack agree on that
  /// convention, and they have to: a layer that read it differently would stop showing the
  /// warning the other two show.
  bool get courtCalibrated => summary?['court_calibrated'] != false;

  int get shots {
    final p1 = (summary?['total_shots_p1'] as num?)?.toInt() ?? 0;
    final p2 = (summary?['total_shots_p2'] as num?)?.toInt() ?? 0;
    return p1 + p2;
  }

  /// Where this rally sits in the source video, as `m:ss`, for someone scrubbing to it.
  String get timestampLabel {
    String stamp(double seconds) {
      final total = seconds.round();
      final minutes = total ~/ 60;
      final secs = (total % 60).toString().padLeft(2, '0');
      return '$minutes:$secs';
    }

    return '${stamp(startS)}–${stamp(endS)}';
  }

  String get durationLabel => '${(endS - startS).round()}s';

  factory SessionSegment.fromJson(Map<String, dynamic> json) {
    final span = json['span'] as Map<String, dynamic>? ?? const {};
    return SessionSegment(
      index: (json['index'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? 'failed',
      startS: (span['start_s'] as num?)?.toDouble() ?? 0,
      endS: (span['end_s'] as num?)?.toDouble() ?? 0,
      reason: json['reason'] as String?,
      summary: json['summary'] as Map<String, dynamic>?,
    );
  }
}

/// Whether the CV service can judge a clip right now.
class CvServiceStatus {
  const CvServiceStatus({required this.up, required this.courtModelLoaded});

  final bool up;
  final bool courtModelLoaded;

  factory CvServiceStatus.fromJson(Map<String, dynamic> json) {
    return CvServiceStatus(
      up: json['status'] == 'ok',
      courtModelLoaded: json['court_model_loaded'] as bool? ?? false,
    );
  }
}

class VideoAnalysisException implements Exception {
  const VideoAnalysisException(this.message);
  final String message;
  @override
  String toString() => message;
}

class VideoAnalysisRepository {
  VideoAnalysisRepository(this._dio);

  final Dio _dio;

  /// Upload a clip and get back the job with its verdict already decided.
  ///
  /// [onProgress] reports 0..1 of the upload itself. The check that follows on
  /// the server is fast (well under two seconds) but not instant, so the last
  /// stretch of any progress bar wired to this is the server thinking, not the
  /// upload stalling.
  Future<VideoAnalysisJob> upload(
    String filePath, {
    void Function(double progress)? onProgress,
    CancelToken? cancelToken,
  }) async {
    final filename = filePath.split(RegExp(r'[/\\]')).last;
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        filePath,
        filename: filename,
        // Sent explicitly because the server refuses anything whose type is not
        // video/*, and a file picked from a gallery does not always arrive with
        // a type Dio can infer.
        contentType: MediaType('video', _extensionOf(filename)),
      ),
    });

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/video-analysis',
        data: form,
        cancelToken: cancelToken,
        onSendProgress: (sent, total) {
          if (total > 0) onProgress?.call(sent / total);
        },
        options: Options(
          // Videos are large and the server runs a check before replying. The
          // default one-minute receive timeout would abort a perfectly healthy
          // upload on a slow connection.
          sendTimeout: const Duration(minutes: 10),
          receiveTimeout: const Duration(minutes: 2),
        ),
      );
      return VideoAnalysisJob.fromJson(response.data!);
    } on DioException catch (error) {
      throw _asException(error);
    }
  }

  /// Ask for a clip to be analysed. Returns the job, now queued.
  Future<VideoAnalysisJob> requestAnalysis(String jobId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/video-analysis/$jobId/analyze',
      );
      return VideoAnalysisJob.fromJson(response.data!);
    } on DioException catch (error) {
      throw _asException(error);
    }
  }

  Future<VideoAnalysisJob> fetch(String jobId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/video-analysis/$jobId',
      );
      return VideoAnalysisJob.fromJson(response.data!);
    } on DioException catch (error) {
      throw _asException(error);
    }
  }

  Future<List<VideoAnalysisJob>> list() async {
    try {
      final response = await _dio.get<List<dynamic>>('/video-analysis');
      return (response.data ?? const [])
          .map((job) => VideoAnalysisJob.fromJson(job as Map<String, dynamic>))
          .toList();
    } on DioException catch (error) {
      throw _asException(error);
    }
  }

  Future<CvServiceStatus> serviceStatus() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/video-analysis/service-status',
      );
      return CvServiceStatus.fromJson(response.data!);
    } on DioException {
      // Unreachable is a status, not an error worth throwing: the caller wants
      // to know whether to offer the upload at all.
      return const CvServiceStatus(up: false, courtModelLoaded: false);
    }
  }

  String _extensionOf(String filename) {
    final dot = filename.lastIndexOf('.');
    if (dot == -1 || dot == filename.length - 1) return 'mp4';
    return filename.substring(dot + 1).toLowerCase();
  }

  VideoAnalysisException _asException(DioException error) {
    if (error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionTimeout) {
      return const VideoAnalysisException(
        'The upload timed out. Check your connection and try again — a shorter '
        'clip will upload faster.',
      );
    }
    if (error.type == DioExceptionType.connectionError) {
      return const VideoAnalysisException(
        "Couldn't reach Drift. Check your connection and try again.",
      );
    }

    final data = error.response?.data;
    final message = data is Map<String, dynamic> ? data['message'] : null;
    final text = message is List ? message.join(' ') : message?.toString();
    return VideoAnalysisException(
      text ?? 'Something went wrong uploading that video. Please try again.',
    );
  }
}

final videoAnalysisRepositoryProvider = Provider<VideoAnalysisRepository>((ref) {
  return VideoAnalysisRepository(ref.watch(dioClientProvider));
});
