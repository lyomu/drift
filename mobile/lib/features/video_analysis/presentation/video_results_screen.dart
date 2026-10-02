import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/video_analysis_providers.dart';
import '../data/video_analysis_repository.dart';

/// What the pipeline found in one clip.
///
/// The hard part of this screen is not laying out numbers, it is refusing to
/// show some of them. Every distance and speed the pipeline produces comes from
/// a homography fitted to the court's painted lines. When that fit fails — which
/// it did on every clip in the first batch of real Drift footage — the numbers
/// still come out, still look plausible, and mean nothing. The pipeline says so
/// itself in `court_calibrated`, and this screen acts on it: shot counts stay,
/// speeds go, and the reason is shown rather than implied.
///
/// Showing a speed under a "not a measurement" caption was the alternative, and
/// it is worse. Numbers get screenshotted and quoted without their caption.
class VideoResultsScreen extends ConsumerWidget {
  const VideoResultsScreen({super.key, required this.jobId});

  final String jobId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final job = ref.watch(jobWatcherProvider(jobId));

    return DriftScaffold(
      title: 'Clip analysis',
      body: job.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _Message(
          title: "Couldn't load this clip",
          body: error.toString(),
        ),
        data: (job) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
          children: [_Body(job: job)],
        ),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.job});

  final VideoAnalysisJob job;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    switch (job.status) {
      case VideoAnalysisStatus.rejected:
        return _Rejected(job: job);
      case VideoAnalysisStatus.accepted:
        return _ReadyToAnalyse(job: job);
      case VideoAnalysisStatus.pending:
      case VideoAnalysisStatus.analyzing:
        return const _Working();
      case VideoAnalysisStatus.failed:
        return _Message(
          title: "That analysis didn't finish",
          body:
              job.failureReason ??
              'Something went wrong while analysing this clip.',
        );
      case VideoAnalysisStatus.completed:
        // A session and a single rally are different screens, not one screen with extra
        // rows. A session's first question is "how much of it did you measure", which a
        // single clip never has to answer.
        return job.isSession ? _SessionResults(job: job) : _Results(job: job);
    }
  }
}

class _Rejected extends StatelessWidget {
  const _Rejected({required this.job});

  final VideoAnalysisJob job;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Message(
          title: "This clip couldn't be analysed",
          body: 'Here’s what to change before filming again.',
          tone: _Tone.error,
        ),
        const SizedBox(height: DriftSpacing.s5),
        ...job.rejectionReasons.map(
          (reason) => Padding(
            padding: const EdgeInsets.only(bottom: DriftSpacing.s3),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.close, size: 18, color: colors.error),
                const SizedBox(width: DriftSpacing.s2),
                Expanded(child: Text(reason, style: type.body)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ReadyToAnalyse extends ConsumerStatefulWidget {
  const _ReadyToAnalyse({required this.job});

  final VideoAnalysisJob job;

  @override
  ConsumerState<_ReadyToAnalyse> createState() => _ReadyToAnalyseState();
}

class _ReadyToAnalyseState extends ConsumerState<_ReadyToAnalyse> {
  bool _requesting = false;
  String? _error;

  Future<void> _analyse() async {
    setState(() {
      _requesting = true;
      _error = null;
    });
    try {
      await ref
          .read(jobWatcherProvider(widget.job.id).notifier)
          .requestAnalysis();
    } on VideoAnalysisException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _requesting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _Message(
          title: 'This clip passed its checks',
          body: 'It’s ready to analyse whenever you are.',
          tone: _Tone.success,
        ),
        const SizedBox(height: DriftSpacing.s4),
        Text(
          // Said before they commit to it: analysis is minutes of scarce GPU
          // time, and a person who knows that will not tap it twice.
          'Analysing takes a few minutes. We’ll notify you when it’s done — you '
          'don’t need to stay on this screen.',
          style: type.bodySmall.copyWith(color: colors.textSecondary),
        ),
        if (_error != null) ...[
          const SizedBox(height: DriftSpacing.s4),
          _Message(title: "That didn't work", body: _error!, tone: _Tone.error),
        ],
        const SizedBox(height: DriftSpacing.s6),
        DriftButton(
          label: _requesting ? 'Starting…' : 'Analyse this clip',
          onPressed: _requesting ? null : _analyse,
        ),
      ],
    );
  }
}

class _Working extends StatelessWidget {
  const _Working();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Column(
      children: [
        const SizedBox(height: DriftSpacing.s8),
        const CircularProgressIndicator(),
        const SizedBox(height: DriftSpacing.s5),
        Text('Analysing your clip…', style: type.subtitle),
        const SizedBox(height: DriftSpacing.s2),
        Text(
          'This takes a few minutes. We’ll notify you when it’s ready, so you '
          'can leave this screen.',
          textAlign: TextAlign.center,
          style: type.bodySmall.copyWith(color: colors.textSecondary),
        ),
      ],
    );
  }
}

