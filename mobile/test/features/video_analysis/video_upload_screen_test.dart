import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:drift_tennis/features/video_analysis/application/video_analysis_providers.dart';
import 'package:drift_tennis/features/video_analysis/data/video_analysis_repository.dart';
import 'package:drift_tennis/features/video_analysis/presentation/video_upload_screen.dart';

import '../../support/pump.dart';

/// A repository that never touches the network.
///
/// The screen's job is delivering a verdict, so the tests drive verdicts
/// directly rather than uploading anything.
class _FakeRepository implements VideoAnalysisRepository {
  _FakeRepository({required this.job, this.status = const CvServiceStatus(up: true, courtModelLoaded: true)});

  final VideoAnalysisJob job;
  final CvServiceStatus status;

  @override
  Future<VideoAnalysisJob> upload(
    String filePath, {
    void Function(double progress)? onProgress,
    dynamic cancelToken,
  }) async => job;

  @override
  Future<List<VideoAnalysisJob>> list() async => [job];

  @override
  Future<CvServiceStatus> serviceStatus() async => status;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

VideoAnalysisJob _job({
  required VideoAnalysisStatus status,
  List<String> reasons = const [],
  List<PrecheckFinding> findings = const [],
  bool courtChecked = true,
}) {
  return VideoAnalysisJob(
    id: 'job-1',
    status: status,
    originalFilename: 'clip.mp4',
    createdAt: DateTime(2026, 9, 29),
    rejectionReasons: reasons,
    findings: findings,
    courtChecked: courtChecked,
  );
}

Future<void> _pumpWithVerdict(
  WidgetTester tester,
  VideoAnalysisJob job, {
  CvServiceStatus status = const CvServiceStatus(up: true, courtModelLoaded: true),
  Brightness brightness = Brightness.light,
}) async {
  final repository = _FakeRepository(job: job, status: status);

  await pumpScreen(
    tester,
    const VideoUploadScreen(),
    brightness: brightness,
    overrides: [
      videoAnalysisRepositoryProvider.overrideWithValue(repository),
    ],
  );

  // Drive the controller straight to a verdict; the picker needs a platform
  // channel that does not exist in a widget test.
  final element = tester.element(find.byType(VideoUploadScreen));
  final container = ProviderScope.containerOf(element);
  await container.read(uploadControllerProvider.notifier).upload('clip.mp4');
  await tester.pumpAndSettle();
}

void main() {
  group('VideoUploadScreen', () {
    for (final brightness in Brightness.values) {
      testWidgets('renders without throwing in ${brightness.name}', (
        tester,
      ) async {
        await pumpScreen(
          tester,
          const VideoUploadScreen(),
          brightness: brightness,
          overrides: [
            videoAnalysisRepositoryProvider.overrideWithValue(
              _FakeRepository(job: _job(status: VideoAnalysisStatus.accepted)),
            ),
          ],
        );
        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('shows every rejection reason verbatim', (tester) async {
      // The whole point of the screen. These sentences come from the CV
      // service, are calibrated against real footage, and say what to do about
      // the problem — collapsing them into "invalid video" would leave the
      // person with nothing actionable.
      await _pumpWithVerdict(
        tester,
        _job(
          status: VideoAnalysisStatus.rejected,
          reasons: const [
            'This clip is in portrait. Turn the phone sideways.',
            '480x864 is too low to track a tennis ball.',
          ],
        ),
      );

      expect(find.text("This clip can't be analysed"), findsOneWidget);
      expect(
        find.text('This clip is in portrait. Turn the phone sideways.'),
        findsOneWidget,
      );
      expect(
        find.text('480x864 is too low to track a tennis ball.'),
        findsOneWidget,
      );
    });

    testWidgets('does not claim a passing clip has been analysed', (
      tester,
    ) async {
      // Nothing analyses a clip yet. Saying so plainly costs nothing here and
      // avoids promising a result that will never arrive.
      await _pumpWithVerdict(
        tester,
        _job(status: VideoAnalysisStatus.accepted),
      );

      expect(find.text('This clip looks usable'), findsOneWidget);
      expect(
        find.textContaining('Analysis itself is still being built'),
        findsOneWidget,
      );
    });

    testWidgets('says so when the court was never checked', (tester) async {
      // A pass with the court unchecked is not a pass on the court.
      await _pumpWithVerdict(
        tester,
        _job(status: VideoAnalysisStatus.accepted, courtChecked: false),
      );

      expect(
        find.textContaining('couldn’t check the court markings'),
        findsOneWidget,
      );
    });

    testWidgets('stays quiet about the court when it was checked', (
      tester,
    ) async {
      await _pumpWithVerdict(
        tester,
        _job(status: VideoAnalysisStatus.accepted, courtChecked: true),
      );

      expect(find.textContaining('couldn’t check the court markings'), findsNothing);
    });

    testWidgets('surfaces warnings on a clip that passed', (tester) async {
      await _pumpWithVerdict(
        tester,
        _job(
          status: VideoAnalysisStatus.accepted,
          findings: const [
            PrecheckFinding(
              check: 'camera_motion',
              severity: 'warn',
              message: 'The camera drifts during this clip.',
            ),
          ],
        ),
      );

      expect(find.text('Worth knowing'), findsOneWidget);
      expect(
        find.text('The camera drifts during this clip.'),
        findsOneWidget,
      );
    });

    testWidgets('warns before upload when clip checking is offline', (
      tester,
    ) async {
      // Said before a file is picked, because the alternative is spending a few
      // hundred MB of mobile data and finding out afterwards.
      await pumpScreen(
        tester,
        const VideoUploadScreen(),
        overrides: [
          videoAnalysisRepositoryProvider.overrideWithValue(
            _FakeRepository(
              job: _job(status: VideoAnalysisStatus.accepted),
              status: const CvServiceStatus(up: false, courtModelLoaded: false),
            ),
          ),
        ],
      );

      expect(find.text('Clip checking is offline'), findsOneWidget);
    });
  });

  group('VideoAnalysisStatus', () {
    test('accepted does not read as analysed', () {
      // "Ready to analyse" and "Analysed" are different claims, and only one of
      // them is true today.
      expect(VideoAnalysisStatus.accepted.label, 'Ready to analyse');
      expect(VideoAnalysisStatus.completed.label, 'Analysed');
    });

    test('maps unknown values to pending rather than throwing', () {
      expect(VideoAnalysisStatus.fromJson('SOMETHING_NEW'),
          VideoAnalysisStatus.pending);
    });
  });
}
