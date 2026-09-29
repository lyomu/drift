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
  /// nothing has analysed it — analysis is not built yet — and a label like
  /// "Analysed" would be a straightforward lie to the user.
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