class _Results extends StatelessWidget {
  const _Results({required this.job});

  final VideoAnalysisJob job;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final summary = job.analysisResult ?? const {};
    final calibrated = job.courtCalibrated;

    final shotsP1 = (summary['total_shots_p1'] as num?)?.toInt();
    final shotsP2 = (summary['total_shots_p2'] as num?)?.toInt();
    final shotTypes =
        (summary['shot_classification'] as Map<String, dynamic>?)?['types']
            as Map<String, dynamic>?;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!calibrated)
          _Message(
            title: 'Distances and speeds aren’t available for this clip',
            // The pipeline's own words where it gave them, because they are more
            // precise than anything restated here.
            body:
                job.analysisWarning ??
                'The court lines couldn’t be read clearly enough to measure '
                    'distances, so speeds and court positions would not be '
                    'real measurements. Shot counts below are still accurate.',
            tone: _Tone.warning,
          ),

        const SizedBox(height: DriftSpacing.s5),
        Text('Shots', style: type.subtitle),
        const SizedBox(height: DriftSpacing.s3),
        // Counts come from ball-contact detection, which does not depend on the
        // court fit — so they survive an uncalibrated clip intact.
        Row(
          children: [
            Expanded(child: _Stat(label: 'You', value: '${shotsP1 ?? 0}')),
            const SizedBox(width: DriftSpacing.s3),
            Expanded(child: _Stat(label: 'Opponent', value: '${shotsP2 ?? 0}')),
          ],
        ),

        if (shotTypes != null && shotTypes.isNotEmpty) ...[
          const SizedBox(height: DriftSpacing.s5),
          Text('Shot types', style: type.subtitle),
          const SizedBox(height: DriftSpacing.s2),
          ...shotTypes.entries.map(
            (entry) => Padding(
              padding: const EdgeInsets.only(bottom: DriftSpacing.s1),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(entry.key, style: type.body),
                  Text('${entry.value}', style: type.body),
                ],
              ),
            ),
          ),
          const SizedBox(height: DriftSpacing.s2),
          Text(
            // Stroke typing is the least reliable thing in the pipeline and is
            // explicitly unproven on Drift footage. Saying so beats letting a
            // tidy list imply otherwise.
            'Shot types are an early feature and are often wrong. Treat them as '
            'a rough guide.',
            style: type.caption.copyWith(color: colors.textSecondary),
          ),
        ],

        if (calibrated) ...[
          const SizedBox(height: DriftSpacing.s5),
          Text('Speed', style: type.subtitle),
          const SizedBox(height: DriftSpacing.s3),
          _SpeedRows(summary: summary),
        ],

        const SizedBox(height: DriftSpacing.s6),
        Text(
          'Analysis is an early feature. Numbers here come from a single camera '
          'and are estimates, not radar readings.',
          style: type.caption.copyWith(color: colors.textSecondary),
        ),
      ],
    );
  }
}

class _SpeedRows extends StatelessWidget {
  const _SpeedRows({required this.summary});

  final Map<String, dynamic> summary;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    final rows = <(String, String)>[];

    void addSpeed(String key, String label) {
      final value = (summary[key] as num?)?.toDouble();
      // 0 is the pipeline's "no data", not a measured zero, and showing
      // "0.0 km/h" would read as a result rather than an absence.
      if (value != null && value > 0) {
        rows.add((label, '${value.toStringAsFixed(1)} km/h'));
      }
    }

    addSpeed('avg_shot_speed_p1_kmh', 'Your average shot');
    addSpeed('avg_shot_speed_p2_kmh', 'Opponent average shot');
    addSpeed('serve_avg_flight_speed_kmh', 'Serve (average over flight)');

