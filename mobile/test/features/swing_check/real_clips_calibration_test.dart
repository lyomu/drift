// Swing Check calibration against real footage.
//
// Fixtures in fixtures/real/ are pose landmarks only (no video), extracted from
// the owner's real clips with cv-service/tools/pose_fixtures.py (MediaPipe Pose
// full, sampled at 15 fps, frames without a person dropped, like the app's pose
// source). fixtures/real/labels.json holds hand labels: the hitting hand and the
// approximate contact time of every swing by the tracked player.
//
// The first test prints the per-clip report and the threshold sweep used to
// tune SwingDetectorConfig. The second pins the tuned defaults so a later edit
// can't quietly make detection worse on real footage.
//
//   flutter test test/features/swing_check/real_clips_calibration_test.dart
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/swing_check/domain/pose_frame.dart';
import 'package:drift_tennis/features/swing_check/domain/quality_gate.dart';
import 'package:drift_tennis/features/swing_check/domain/swing_detector.dart';
import 'package:drift_tennis/features/swing_check/domain/swing_metrics.dart';
import 'package:drift_tennis/features/swing_check/domain/swing_session.dart';

const _dir = 'test/features/swing_check/fixtures/real';

/// A detection within this distance of a labelled contact counts as a hit.
/// Labels are read off 0.25 s frame strips and "contact" is peak wrist speed,
/// so a tight tolerance would score labelling error, not detection error.
const _toleranceMs = 400;

class _Label {
  _Label(this.tMs, this.type);
  final int tMs;
  final String type; // fh | bh | serve | volley
}

class _Clip {
  _Clip(this.id, this.hand, this.stroke, this.frames, this.labels, this.note);
  final String id;
  final HittingHand hand;
  final SwingStroke stroke;
  final List<PoseFrame> frames;
  final List<_Label> labels;
  final String note;
}

