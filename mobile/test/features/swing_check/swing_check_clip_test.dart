// Swing Check on a recorded clip (VIDEO_AI_BUILD_PLAN.md workstream A).
//
// The native pose pass is replaced by a fake ClipPoseSource. The R04 and R07
// tests feed it real landmarks (fixtures/real/, MediaPipe at 15 fps, the same
// rate the app samples clips at), so they exercise the clip path end to end
// apart from the phone's own detector, which the real-phone pass (B1) covers.
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:drift_tennis/features/profile/application/profile_providers.dart';
import 'package:drift_tennis/features/swing_check/application/clip_analysis_controller.dart';
import 'package:drift_tennis/features/swing_check/application/swing_check_providers.dart';
import 'package:drift_tennis/features/swing_check/data/clip_pose_source.dart';
import 'package:drift_tennis/features/swing_check/data/swing_check_repository.dart';
import 'package:drift_tennis/features/swing_check/domain/pose_frame.dart';
import 'package:drift_tennis/features/swing_check/domain/swing_metrics.dart';
import 'package:drift_tennis/features/swing_check/domain/swing_session.dart';
import 'package:drift_tennis/features/swing_check/presentation/swing_check_clip_progress_screen.dart';
import 'package:drift_tennis/features/swing_check/presentation/swing_check_results_screen.dart';
import 'package:drift_tennis/features/swing_check/presentation/swing_check_setup_screen.dart';

import '../../support/pump.dart';

const _fixtures = 'test/features/swing_check/fixtures/real';