    if (rows.isEmpty) {
      return Text(
        'No speeds could be measured from this clip.',
        style: type.bodySmall.copyWith(color: colors.textSecondary),
      );
    }

    return Column(
      children: [
        ...rows.map(
          (row) => Padding(
            padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(row.$1, style: type.body)),
                Text(row.$2, style: type.body),
              ],
            ),
          ),
        ),
        const SizedBox(height: DriftSpacing.s1),
        Text(
          // Named for what it is. The pipeline is explicit that this is an
          // average over the ball's flight, which is below what a radar reads at
          // contact, and presenting it as the latter would be wrong.
          'Averaged over the ball’s flight, so lower than a radar reading at '
          'contact.',
          style: type.caption.copyWith(color: colors.textSecondary),
        ),
      ],
    );
  }
}

/// What the pipeline found across a whole session.
///
/// The thing this screen must not do is present partial totals as complete ones. A session
/// runs under a frame budget because the service has one GPU, so a 12-minute upload can
/// easily contain more rallies than there was time to measure. Totals over 8 of 20 rallies
/// are a real measurement of those 8 and say nothing about the other 12 — and a number
/// without its denominator gets screenshotted and quoted without it.
///
/// So the count of rallies found versus measured sits above the totals, not in a footnote,
/// and the per-rally list shows every rally including the ones that were skipped, each with
/// its reason.
class _SessionResults extends StatelessWidget {
  const _SessionResults({required this.job});

  final VideoAnalysisJob job;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final totals = job.sessionTotals;
    final shotTypes = job.sessionShotTypes;
    final segments = job.segments;

    final shots = (totals['total_shots'] as num?)?.toInt();
    final shotsP1 = (totals['total_shots_p1'] as num?)?.toInt();
    final shotsP2 = (totals['total_shots_p2'] as num?)?.toInt();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (job.isPartialSession)
          _Message(
            title:
                'We measured ${job.segmentsAnalysed} of '
                '${job.segmentsFound} rallies',
            body:
                'Analysing video is slow, so we work through as much of a session as '
                'we can. The totals below cover the ${job.segmentsAnalysed} rallies '
                'we measured — not the whole session. Every rally we found is listed '
                'further down.',
            tone: _Tone.warning,
          )
        else
          _Message(
            title:
                'We measured all ${job.segmentsAnalysed} '
                'rall${job.segmentsAnalysed == 1 ? 'y' : 'ies'} we found',
            body: 'The totals below cover the whole session.',
            tone: _Tone.success,
          ),

        if (job.segmentsUncalibrated > 0) ...[
          const SizedBox(height: DriftSpacing.s3),
          _Message(
            title: 'Some rallies could not be measured for speed',
            // The pipeline's own sentence where it gave one: it knows how many and why.
            body:
                job.analysisWarning ??
                '${job.segmentsUncalibrated} of the rallies we measured did not have '
                    'clear enough court lines, so they add to the shot counts but not '
                    'to the speeds.',
            tone: _Tone.warning,
          ),
        ],

        const SizedBox(height: DriftSpacing.s5),
        Text('Session totals', style: type.subtitle),
        const SizedBox(height: DriftSpacing.s3),
        Row(
          children: [
            Expanded(
              child: _Stat(
                label: 'Rallies measured',
                value: '${job.segmentsAnalysed}',
              ),
            ),
            const SizedBox(width: DriftSpacing.s3),
            // Shot counts come from contact detection, which does not depend on the court
            // fit, so they survive uncalibrated rallies intact — same as a single clip.
            Expanded(child: _Stat(label: 'Shots', value: '${shots ?? 0}')),
          ],
        ),

        if (shotsP1 != null || shotsP2 != null) ...[
          const SizedBox(height: DriftSpacing.s3),
          Row(
            children: [
              Expanded(child: _Stat(label: 'You', value: '${shotsP1 ?? 0}')),
              const SizedBox(width: DriftSpacing.s3),
              Expanded(
                child: _Stat(label: 'Opponent', value: '${shotsP2 ?? 0}'),
              ),
            ],
          ),
        ],

