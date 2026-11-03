import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/video_analysis_providers.dart';
import '../data/video_analysis_repository.dart';
import '../../../core/l10n/l10n.dart';

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
      title: context.l10n.videoClipAnalysis,
      body: job.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _Message(
          title: context.l10n.videoLoadClipFailed,
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
          title: context.l10n.videoAnalysisUnfinished,
          body:
              job.failureReason ??
              context.l10n.videoAnalysisError,
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
          title: context.l10n.videoClipRejected,
          body: context.l10n.videoWhatToChange,
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
        _Message(
          title: context.l10n.videoClipPassed,
          body: context.l10n.videoReadyToAnalyse,
          tone: _Tone.success,
        ),
        const SizedBox(height: DriftSpacing.s4),
        Text(
          // Said before they commit to it: analysis is minutes of scarce GPU
          // time, and a person who knows that will not tap it twice.
          context.l10n.videoTakesMinutes,
          style: type.bodySmall.copyWith(color: colors.textSecondary),
        ),
        if (_error != null) ...[
          const SizedBox(height: DriftSpacing.s4),
          _Message(
            title: context.l10n.videoDidntWork,
            body: _error!,
            tone: _Tone.error,
          ),
        ],
        const SizedBox(height: DriftSpacing.s6),
        DriftButton(
          label: _requesting
              ? context.l10n.videoStarting
              : context.l10n.videoAnalyseThis,
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
        Text(context.l10n.videoAnalysingYourClip, style: type.subtitle),
        const SizedBox(height: DriftSpacing.s2),
        Text(
          context.l10n.videoTakesMinutesLeave,
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
            title: context.l10n.videoNoDistances,
            // The pipeline's own words where it gave them, because they are more
            // precise than anything restated here.
            body:
                job.analysisWarning ??
                context.l10n.videoNoDistancesBody,
            tone: _Tone.warning,
          ),

        const SizedBox(height: DriftSpacing.s5),
        Text(context.l10n.videoShots, style: type.subtitle),
        const SizedBox(height: DriftSpacing.s3),
        // Counts come from ball-contact detection, which does not depend on the
        // court fit — so they survive an uncalibrated clip intact.
        Row(
          children: [
            Expanded(
              child: _Stat(label: context.l10n.commonYou, value: '${shotsP1 ?? 0}'),
            ),
            const SizedBox(width: DriftSpacing.s3),
            Expanded(
              child: _Stat(
                label: context.l10n.videoOpponent,
                value: '${shotsP2 ?? 0}',
              ),
            ),
          ],
        ),

        if (shotTypes != null && shotTypes.isNotEmpty) ...[
          const SizedBox(height: DriftSpacing.s5),
          Text(context.l10n.videoShotTypes, style: type.subtitle),
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
            context.l10n.videoShotTypesNote,
            style: type.caption.copyWith(color: colors.textSecondary),
          ),
        ],

        if (calibrated) ...[
          const SizedBox(height: DriftSpacing.s5),
          Text(context.l10n.videoSpeed, style: type.subtitle),
          const SizedBox(height: DriftSpacing.s3),
          _SpeedRows(summary: summary),
        ],

        const SizedBox(height: DriftSpacing.s6),
        Text(
          context.l10n.videoEarlyNote,
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

    addSpeed('avg_shot_speed_p1_kmh', context.l10n.videoYourAvgShot);
    addSpeed('avg_shot_speed_p2_kmh', context.l10n.videoOpponentAvgShot);
    addSpeed('serve_avg_flight_speed_kmh', context.l10n.videoServeAvg);

    if (rows.isEmpty) {
      return Text(
        context.l10n.videoNoSpeeds,
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
          context.l10n.videoSpeedNote,
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
            title: context.l10n.videoMeasuredSome(
              job.segmentsAnalysed,
              job.segmentsFound,
            ),
            body: context.l10n.videoMeasuredSomeBody(job.segmentsAnalysed),
            tone: _Tone.warning,
          )
        else
          _Message(
            title: context.l10n.videoMeasuredAll(job.segmentsAnalysed),
            body: context.l10n.videoMeasuredAllBody,
            tone: _Tone.success,
          ),

        if (job.segmentsUncalibrated > 0) ...[
          const SizedBox(height: DriftSpacing.s3),
          _Message(
            title: context.l10n.videoSomeUncalibrated,
            // The pipeline's own sentence where it gave one: it knows how many and why.
            body:
                job.analysisWarning ??
                context.l10n.videoSomeUncalibratedBody(
                  job.segmentsUncalibrated,
                ),
            tone: _Tone.warning,
          ),
        ],

        const SizedBox(height: DriftSpacing.s5),
        Text(context.l10n.videoSessionTotals, style: type.subtitle),
        const SizedBox(height: DriftSpacing.s3),
        Row(
          children: [
            Expanded(
              child: _Stat(
                label: context.l10n.videoRalliesMeasured,
                value: '${job.segmentsAnalysed}',
              ),
            ),
            const SizedBox(width: DriftSpacing.s3),
            // Shot counts come from contact detection, which does not depend on the court
            // fit, so they survive uncalibrated rallies intact — same as a single clip.
            Expanded(
              child: _Stat(label: context.l10n.videoShots, value: '${shots ?? 0}'),
            ),
          ],
        ),

        if (shotsP1 != null || shotsP2 != null) ...[
          const SizedBox(height: DriftSpacing.s3),
          Row(
            children: [
              Expanded(
                child: _Stat(
                  label: context.l10n.commonYou,
                  value: '${shotsP1 ?? 0}',
                ),
              ),
              const SizedBox(width: DriftSpacing.s3),
              Expanded(
                child: _Stat(
                  label: context.l10n.videoOpponent,
                  value: '${shotsP2 ?? 0}',
                ),
              ),
            ],
          ),
        ],

        if (shotTypes.isNotEmpty) ...[
          const SizedBox(height: DriftSpacing.s5),
          Text(context.l10n.videoShotTypes, style: type.subtitle),
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
            context.l10n.videoShotTypesNote,
            style: type.caption.copyWith(color: colors.textSecondary),
          ),
        ],

        if (job.courtCalibrated) ...[
          const SizedBox(height: DriftSpacing.s5),
          Text(context.l10n.videoSpeed, style: type.subtitle),
          const SizedBox(height: DriftSpacing.s3),
          // Fed the session totals rather than a single summary. Those averages are
          // weighted by the shots that produced them, not a mean of per-rally means,
          // which would weight a one-shot rally like a twelve-shot one.
          _SpeedRows(summary: totals),
        ],

        if (segments.isNotEmpty) ...[
          const SizedBox(height: DriftSpacing.s6),
          Text(context.l10n.videoRallyByRally, style: type.subtitle),
          const SizedBox(height: DriftSpacing.s3),
          ...segments.map((segment) => _SegmentRow(segment: segment)),
        ],

        const SizedBox(height: DriftSpacing.s6),
        Text(
          context.l10n.videoEarlyNote,
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
            ? context.l10n.videoShotCount(segment.shots)
            : context.l10n.videoShotCountNoCourt(segment.shots),
      ),
      'skipped_budget' => (
        Icons.schedule,
        colors.textSecondary,
        context.l10n.videoSkippedBudget,
      ),
      'skipped_too_short' => (
        Icons.straighten,
        colors.textSecondary,
        context.l10n.videoTooShort,
      ),
      _ => (
        Icons.error_outline,
        colors.error,
        segment.reason ?? context.l10n.videoRallyFailed,
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
