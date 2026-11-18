// Runs the app's own Swing Check analyzer on a pose fixture, offline.
//
// Used by the cv-service Analysis Lab (cv-service/lab/) so the lab and the app
// share one detector, one quality gate and one set of metrics. The fixture is
// the JSON written by cv-service/tools/pose_fixtures.py.
//
//   dart run tool/swing_analyze.dart <fixture.json> [--hand right|left]
//
// Prints one JSON object to stdout.
import 'dart:convert';
import 'dart:io';

import 'package:drift_tennis/features/swing_check/domain/pose_frame.dart';
import 'package:drift_tennis/features/swing_check/domain/swing_metrics.dart';
import 'package:drift_tennis/features/swing_check/domain/swing_session.dart';

/// Pose frames from a fixture: `frames[].p` holds the 13 joints in
/// [PoseJoint] order as `[x, y, likelihood]`.
List<PoseFrame> framesFromFixture(Map<String, dynamic> fixture) {
  final joints = PoseJoint.values;
  return [
    for (final f in fixture['frames'] as List)
      PoseFrame(
        tMs: (f as Map<String, dynamic>)['t'] as int,
        points: {
          for (var i = 0; i < joints.length; i++)
            joints[i]: PosePoint(
              ((f['p'] as List)[i] as List)[0].toDouble(),
              ((f['p'] as List)[i] as List)[1].toDouble(),
              ((f['p'] as List)[i] as List)[2].toDouble(),
            ),
        },
      ),
  ];
}

/// Analyses every swing twice, once with forehand metrics and once with serve
/// metrics, and tags each swing as overhead when the hitting wrist is above
/// the nose at contact. The lab shows the metric set that matches the tag.
Map<String, dynamic> analyzeFixture(
  Map<String, dynamic> fixture,
  HittingHand hand,
) {
  final frames = framesFromFixture(fixture);
  const analyzer = SwingAnalyzer();
  final forehand = analyzer.analyze(frames, SwingStroke.forehand, hand);
  final serve = analyzer.analyze(frames, SwingStroke.serve, hand);
  final detected = analyzer.detector.detect(frames, hand);

  final swings = <Map<String, dynamic>>[];
  for (var i = 0; i < forehand.swings.length; i++) {
    final fh = forehand.swings[i];
    final contact = detected[i].contactFrame;
    final wrist = contact.reliable(hand.wrist);
    final nose = contact.reliable(PoseJoint.nose);
    final overhead = wrist != null && nose != null && wrist.y < nose.y;
    swings.add({
      'index': i,
      'peakMs': fh.peakMs,
      'peakSpeed': double.parse(detected[i].peakSpeed.toStringAsFixed(2)),
      'measured': fh.measured,
      if (fh.reason != null) 'reason': fh.reason!.apiValue,
      'overhead': overhead,
      'values': overhead ? serve.swings[i].values : fh.values,
    });
  }
  return {
    'hand': hand.apiValue,
    'framesWithPose': frames.length,
    'detector': {
      'peakSpeed': analyzer.detector.config.peakSpeed,
      'mergeWithinMs': analyzer.detector.config.mergeWithinMs,
    },
    'swings': swings,
    'summaryForehand': {
      for (final e in forehand.summary.entries) e.key: e.value.toJson(),
    },
    'summaryServe': {
      for (final e in serve.summary.entries) e.key: e.value.toJson(),
    },
  };
}

void main(List<String> args) {
  if (args.isEmpty) {
    stderr.writeln('usage: dart run tool/swing_analyze.dart <fixture.json> [--hand right|left]');
    exitCode = 64;
    return;
  }
  final handIndex = args.indexOf('--hand');
  final hand = handIndex >= 0 && handIndex + 1 < args.length && args[handIndex + 1] == 'left'
      ? HittingHand.left
      : HittingHand.right;
  final fixture =
      jsonDecode(File(args.first).readAsStringSync()) as Map<String, dynamic>;
  stdout.write(jsonEncode(analyzeFixture(fixture, hand)));
}
