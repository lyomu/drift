import 'pose_frame.dart';
import 'quality_gate.dart';
import 'swing_detector.dart';
import 'swing_metrics.dart';

/// Below this many measured swings there's no summary and no coach feedback.
/// Matches the backend's `MIN_MEASURED_FOR_FEEDBACK`.
const int kMinMeasuredSwings = 3;

/// Where the frames came from: the live camera or a clip already on the phone.
enum SwingSource {
  live('LIVE'),
  clip('CLIP');

  const SwingSource(this.apiValue);
  final String apiValue;

  static SwingSource fromApi(String? value) =>
      value == 'CLIP' ? SwingSource.clip : SwingSource.live;
}

/// What part of a recorded clip was analysed. Stored with the session's
/// metrics so the results can say "only the first 60 s were analysed".
class ClipInfo {
  const ClipInfo({required this.analysedMs, required this.truncated});

  /// Analysed from the start of the clip, in milliseconds.
  final int analysedMs;

  /// True when the clip was longer and only [analysedMs] was analysed.
  final bool truncated;

  Map<String, dynamic> toJson() => {'analysedMs': analysedMs, 'truncated': truncated};

  static ClipInfo? fromJson(Object? json) {
    if (json is! Map<String, dynamic>) return null;
    final analysedMs = json['analysedMs'];
    if (analysedMs is! num) return null;
    return ClipInfo(
      analysedMs: analysedMs.toInt(),
      truncated: json['truncated'] == true,
    );
  }
}

/// One swing's outcome: measured with values, or refused with a reason.
class SwingResult {
  const SwingResult({
    required this.index,
    required this.peakMs,
    required this.measured,
    this.reason,
    this.values = const {},
  });

  final int index;
  final int peakMs;
  final bool measured;
  final SwingRefusal? reason;
  final Map<String, double> values;

  Map<String, dynamic> toJson() => {
    'index': index,
    'tMs': peakMs,
    'measured': measured,
    if (!measured && reason != null) 'reason': reason!.apiValue,
    if (measured) 'values': values,
  };

  factory SwingResult.fromJson(Map<String, dynamic> json) {
    final rawValues = json['values'] as Map<String, dynamic>? ?? const {};
    return SwingResult(
      index: (json['index'] as num?)?.toInt() ?? 0,
      peakMs: (json['tMs'] as num?)?.toInt() ?? 0,
      measured: json['measured'] as bool? ?? false,
      reason: SwingRefusal.fromApi(json['reason'] as String?),
      values: {
        for (final entry in rawValues.entries)
          if (entry.value is num) entry.key: (entry.value as num).toDouble(),
      },
    );
  }
}

/// The analysed session, before or after it's saved.
class SwingSessionAnalysis {
  const SwingSessionAnalysis({
    required this.stroke,
    required this.hand,
    required this.swings,
    required this.summary,
    this.source = SwingSource.live,
    this.clip,
  });

  final SwingStroke stroke;
  final HittingHand hand;
  final List<SwingResult> swings;
  final Map<String, MetricSummary> summary;
  final SwingSource source;

  /// Set for [SwingSource.clip] sessions.
  final ClipInfo? clip;

  int get detected => swings.length;
  int get measured => swings.where((s) => s.measured).length;
  bool get hasEnoughSwings => measured >= kMinMeasuredSwings;

  Map<String, dynamic> toCreateJson({
    required String poseModel,
    required String appVersion,
  }) => {
    'stroke': stroke.apiValue,
    'dominantHand': hand.apiValue,
    'swingsDetected': detected,
    'swingsMeasured': measured,
    'source': source.apiValue,
    'metrics': {
      'swings': swings.map((s) => s.toJson()).toList(),
      if (clip != null) 'clip': clip!.toJson(),
    },
    'summary': {for (final e in summary.entries) e.key: e.value.toJson()},
    'poseModel': poseModel,
    'appVersion': appVersion,
  };
}

/// Runs detection, the quality gate and the metrics over a whole recording.
class SwingAnalyzer {
  const SwingAnalyzer({
    this.detector = const SwingDetector(),
    this.gate = const QualityGate(),
    this.metrics = const SwingMetricsCalculator(),
  });

  final SwingDetector detector;
  final QualityGate gate;
  final SwingMetricsCalculator metrics;

