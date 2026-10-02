import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/video_analysis/data/video_analysis_repository.dart';
import 'package:drift_tennis/features/video_analysis/presentation/video_results_screen.dart';

import '../../support/pump.dart';

/// A repository that serves one job and records what was asked of it.
class _FakeRepository implements VideoAnalysisRepository {
  _FakeRepository(this.job);

  VideoAnalysisJob job;
  int analysisRequests = 0;

  @override
  Future<VideoAnalysisJob> fetch(String jobId) async => job;

  @override
  Future<VideoAnalysisJob> requestAnalysis(String jobId) async {
    analysisRequests++;
    job = _job(status: VideoAnalysisStatus.analyzing);
    return job;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

VideoAnalysisJob _job({
  required VideoAnalysisStatus status,
  Map<String, dynamic>? summary,
  List<String> reasons = const [],
  String? failureReason,
}) {
  return VideoAnalysisJob(
    id: 'job-1',
    status: status,
    originalFilename: 'clip.mp4',
    createdAt: DateTime(2026, 9, 29),
    rejectionReasons: reasons,
    analysisResult: summary,
    failureReason: failureReason,
  );
}

/// A summary shaped like a real one, from an actual pipeline run.
Map<String, dynamic> _summary({bool calibrated = true}) => {
  'total_shots_p1': 4,
  'total_shots_p2': 2,
  'avg_shot_speed_p1_kmh': 61.6,
  'avg_shot_speed_p2_kmh': 0.0,
  'serve_avg_flight_speed_kmh': 110.8,
  'court_calibrated': calibrated,
  'shot_classification': {
    'shots': 2,
    'types': {'Serve': 1, 'Forehand': 1},
  },
  if (!calibrated)
    'warning':
        'Court fit failed validation - speeds, distances and mini-court '
            'positions are derived from an unreliable court and should not be '
            'treated as measurements.',
};

/// A session summary shaped like the one `utils/session_aggregate.py` produces.
///
/// `found` above `analysed` is the partial case, which is the normal one: a session runs
/// under a frame budget because the service has one GPU, so a 12-minute upload routinely
/// contains more rallies than there was time to measure.
Map<String, dynamic> _sessionSummary({
  int found = 4,
  int analysed = 2,
  int uncalibrated = 0,
  bool calibrated = true,
}) => {
  'mode': 'session',
  'segments_found': found,
  'segments_analysed': analysed,
  'segments_skipped_budget': found - analysed,
  'segments_skipped_short': 0,
  'segments_failed': 0,
  'segments_uncalibrated': uncalibrated,
  'court_calibrated': calibrated,
  'totals': {
    'total_shots_p1': 9,
    'total_shots_p2': 6,
    'total_shots': 15,
    if (calibrated) 'avg_shot_speed_p1_kmh': 74.3,
  },
  'shot_types': {'Forehand': 8, 'Serve': 2},
  'segments': [
    for (var i = 0; i < analysed; i++)
      {
        'index': i,
        'status': 'analysed',
        'span': {'start_s': 30.0 + i * 60, 'end_s': 45.0 + i * 60},
        'summary': {
          'total_shots_p1': 5,
          'total_shots_p2': 3,
          'court_calibrated': i >= uncalibrated,
        },
      },
    for (var i = analysed; i < found; i++)
      {
        'index': i,
        'status': 'skipped_budget',
        'span': {'start_s': 30.0 + i * 60, 'end_s': 45.0 + i * 60},
        'reason': 'The session budget was already spent on earlier rallies.',
      },
  ],
};

Future<_FakeRepository> _pump(
  WidgetTester tester,
  VideoAnalysisJob job, {
  Brightness brightness = Brightness.light,
  // The in-progress states hold a CircularProgressIndicator and a live poll
  // timer, neither of which ever settles. Those tests pump instead.
  bool settle = true,
}) async {
  final repository = _FakeRepository(job);
  await pumpScreen(
    tester,
    const VideoResultsScreen(jobId: 'job-1'),
    brightness: brightness,
    settle: settle,
    overrides: [
      videoAnalysisRepositoryProvider.overrideWithValue(repository),
    ],
  );
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
  }
  return repository;
}

void main() {
  group('VideoResultsScreen', () {
    for (final brightness in Brightness.values) {
      testWidgets('renders without throwing in ${brightness.name}', (
        tester,
      ) async {
        await _pump(
          tester,
          _job(
            status: VideoAnalysisStatus.completed,
            summary: _summary(),
          ),
          brightness: brightness,
        );
        expect(tester.takeException(), isNull);
      });
    }

    group('when the court could not be calibrated', () {
      // The case that matters most: every clip in the first batch of real Drift
      // footage failed here. Speeds still come out of the pipeline, still look
      // plausible, and are not measurements.
      testWidgets('hides speeds entirely rather than captioning them', (
        tester,
      ) async {
        await _pump(
          tester,
          _job(
            status: VideoAnalysisStatus.completed,
            summary: _summary(calibrated: false),
          ),
        );

        expect(find.text('Speed'), findsNothing);
        expect(find.textContaining('61.6'), findsNothing);
        expect(find.textContaining('110.8'), findsNothing);
      });

      testWidgets("shows the pipeline's own warning", (tester) async {
        await _pump(
          tester,
          _job(
            status: VideoAnalysisStatus.completed,
            summary: _summary(calibrated: false),
          ),
        );

        expect(
          find.textContaining('should not be treated as measurements'),
          findsOneWidget,
        );
      });

      testWidgets('still shows shot counts, which do not depend on it', (
        tester,
      ) async {
        await _pump(
          tester,
          _job(
            status: VideoAnalysisStatus.completed,
            summary: _summary(calibrated: false),
          ),
        );

        expect(find.text('4'), findsOneWidget);
        expect(find.text('2'), findsOneWidget);
      });
    });

    group('when the court was calibrated', () {
      testWidgets('shows the speeds', (tester) async {
        await _pump(
          tester,
          _job(status: VideoAnalysisStatus.completed, summary: _summary()),
        );

        expect(find.text('Speed'), findsOneWidget);
        expect(find.text('61.6 km/h'), findsOneWidget);
        expect(find.text('110.8 km/h'), findsOneWidget);
      });

      testWidgets('omits a zero speed instead of printing 0.0 km/h', (
        tester,
      ) async {
        // 0 is the pipeline's "no data", not a measured zero. Printing it reads
        // as a result — an opponent who hit nothing, rather than one not tracked.
        await _pump(
          tester,
          _job(status: VideoAnalysisStatus.completed, summary: _summary()),
        );

        expect(find.text('0.0 km/h'), findsNothing);
        expect(find.text('Opponent average shot'), findsNothing);
      });

      testWidgets('says the speed is averaged over flight, not at contact', (
        tester,
      ) async {
        await _pump(
          tester,
          _job(status: VideoAnalysisStatus.completed, summary: _summary()),
        );

        expect(
          find.textContaining('lower than a radar reading'),
          findsOneWidget,
        );
      });
    });

    testWidgets('marks shot types as unreliable', (tester) async {
      // Stroke typing is the least trustworthy thing in the pipeline and is
      // explicitly unproven on Drift footage.
      await _pump(
        tester,
        _job(status: VideoAnalysisStatus.completed, summary: _summary()),
      );

      expect(find.text('Serve'), findsOneWidget);
      expect(find.textContaining('often wrong'), findsOneWidget);
    });

    group('other states', () {
      testWidgets('offers to analyse a clip that passed its checks', (
        tester,
      ) async {
        final repository = await _pump(
          tester,
          _job(status: VideoAnalysisStatus.accepted),
        );

        expect(find.text('Analyse this clip'), findsOneWidget);

        await tester.tap(find.text('Analyse this clip'));
        await tester.pump();
        expect(repository.analysisRequests, 1);
        // Leaves the screen in ANALYZING with a live timer; let it go rather
        // than settling, which never returns.
      });

      testWidgets('shows progress while analysing', (tester) async {
        await _pump(
          tester,
          _job(status: VideoAnalysisStatus.analyzing),
          settle: false,
        );

        expect(find.text('Analysing your clip…'), findsOneWidget);
        expect(
          find.textContaining('leave this screen'),
          findsOneWidget,
        );
      });

      testWidgets('explains a failure in the words the server gave', (
        tester,
      ) async {
        await _pump(
          tester,
          _job(
            status: VideoAnalysisStatus.failed,
            failureReason: 'The analysis could not be completed.',
          ),
        );

        expect(
          find.text('The analysis could not be completed.'),
          findsOneWidget,
        );
      });

      testWidgets('shows why a clip was refused', (tester) async {
        await _pump(
          tester,
          _job(
            status: VideoAnalysisStatus.rejected,
            reasons: const ['This clip is in portrait.'],
          ),
        );

        expect(find.text('This clip is in portrait.'), findsOneWidget);
      });
    });

    group('a session rather than a single rally', () {
      for (final brightness in Brightness.values) {
        testWidgets('renders without throwing in ${brightness.name}', (
          tester,
        ) async {
          await _pump(
            tester,
            _job(
              status: VideoAnalysisStatus.completed,
              summary: _sessionSummary(),
            ),
            brightness: brightness,
          );
          expect(tester.takeException(), isNull);
        });
      }

      testWidgets('says how many of the rallies it found were measured', (
        tester,
      ) async {
        // The whole point of the session screen. Totals over 2 of 4 rallies must not
        // read as totals over the session, and a number without its denominator gets
        // screenshotted and quoted without it.
        await _pump(
          tester,
          _job(
            status: VideoAnalysisStatus.completed,
            summary: _sessionSummary(found: 4, analysed: 2),
          ),
        );

        expect(find.textContaining('2 of 4'), findsOneWidget);
      });

      testWidgets('does not claim partial coverage when it measured everything', (
        tester,
      ) async {
        await _pump(
          tester,
          _job(
            status: VideoAnalysisStatus.completed,
            summary: _sessionSummary(found: 3, analysed: 3),
          ),
        );

        expect(find.textContaining('of 3 rallies'), findsNothing);
        expect(find.textContaining('all 3'), findsOneWidget);
      });

      testWidgets('lists every rally it found, including the skipped ones', (
        tester,
      ) async {
        // A skipped rally is real play that we chose not to measure. Hiding it would
        // make the session look shorter than it was.
        await _pump(
          tester,
          _job(
            status: VideoAnalysisStatus.completed,
            summary: _sessionSummary(found: 4, analysed: 2),
          ),
        );

        expect(find.text('Rally by rally'), findsOneWidget);
        expect(
          find.textContaining('ran out of analysis time'),
          findsNWidgets(2),
        );
      });

      testWidgets('shows session totals from the totals block', (tester) async {
        await _pump(
          tester,
          _job(
            status: VideoAnalysisStatus.completed,
            summary: _sessionSummary(),
          ),
        );

        expect(find.text('Session totals'), findsOneWidget);
        expect(find.text('15'), findsOneWidget);
      });

      testWidgets('hides session speeds when no rally had a court fit', (
        tester,
      ) async {
        // Same rule as a single clip, one level up: without a homography the speeds are
        // plausible numbers that are not measurements.
        await _pump(
          tester,
          _job(
            status: VideoAnalysisStatus.completed,
            summary: _sessionSummary(calibrated: false),
          ),
        );

        expect(find.text('Speed'), findsNothing);
        expect(find.textContaining('74.3'), findsNothing);
      });

      testWidgets('shot counts survive when the court fit did not', (tester) async {
        // Contact detection does not depend on the court fit, so the counts stay.
        await _pump(
          tester,
          _job(
            status: VideoAnalysisStatus.completed,
            summary: _sessionSummary(calibrated: false),
          ),
        );

        expect(find.text('15'), findsOneWidget);
      });

      testWidgets('flags rallies that were measured without a court fit', (
        tester,
      ) async {
        await _pump(
          tester,
          _job(
            status: VideoAnalysisStatus.completed,
            summary: _sessionSummary(found: 4, analysed: 2, uncalibrated: 1),
          ),
        );

        expect(find.textContaining('court lines'), findsWidgets);
      });

      testWidgets('a single-clip job still gets the single-clip screen', (
        tester,
      ) async {
        // The branch is keyed on the summary's own `mode`, so a clip result must not
        // wander into the session view and report "0 rallies measured".
        await _pump(
          tester,
          _job(
            status: VideoAnalysisStatus.completed,
            summary: _summary(),
          ),
        );

        expect(find.text('Session totals'), findsNothing);
        expect(find.text('Shots'), findsOneWidget);
      });
    });
  });

  group('VideoAnalysisJob.courtCalibrated', () {
    test('defaults to true when the pipeline said nothing', () {
      // Absent is not false. A summary without the key predates it or came from
      // a path that does not set it, and treating that as a failed court fit
      // would hide real numbers.
      expect(
        _job(status: VideoAnalysisStatus.completed, summary: {})
            .courtCalibrated,
        isTrue,
      );
    });

    test('is false only when the pipeline said so', () {
      expect(
        _job(
          status: VideoAnalysisStatus.completed,
          summary: {'court_calibrated': false},
        ).courtCalibrated,
        isFalse,
      );
    });


  });

  group('SessionSegment', () {
    test('reads a timestamp a person can scrub to', () {
      final segment = SessionSegment.fromJson({
        'index': 0,
        'status': 'analysed',
        'span': {'start_s': 90.0, 'end_s': 125.0},
        'summary': {'total_shots_p1': 3, 'total_shots_p2': 2},
      });

      expect(segment.timestampLabel, '1:30–2:05');
      expect(segment.durationLabel, '35s');
      expect(segment.shots, 5);
      expect(segment.wasAnalysed, isTrue);
    });

    test('a missing calibration key counts as calibrated', () {
      // `!= false`, matching session_aggregate.py and video-analysis.service.ts. A layer
      // reading this differently would stop showing a warning the others show.
      final segment = SessionSegment.fromJson({
        'index': 0,
        'status': 'analysed',
        'span': {'start_s': 0.0, 'end_s': 10.0},
        'summary': {'total_shots_p1': 1},
      });

      expect(segment.courtCalibrated, isTrue);
    });

    test('a malformed segment is not reported as analysed', () {
      expect(SessionSegment.fromJson({}).wasAnalysed, isFalse);
    });
  });
}
