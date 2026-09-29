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
        return _Results(job: job);
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