  SwingSessionAnalysis analyze(
    List<PoseFrame> frames,
    SwingStroke stroke,
    HittingHand hand, {
    SwingSource source = SwingSource.live,
    ClipInfo? clip,
  }) {
    final detected = detector.detect(frames, hand);
    final results = <SwingResult>[];
    for (var i = 0; i < detected.length; i++) {
      final swing = detected[i];
      final refusal = gate.check(swing, hand);
      results.add(
        refusal == null
            ? SwingResult(
                index: i,
                peakMs: swing.peakMs,
                measured: true,
                values: metrics.compute(swing, stroke, hand),
              )
            : SwingResult(
                index: i,
                peakMs: swing.peakMs,
                measured: false,
                reason: refusal,
              ),
      );
    }
    return SwingSessionAnalysis(
      stroke: stroke,
      hand: hand,
      swings: results,
      summary: summarize(results),
      source: source,
      clip: clip,
    );
  }

  /// Per-metric mean and spread over measured swings. Empty when fewer than
  /// [kMinMeasuredSwings] swings were measured: an average of one or two
  /// swings isn't a summary.
  static Map<String, MetricSummary> summarize(List<SwingResult> swings) {
    final measured = swings.where((s) => s.measured).toList();
    if (measured.length < kMinMeasuredSwings) return const {};
    final byKey = <String, List<double>>{};
    for (final swing in measured) {
      swing.values.forEach((key, value) => (byKey[key] ??= []).add(value));
    }
    return {
      for (final entry in byKey.entries)
        if (entry.value.isNotEmpty) entry.key: MetricSummary.of(entry.value),
    };
  }
}

/// One tip from the AI Coach, tied to a metric or "general".
class CoachTip {
  const CoachTip({required this.metric, required this.text});
  final String metric;
  final String text;
}

class CoachFeedback {
  const CoachFeedback({
    required this.locale,
    required this.overall,
    required this.tips,
  });

  final String locale;
  final String overall;
  final List<CoachTip> tips;

  static CoachFeedback? fromJson(Map<String, dynamic>? json) {
    if (json == null) return null;
    return CoachFeedback(
      locale: json['locale'] as String? ?? 'en',
      overall: json['overall'] as String? ?? '',
      tips: [
        for (final tip in json['tips'] as List<dynamic>? ?? const [])
          if (tip is Map<String, dynamic>)
            CoachTip(
              metric: tip['metric'] as String? ?? 'general',
              text: tip['text'] as String? ?? '',
            ),
      ],
    );
  }
}

/// A saved session as the API returns it.
class SwingSessionRecord {
  const SwingSessionRecord({
    required this.id,
    required this.stroke,
    required this.hand,
    required this.swingsDetected,
    required this.swingsMeasured,
    required this.summary,
    required this.createdAt,
    this.swings = const [],
    this.feedback,
    this.source = SwingSource.live,
    this.clip,
  });

  final String id;
  final SwingStroke stroke;
  final HittingHand hand;
  final int swingsDetected;
  final int swingsMeasured;
  final Map<String, MetricSummary> summary;
  final DateTime createdAt;

  /// Empty in history lists, which only carry the summary.
  final List<SwingResult> swings;
  final CoachFeedback? feedback;
  final SwingSource source;

  /// Set for clip sessions when the full record (not a history row) is loaded.
  final ClipInfo? clip;

  bool get hasEnoughSwings => swingsMeasured >= kMinMeasuredSwings;

  SwingSessionRecord copyWith({CoachFeedback? feedback}) => SwingSessionRecord(
    id: id,
    stroke: stroke,
    hand: hand,
    swingsDetected: swingsDetected,
    swingsMeasured: swingsMeasured,
    summary: summary,
    createdAt: createdAt,
    swings: swings,
    feedback: feedback ?? this.feedback,
    source: source,
    clip: clip,
  );

  factory SwingSessionRecord.fromJson(Map<String, dynamic> json) {
    final rawSummary = json['summary'] as Map<String, dynamic>? ?? const {};
    final metrics = json['metrics'] as Map<String, dynamic>?;
    final rawSwings = metrics?['swings'] as List<dynamic>? ?? const [];
    return SwingSessionRecord(
      id: json['id'] as String,
      stroke: SwingStroke.fromApi(json['stroke'] as String?),
      hand: HittingHand.fromProfile(json['dominantHand'] as String?),
      swingsDetected: (json['swingsDetected'] as num?)?.toInt() ?? 0,
      swingsMeasured: (json['swingsMeasured'] as num?)?.toInt() ?? 0,
      summary: {
        for (final entry in rawSummary.entries)
          if (entry.value is Map<String, dynamic>)
            entry.key: MetricSummary.fromJson(entry.value as Map<String, dynamic>),
      },
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      swings: [
        for (final swing in rawSwings)
          if (swing is Map<String, dynamic>) SwingResult.fromJson(swing),
      ],
      feedback: CoachFeedback.fromJson(json['feedback'] as Map<String, dynamic>?),
      source: SwingSource.fromApi(json['source'] as String?),
      clip: ClipInfo.fromJson(metrics?['clip']),
    );
  }
}
