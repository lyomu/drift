import 'package:intl/intl.dart';

import '../../../core/l10n/l10n.dart';
import '../domain/quality_gate.dart';
import '../domain/swing_metrics.dart';

/// Display names and units for metrics, formatted in the active locale.
abstract final class SwingMetricFormat {
  static String label(AppLocalizations l10n, String key) => switch (key) {
    SwingMetric.contactHeightPct => l10n.swingMetricContactHeight,
    SwingMetric.elbowAngleDeg => l10n.swingMetricElbowAngle,
    SwingMetric.kneeBendDeg => l10n.swingMetricKneeBend,
    SwingMetric.contactInFrontPct => l10n.swingMetricContactInFront,
    SwingMetric.tempoMs => l10n.swingMetricTempo,
    SwingMetric.finishAboveShoulderPct => l10n.swingMetricFinish,
    SwingMetric.trophyToContactMs => l10n.swingMetricTrophyToContact,
    _ => l10n.swingMetricGeneral,
  };

  /// One value with its unit: "52 %", "148°", "0.42 s".
  static String value(String localeTag, String key, double value) {
    final whole = NumberFormat.decimalPattern(localeTag)..maximumFractionDigits = 0;
    final seconds = NumberFormat.decimalPattern(localeTag)
      ..minimumFractionDigits = 2
      ..maximumFractionDigits = 2;
    return switch (key) {
      SwingMetric.elbowAngleDeg || SwingMetric.kneeBendDeg =>
        '${whole.format(value)}°',
      SwingMetric.tempoMs || SwingMetric.trophyToContactMs =>
        '${seconds.format(value / 1000)} s',
      _ => '${whole.format(value)} %',
    };
  }

  /// "±3°", "±0.05 s": the spread in the metric's own unit.
  static String spread(String localeTag, String key, double spread) =>
      '±${value(localeTag, key, spread)}';

  static String reason(AppLocalizations l10n, SwingRefusal? reason) => switch (reason) {
    SwingRefusal.armHidden => l10n.swingReasonArmHidden,
    SwingRefusal.outOfFrame => l10n.swingReasonOutOfFrame,
    SwingRefusal.tooFast => l10n.swingReasonTooFast,
    null => l10n.swingReasonOutOfFrame,
  };

  static String stroke(AppLocalizations l10n, SwingStroke stroke) =>
      stroke == SwingStroke.serve ? l10n.swingStrokeServe : l10n.swingStrokeForehand;
}
