// The offline CLI the cv-service Analysis Lab calls (tool/swing_analyze.dart):
// it must report the same swings as the app's SwingAnalyzer on the same frames.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/swing_check/domain/pose_frame.dart';
import 'package:drift_tennis/features/swing_check/domain/swing_metrics.dart';
import 'package:drift_tennis/features/swing_check/domain/swing_session.dart';

import '../../tool/swing_analyze.dart';

Map<String, dynamic> _fixture(String clip) =>
    jsonDecode(
          File('test/features/swing_check/fixtures/real/$clip.json').readAsStringSync(),
        )
        as Map<String, dynamic>;

void main() {
  test('parses every frame of a fixture', () {
    final fixture = _fixture('R05');
    expect(framesFromFixture(fixture).length, (fixture['frames'] as List).length);
  });

  test('reports the same swings as SwingAnalyzer', () {
    final fixture = _fixture('R04');
    final out = analyzeFixture(fixture, HittingHand.right);
    final direct = const SwingAnalyzer().analyze(
      framesFromFixture(fixture),
      SwingStroke.forehand,
      HittingHand.right,
    );
    final swings = out['swings'] as List;
    expect(swings.length, direct.swings.length);
    for (var i = 0; i < swings.length; i++) {
      final s = swings[i] as Map<String, dynamic>;
      expect(s['peakMs'], direct.swings[i].peakMs);
      expect(s['measured'], direct.swings[i].measured);
    }
    expect(jsonEncode(out), isNotEmpty); // serialisable for the lab
  });

  test('tags overhead swings and gives them serve metrics', () {
    final out = analyzeFixture(_fixture('R04'), HittingHand.right);
    final overhead = (out['swings'] as List)
        .cast<Map<String, dynamic>>()
        .where((s) => s['overhead'] == true && s['measured'] == true);
    // R04 ends with serves filmed from behind.
    expect(overhead, isNotEmpty);
    for (final s in overhead) {
      expect((s['values'] as Map).containsKey(SwingMetric.trophyToContactMs), isTrue);
    }
  });
}