List<_Clip> _loadClips() {
  final labels =
      jsonDecode(File('$_dir/labels.json').readAsStringSync())
          as Map<String, dynamic>;
  final clips = <_Clip>[];
  for (final entry in (labels['clips'] as Map<String, dynamic>).entries) {
    final l = entry.value as Map<String, dynamic>;
    if (l['use'] == false) continue;
    final fixture =
        jsonDecode(File('$_dir/${entry.key}.json').readAsStringSync())
            as Map<String, dynamic>;
    final joints = PoseJoint.values;
    final maxMs = l['maxMs'] as int?;
    final frames = <PoseFrame>[
      for (final f in fixture['frames'] as List)
        if (maxMs == null || ((f as Map<String, dynamic>)['t'] as int) <= maxMs)
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
    clips.add(
      _Clip(
        entry.key,
        l['hand'] == 'left' ? HittingHand.left : HittingHand.right,
        l['stroke'] == 'serve' ? SwingStroke.serve : SwingStroke.forehand,
        frames,
        [
          for (final s in l['swings'] as List)
            _Label(
              (s as Map<String, dynamic>)['t'] as int,
              s['type'] as String,
            ),
        ],
        l['note'] as String? ?? '',
      ),
    );
  }
  return clips;
}

class _Score {
  int labelled = 0, hits = 0, falsePositives = 0, measured = 0;
  final missedByType = <String, int>{};
  final labelledByType = <String, int>{};
  final refusals = <SwingRefusal, int>{};

  double get recall => labelled == 0 ? 0 : hits / labelled;
  double get precision =>
      hits + falsePositives == 0 ? 0 : hits / (hits + falsePositives);
  double get f1 => recall + precision == 0
      ? 0
      : 2 * recall * precision / (recall + precision);

  void add(_Score o) {
    labelled += o.labelled;
    hits += o.hits;
    falsePositives += o.falsePositives;
    measured += o.measured;
    o.missedByType.forEach((k, v) => missedByType[k] = (missedByType[k] ?? 0) + v);
    o.labelledByType.forEach(
      (k, v) => labelledByType[k] = (labelledByType[k] ?? 0) + v,
    );
    o.refusals.forEach((k, v) => refusals[k] = (refusals[k] ?? 0) + v);
  }
}

_Score _score(_Clip clip, SwingAnalyzer analyzer) {
  final analysis = analyzer.analyze(clip.frames, clip.stroke, clip.hand);
  final detected = analysis.swings.toList();
  final used = <int>{};
  final sure = clip.labels.where((l) => l.type != 'unsure').toList();
  final s = _Score()..labelled = sure.length;
  // Unsure labels claim their nearest detection first, so it is neither a hit
  // nor a false positive.
  final ignored = <int>{};
  for (final label in clip.labels.where((l) => l.type == 'unsure')) {
    for (var i = 0; i < detected.length; i++) {
      if ((detected[i].peakMs - label.tMs).abs() <= _toleranceMs) {
        ignored.add(i);
        break;
      }
    }
  }
  used.addAll(ignored);
  for (final label in sure) {
    s.labelledByType[label.type] = (s.labelledByType[label.type] ?? 0) + 1;
    var best = -1;
    var bestDist = _toleranceMs + 1;
    for (var i = 0; i < detected.length; i++) {
      if (used.contains(i)) continue;
      final d = (detected[i].peakMs - label.tMs).abs();
      if (d < bestDist) {
        best = i;
        bestDist = d;
      }
    }
    if (best >= 0) {
      used.add(best);
      s.hits++;
    } else {
      s.missedByType[label.type] = (s.missedByType[label.type] ?? 0) + 1;
    }
  }
  s.falsePositives = detected.length - used.length;
  for (final i in used.difference(ignored)) {
    final swing = detected[i];
    if (swing.measured) {
      s.measured++;
    } else {
      s.refusals[swing.reason!] = (s.refusals[swing.reason!] ?? 0) + 1;
    }
  }
  return s;
}

_Score _total(List<_Clip> clips, SwingAnalyzer analyzer) {
  final total = _Score();
  for (final c in clips) {
    total.add(_score(c, analyzer));
  }
  return total;
}

String _pct(double v) => '${(v * 100).toStringAsFixed(0)}%';

void main() {
  final clips = _loadClips();

  test('report: per-clip detection and threshold sweep', () {
    const analyzer = SwingAnalyzer();
    final buf = StringBuffer()
      ..writeln('\nDefaults: ${_describe(const SwingDetectorConfig())}')
      ..writeln('clip | frames | labelled | hit | false+ | measured | refusals | note');
    for (final c in clips) {
      final s = _score(c, analyzer);
      buf.writeln(
        '${c.id} | ${c.frames.length} | ${s.labelled} | ${s.hits} | '
        '${s.falsePositives} | ${s.measured} | '
        '${s.refusals.entries.map((e) => '${e.key.apiValue}:${e.value}').join(' ')} | ${c.note}',
      );
    }
    final t = _total(clips, analyzer);
    buf
      ..writeln(
        'TOTAL recall ${_pct(t.recall)} precision ${_pct(t.precision)} '
        'measured ${t.measured}/${t.hits} detected  missed by type ${t.missedByType} '
        'of ${t.labelledByType}',
      )
      ..writeln('\nSweep (peakSpeed x mergeWithinMs): recall / precision / F1');
    for (final merge in [1000, 1200, 1400, 1600]) {
      for (final peak in [3.0, 3.5, 4.0, 4.5, 5.0, 6.0]) {
        final a = SwingAnalyzer(
          detector: SwingDetector(
            config: SwingDetectorConfig(peakSpeed: peak, mergeWithinMs: merge),
          ),
        );
        final s = _total(clips, a);
        buf.writeln(
          'peak $peak merge $merge: ${_pct(s.recall)} / ${_pct(s.precision)} / '
          '${s.f1.toStringAsFixed(2)}  measured ${s.measured}/${s.hits}',
        );
      }
    }
    buf.writeln('\nGate sweep at defaults (minVisibleShare): measured / detected');
    for (final share in [0.5, 0.6, 0.7, 0.8]) {
      final a = SwingAnalyzer(gate: QualityGate(minVisibleShare: share));
      final s = _total(clips, a);
      buf.writeln('share $share: ${s.measured}/${s.hits}  refusals ${s.refusals}');
    }
    // ignore: avoid_print
    print(buf);
    expect(clips, isNotEmpty);
  });

  test('tuned defaults hold their accuracy on real clips', () {
    final t = _total(clips, const SwingAnalyzer());
    // Bars set from the 2026-11-11 calibration run (docs/ml/real-clips-inventory.md),
    // just below the measured values so noise doesn't flap the test.
    expect(t.recall, greaterThanOrEqualTo(_minRecall));
    expect(t.precision, greaterThanOrEqualTo(_minPrecision));
  });
}

String _describe(SwingDetectorConfig c) =>
    'peakSpeed ${c.peakSpeed}, merge ${c.mergeWithinMs} ms, '
    'window -${c.windowBeforeMs}/+${c.windowAfterMs} ms';

// Measured 2026-11-11 at peakSpeed 4.0 / merge 1400 ms: recall 80%, precision 88%
// over all 7 scored clips (rear views and a montage included).
const double _minRecall = 0.78;
const double _minPrecision = 0.85;