/// Landmark frames from a real clip, up to [maxMs].
List<PoseFrame> _fixtureFrames(String id, {int? maxMs}) {
  final fixture =
      jsonDecode(File('$_fixtures/$id.json').readAsStringSync()) as Map<String, dynamic>;
  const joints = PoseJoint.values;
  return [
    for (final f in (fixture['frames'] as List).cast<Map<String, dynamic>>())
      if (maxMs == null || (f['t'] as int) <= maxMs)
        PoseFrame(
          tMs: f['t'] as int,
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

HittingHand _labelledHand(String id) {
  final labels =
      jsonDecode(File('$_fixtures/labels.json').readAsStringSync()) as Map<String, dynamic>;
  final clip = (labels['clips'] as Map<String, dynamic>)[id] as Map<String, dynamic>;
  return clip['hand'] == 'left' ? HittingHand.left : HittingHand.right;
}

class _FakeClipSource implements ClipPoseSource {
  _FakeClipSource({this.poses, this.error, this.wait});

  final ClipPoses? poses;
  final ClipPoseError? error;

  /// When set, [analyse] waits for it (or for [cancel]).
  final Completer<void>? wait;

  final _progress = StreamController<ClipProgress>.broadcast();
  bool cancelled = false;
  String? analysedPath;

  void emit(int done, int total) => _progress.add(ClipProgress(done, total));

  @override
  Stream<ClipProgress> get progress => _progress.stream;

  @override
  Future<ClipPoses> analyse(String path) async {
    analysedPath = path;
    if (wait != null) await wait!.future;
    if (cancelled) throw const ClipPoseException(ClipPoseError.cancelled);
    if (error != null) throw ClipPoseException(error!);
    return poses!;
  }

  @override
  Future<void> cancel() async {
    cancelled = true;
    if (wait != null && !wait!.isCompleted) wait!.complete();
  }
}

class _FakeRepository implements SwingCheckRepository {
  _FakeRepository({this.record});

  final SwingSessionRecord? record;
  final saved = <SwingSessionAnalysis>[];

  @override
  Future<SwingSessionRecord> save(SwingSessionAnalysis analysis) async {
    saved.add(analysis);
    return SwingSessionRecord.fromJson({
      'id': 'clip-1',
      'stroke': analysis.stroke.apiValue,
      'dominantHand': analysis.hand.apiValue,
      'swingsDetected': analysis.detected,
      'swingsMeasured': analysis.measured,
      'createdAt': '2026-11-11T10:00:00.000Z',
      'summary': <String, dynamic>{},
      'source': analysis.source.apiValue,
    });
  }

  @override
  Future<SwingSessionRecord> fetch(String id) async => record!;

  @override
  Future<SwingSessionRecord> requestFeedback(String id) async => record!;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

ClipPoses _poses(List<PoseFrame> frames, {int analysedMs = 30000, bool truncated = false}) =>
    ClipPoses(
      frames: frames,
      durationMs: truncated ? analysedMs + 20000 : analysedMs,
      analysedMs: analysedMs,
      truncated: truncated,
      sampled: analysedMs * 15 ~/ 1000,
    );

SwingClipRequest _request(HittingHand hand) => SwingClipRequest(
  setup: SwingCheckSetup(stroke: SwingStroke.forehand, hand: hand),
  path: '/tmp/clip.mp4',
);

void main() {
  group('ClipPoses.fromChannel', () {
    test('parses frames in time order and skips malformed ones', () {
      final poses = ClipPoses.fromChannel({
        'frames': [
          {
            'tMs': 133,
            'points': [
              {'joint': 'leftWrist', 'x': 10.0, 'y': 20.0, 'likelihood': 0.9},
            ],
          },
          {
            'tMs': 67,
            'points': [
              {'joint': 'nose', 'x': 1, 'y': 2, 'likelihood': 0.8},
              {'joint': 'tail', 'x': 1, 'y': 2, 'likelihood': 0.8},
            ],
          },
          {'tMs': 200, 'points': <Object>[]},
          {'points': <Object>[]},
          'junk',
        ],
        'durationMs': 75000,
        'analysedMs': 60000,
        'truncated': true,
        'sampled': 900,
        'width': 360,
        'height': 640,
      });

      expect(poses.frames.map((f) => f.tMs), [67, 133]);
      expect(poses.frames.first.points.keys, [PoseJoint.nose]);
      expect(poses.frames.last.points[PoseJoint.leftWrist]!.x, 10.0);
      expect(poses.truncated, isTrue);
      expect(poses.analysedMs, 60000);
      expect(poses.sampled, 900);
      expect(poses.imageSize, const Size(360, 640));
    });
  });

  group('ClipAnalysisController', () {
    test("R04's first 30 s: the lab's swing count (11) within ±1, saved as a CLIP session", () async {
      final hand = _labelledHand('R04');
      final source = _FakeClipSource(poses: _poses(_fixtureFrames('R04', maxMs: 30000)));
      final repository = _FakeRepository();
      final controller = ClipAnalysisController(source, repository, _request(hand));

      await controller.start();

      expect(controller.state.phase, ClipPhase.saved);
      expect(controller.state.savedId, 'clip-1');
      expect(source.analysedPath, '/tmp/clip.mp4');
      final analysis = repository.saved.single;
      expect(analysis.detected, inInclusiveRange(10, 12));
      expect(analysis.source, SwingSource.clip);
      final json = analysis.toCreateJson(poseModel: 'test', appVersion: 'test');
      expect(json['source'], 'CLIP');
      expect((json['metrics'] as Map)['clip'], {'analysedMs': 30000, 'truncated': false});
    });

    test('a rear-view clip (R07) is refused with a reason, and nothing is saved', () async {
      final source = _FakeClipSource(poses: _poses(_fixtureFrames('R07'), analysedMs: 14000));
      final repository = _FakeRepository();
      final controller = ClipAnalysisController(
        source,
        repository,
        _request(_labelledHand('R07')),
      );

      await controller.start();

      expect(controller.state.phase, ClipPhase.failed);
      expect(controller.state.error, contains('behind the player'));
      expect(repository.saved, isEmpty);
    });

    test('a clip with nobody in it says so', () async {
      final controller = ClipAnalysisController(
        _FakeClipSource(poses: _poses(const [])),
        _FakeRepository(),
        _request(HittingHand.right),
      );
      await controller.start();
      expect(controller.state.phase, ClipPhase.failed);
      expect(controller.state.error, contains('No player was found'));
    });

    test('an unreadable file and an unsupported phone each get their own message', () async {
      final unreadable = ClipAnalysisController(
        _FakeClipSource(error: ClipPoseError.unreadable),
        _FakeRepository(),
        _request(HittingHand.right),
      );
      await unreadable.start();
      expect(unreadable.state.error, "This video can't be opened. Try another clip.");

      final unsupported = ClipAnalysisController(
        _FakeClipSource(error: ClipPoseError.unsupported),
        _FakeRepository(),
        _request(HittingHand.right),
      );
      await unsupported.start();
      expect(unsupported.state.error, 'Swing Check needs Android 13 or iOS 15 or later.');
    });

    test('shows progress, and cancelling ends without saving', () async {
      final source = _FakeClipSource(
        poses: _poses(const []),
        wait: Completer<void>(),
      );
      final repository = _FakeRepository();
      final controller = ClipAnalysisController(source, repository, _request(HittingHand.right));

      final running = controller.start();
      await Future<void>.delayed(Duration.zero);
      source.emit(45, 450);
      await Future<void>.delayed(Duration.zero);
      expect(controller.state.phase, ClipPhase.analysing);
      expect(controller.state.progress.done, 45);
      expect(controller.state.progress.fraction, closeTo(0.1, 1e-9));

      await controller.cancel();
      await running;
      expect(source.cancelled, isTrue);
      expect(controller.state.phase, ClipPhase.cancelled);
      expect(repository.saved, isEmpty);
    });
  });

  group('SwingSessionRecord', () {
    test('reads the source and clip details, and defaults older rows to LIVE', () {
      final clip = SwingSessionRecord.fromJson({
        'id': 'a',
        'stroke': 'SERVE',
        'dominantHand': 'LEFT',
        'createdAt': '2026-11-11T10:00:00.000Z',
        'source': 'CLIP',
        'metrics': {
          'swings': <Object>[],
          'clip': {'analysedMs': 60000, 'truncated': true},
        },
      });
      expect(clip.source, SwingSource.clip);
      expect(clip.clip!.analysedMs, 60000);
      expect(clip.clip!.truncated, isTrue);

      final live = SwingSessionRecord.fromJson({
        'id': 'b',
        'stroke': 'FOREHAND',
        'dominantHand': 'RIGHT',
        'createdAt': '2026-11-11T10:00:00.000Z',
      });
      expect(live.source, SwingSource.live);
      expect(live.clip, isNull);
    });
  });

  group('screens', () {
    testWidgets('setup: "Use a recorded clip" opens the picker, then the clip screen', (
      tester,
    ) async {
      SwingClipRequest? opened;
      await pumpRouted(
        tester,
        const SwingCheckSetupScreen(),
        overrides: [
          ownProfileProvider.overrideWith((ref) => Future.error('offline')),
          swingClipPickerProvider.overrideWithValue(() async => '/picked/clip.mp4'),
        ],
        extraRoutes: [
          GoRoute(
            path: '/swing-check/clip',
            builder: (_, state) {
              opened = state.extra as SwingClipRequest;
              return const Text('clip screen');
            },
          ),
        ],
      );

      await tester.scrollUntilVisible(find.text('Use a recorded clip'), 200);
      expect(find.textContaining('The first 60 seconds are analysed'), findsOneWidget);
      await tester.tap(find.text('Use a recorded clip'));
      await tester.pumpAndSettle();

      expect(find.text('clip screen'), findsOneWidget);
      expect(opened!.path, '/picked/clip.mp4');
      expect(opened!.setup.stroke, SwingStroke.forehand);
    });

    testWidgets('setup: backing out of the picker stays on setup', (tester) async {
      await pumpRouted(
        tester,
        const SwingCheckSetupScreen(),
        overrides: [
          ownProfileProvider.overrideWith((ref) => Future.error('offline')),
          swingClipPickerProvider.overrideWithValue(() async => null),
        ],
      );
      await tester.scrollUntilVisible(find.text('Use a recorded clip'), 200);
      await tester.tap(find.text('Use a recorded clip'));
      await tester.pumpAndSettle();
      expect(find.text('Use a recorded clip'), findsOneWidget);
    });

    testWidgets('progress screen: frame count while analysing, reason on refusal', (
      tester,
    ) async {
      final wait = Completer<void>();
      final source = _FakeClipSource(poses: _poses(const []), wait: wait);
      await pumpRouted(
        tester,
        SwingCheckClipProgressScreen(request: _request(HittingHand.right)),
        overrides: [
          clipPoseSourceFactoryProvider.overrideWithValue(() => source),
          swingCheckRepositoryProvider.overrideWithValue(_FakeRepository()),
        ],
        settle: false,
      );
      await tester.pump();
      expect(find.text('Opening the clip…'), findsOneWidget);

      source.emit(90, 450);
      await tester.pump();
      expect(find.text('Frame 90 of 450'), findsOneWidget);
      expect(find.textContaining('never leaves your phone'), findsOneWidget);

      wait.complete();
      await tester.pumpAndSettle();
      expect(find.textContaining('No player was found'), findsOneWidget);
      expect(find.text('Back'), findsOneWidget);
    });

    testWidgets('progress screen renders in Spanish', (tester) async {
      final source = _FakeClipSource(poses: _poses(const []), wait: Completer<void>());
      await pumpScreen(
        tester,
        SwingCheckClipProgressScreen(request: _request(HittingHand.right)),
        locale: const Locale('es'),
        overrides: [
          clipPoseSourceFactoryProvider.overrideWithValue(() => source),
          swingCheckRepositoryProvider.overrideWithValue(_FakeRepository()),
        ],
        settle: false,
      );
      await tester.pump();
      expect(find.text('Analizando tu vídeo'), findsOneWidget);
      expect(find.text('Abriendo el vídeo…'), findsOneWidget);
    });

    testWidgets('results: a clip session says so, and when the clip was cut short', (
      tester,
    ) async {
      final record = SwingSessionRecord.fromJson({
        'id': 's1',
        'stroke': 'FOREHAND',
        'dominantHand': 'RIGHT',
        'swingsDetected': 2,
        'swingsMeasured': 2,
        'createdAt': '2026-11-11T10:00:00.000Z',
        'summary': <String, dynamic>{},
        'source': 'CLIP',
        'metrics': {
          'swings': [
            {'index': 0, 'tMs': 1000, 'measured': true, 'values': {'elbowAngleDeg': 150}},
            {'index': 1, 'tMs': 3000, 'measured': true, 'values': {'elbowAngleDeg': 152}},
          ],
          'clip': {'analysedMs': 60000, 'truncated': true},
        },
      });
      await pumpScreen(
        tester,
        const SwingCheckResultsScreen(sessionId: 's1'),
        overrides: [
          swingCheckRepositoryProvider.overrideWithValue(_FakeRepository(record: record)),
        ],
      );
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Measured from a recorded clip · '
          'Only the first 60 seconds of the clip were analysed.',
        ),
        findsOneWidget,
      );
    });
  });
}