        if (shotTypes.isNotEmpty) ...[
          const SizedBox(height: DriftSpacing.s5),
          Text('Shot types', style: type.subtitle),
          const SizedBox(height: DriftSpacing.s2),
          ...shotTypes.entries.map(
            (entry) => Padding(
              padding: const EdgeInsets.only(bottom: DriftSpacing.s1),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(entry.key, style: type.body),
                  Text('${entry.value}', style: type.body),
                ],
              ),
            ),
          ),
          const SizedBox(height: DriftSpacing.s2),
          Text(
            'Shot types are an early feature and are often wrong. Treat them as '
            'a rough guide.',
            style: type.caption.copyWith(color: colors.textSecondary),
          ),
        ],

        if (job.courtCalibrated) ...[
          const SizedBox(height: DriftSpacing.s5),
          Text('Speed', style: type.subtitle),
          const SizedBox(height: DriftSpacing.s3),
          // Fed the session totals rather than a single summary. Those averages are
          // weighted by the shots that produced them, not a mean of per-rally means,
          // which would weight a one-shot rally like a twelve-shot one.
          _SpeedRows(summary: totals),
        ],

        if (segments.isNotEmpty) ...[
          const SizedBox(height: DriftSpacing.s6),
          Text('Rally by rally', style: type.subtitle),
          const SizedBox(height: DriftSpacing.s3),
          ...segments.map((segment) => _SegmentRow(segment: segment)),
        ],

        const SizedBox(height: DriftSpacing.s6),
        Text(
          'Analysis is an early feature. Numbers here come from a single camera '
          'and are estimates, not radar readings.',
          style: type.caption.copyWith(color: colors.textSecondary),
        ),
      ],
    );
  }
}

/// One rally in the session list, measured or not.
///
/// A skipped rally is shown, not hidden. It is a real passage of play that we found and
/// chose not to measure, and omitting it would make the session look shorter than it was.
class _SegmentRow extends StatelessWidget {
  const _SegmentRow({required this.segment});

  final SessionSegment segment;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    final (icon, tint, note) = switch (segment.status) {
      'analysed' => (
        Icons.check_circle_outline,
        colors.success,
        segment.courtCalibrated
            ? '${segment.shots} shots'
            : '${segment.shots} shots · no court fit, so no speeds',
      ),
      'skipped_budget' => (
        Icons.schedule,
        colors.textSecondary,
        'Not measured — we ran out of analysis time for this session',
      ),
      'skipped_too_short' => (
        Icons.straighten,
        colors.textSecondary,
        'Too short to measure',
      ),
      _ => (
        Icons.error_outline,
        colors.error,
        segment.reason ?? 'This rally could not be analysed',
      ),
    };

    return Padding(
      padding: const EdgeInsets.only(bottom: DriftSpacing.s3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: tint),
          const SizedBox(width: DriftSpacing.s2),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${segment.timestampLabel}  ·  ${segment.durationLabel}',
                  style: type.body,
                ),
                const SizedBox(height: 2),
                Text(
                  note,
                  style: type.caption.copyWith(color: colors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Container(
      padding: const EdgeInsets.all(DriftSpacing.s4),
      decoration: BoxDecoration(
        color: colors.surfaceRaised,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: type.h2),
          const SizedBox(height: DriftSpacing.s1),
          Text(
            label,
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
        ],
      ),
    );
  }
}

enum _Tone { success, warning, error, neutral }

class _Message extends StatelessWidget {
  const _Message({
    required this.title,
    required this.body,
    this.tone = _Tone.neutral,
  });

  final String title;
  final String body;
  final _Tone tone;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    final (surface, accent, icon) = switch (tone) {
      _Tone.success => (
        colors.successSurface,
        colors.success,
        Icons.check_circle_outline,
      ),
      _Tone.warning => (
        colors.warningSurface,
        colors.warning,
        Icons.info_outline,
      ),
      _Tone.error => (colors.errorSurface, colors.error, Icons.error_outline),
      _Tone.neutral => (colors.surfaceRaised, colors.primary, Icons.info_outline),
    };

    return Container(
      padding: const EdgeInsets.all(DriftSpacing.s4),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: accent),
          const SizedBox(width: DriftSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: type.subtitle),
                const SizedBox(height: DriftSpacing.s1),
                Text(
                  body,
                  style: type.bodySmall.copyWith(color: colors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
