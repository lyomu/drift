import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/swing_check_providers.dart';
import '../domain/swing_metrics.dart';
import '../domain/swing_session.dart';
import 'swing_metric_format.dart';

/// One saved session: how many swings were measured, the averages and their
/// spread, the coach's tips, and every swing including the refused ones.
class SwingCheckResultsScreen extends ConsumerWidget {
  const SwingCheckResultsScreen({super.key, required this.sessionId});

  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final detail = ref.watch(sessionDetailProvider(sessionId));

    return DriftScaffold(
      title: l10n.swingResultsTitle,
      body: detail.session.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Center(
          child: Padding(
            padding: const EdgeInsets.all(DriftSpacing.s6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(l10n.swingLoadFailed, textAlign: TextAlign.center),
                const SizedBox(height: DriftSpacing.s4),
                DriftButton(
                  label: l10n.commonRetry,
                  onPressed: () =>
                      ref.read(sessionDetailProvider(sessionId).notifier).load(),
                ),
              ],
            ),
          ),
        ),
        data: (session) => _Body(session: session, detail: detail, sessionId: sessionId),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.session, required this.detail, required this.sessionId});

  final SwingSessionRecord session;
  final SessionDetailState detail;
  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final locale = context.localeTag;
    final keys = SwingMetric.forStroke(session.stroke)
        .where(session.summary.containsKey)
        .toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
      children: [
        Text(SwingMetricFormat.stroke(l10n, session.stroke), style: type.h3),
        const SizedBox(height: DriftSpacing.s1),
        Text(
          l10n.swingMeasuredOf(session.swingsMeasured, session.swingsDetected),
          style: type.body.copyWith(color: colors.textSecondary),
        ),
        if (session.source == SwingSource.clip) ...[
          const SizedBox(height: DriftSpacing.s2),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.video_file_outlined, size: 18, color: colors.textSecondary),
              const SizedBox(width: DriftSpacing.s2),
              Expanded(
                child: Text(
                  [
                    l10n.swingSourceClip,
                    if (session.clip?.truncated ?? false)
                      l10n.swingClipTruncated(
                        (session.clip!.analysedMs / 1000).round(),
                      ),
                  ].join(' · '),
                  style: type.bodySmall.copyWith(color: colors.textSecondary),
                ),
              ),
            ],
          ),
        ],
        const SizedBox(height: DriftSpacing.s5),
        if (!session.hasEnoughSwings)
          _Notice(
            icon: Icons.info_outline,
            color: colors.warning,
            surface: colors.warningSurface,
            title: l10n.swingNotEnoughTitle,
            body: l10n.swingNotEnoughBody,
          )
        else ...[
          Text(l10n.swingSummaryHeading, style: type.subtitle),
          const SizedBox(height: DriftSpacing.s3),
          for (final key in keys)
            _MetricRow(
              label: SwingMetricFormat.label(l10n, key),
              value: SwingMetricFormat.value(locale, key, session.summary[key]!.mean),
              spread: SwingMetricFormat.spread(locale, key, session.summary[key]!.spread),
            ),
          const SizedBox(height: DriftSpacing.s2),
          Text(
            l10n.swingApproxNote,
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: DriftSpacing.s6),
          _CoachSection(session: session, detail: detail, sessionId: sessionId),
        ],
        const SizedBox(height: DriftSpacing.s6),
        Text(l10n.swingSwingsHeading, style: type.subtitle),
        const SizedBox(height: DriftSpacing.s3),
        for (final swing in session.swings) _SwingCard(swing: swing, stroke: session.stroke),
        const SizedBox(height: DriftSpacing.s6),
        DriftButton(
          label: l10n.swingAgain,
          onPressed: () => context.pushReplacement('/swing-check'),
        ),
      ],
    );
  }
}

class _MetricRow extends StatelessWidget {
  const _MetricRow({required this.label, required this.value, required this.spread});

  final String label;
  final String value;
  final String spread;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: DriftSpacing.s3),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: colors.border))),
      child: Row(
        children: [
          Expanded(child: Text(label, style: type.body)),
          Text(value, style: type.subtitle),
          const SizedBox(width: DriftSpacing.s2),
          SizedBox(
            width: 72,
            child: Text(
              spread,
              textAlign: TextAlign.end,
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            ),
          ),
        ],
      ),
    );
  }
}

class _CoachSection extends ConsumerWidget {
  const _CoachSection({required this.session, required this.detail, required this.sessionId});

  final SwingSessionRecord session;
  final SessionDetailState detail;
  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final feedback = session.feedback;

    return Container(
      padding: const EdgeInsets.all(DriftSpacing.s4),
      decoration: BoxDecoration(
        color: colors.surfaceRaised,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.auto_awesome_rounded, color: colors.primary, size: 20),
              const SizedBox(width: DriftSpacing.s2),
              Text(l10n.swingCoachHeading, style: type.subtitle),
            ],
          ),
          const SizedBox(height: DriftSpacing.s3),
          if (detail.feedbackLoading)
            Row(
              children: [
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: DriftSpacing.s3),
                Expanded(child: Text(l10n.swingCoachLoading, style: type.body)),
              ],
            )
          else if (feedback != null) ...[
            Text(feedback.overall, style: type.body),
            const SizedBox(height: DriftSpacing.s3),
            for (final tip in feedback.tips)
              Padding(
                padding: const EdgeInsets.only(bottom: DriftSpacing.s3),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      SwingMetricFormat.label(l10n, tip.metric),
                      style: type.label.copyWith(color: colors.primary),
                    ),
                    const SizedBox(height: 2),
                    Text(tip.text, style: type.body),
                  ],
                ),
              ),
          ] else ...[
            Text(
              detail.feedbackError ?? l10n.swingCoachUnavailable,
              style: type.body.copyWith(color: colors.textSecondary),
            ),
            const SizedBox(height: DriftSpacing.s3),
            DriftButton(
              label: l10n.swingCoachRetry,
              variant: DriftButtonVariant.text,
              onPressed: () =>
                  ref.read(sessionDetailProvider(sessionId).notifier).requestFeedback(),
            ),
          ],
        ],
      ),
    );
  }
}

class _SwingCard extends StatelessWidget {
  const _SwingCard({required this.swing, required this.stroke});

  final SwingResult swing;
  final SwingStroke stroke;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final locale = context.localeTag;
    final keys = SwingMetric.forStroke(stroke).where(swing.values.containsKey);

    return Container(
      margin: const EdgeInsets.only(bottom: DriftSpacing.s3),
      padding: const EdgeInsets.all(DriftSpacing.s4),
      decoration: BoxDecoration(
        border: Border.all(color: colors.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(l10n.swingSwingLabel(swing.index + 1), style: type.subtitle),
              const Spacer(),
              if (!swing.measured)
                Text(
                  l10n.swingNotMeasured,
                  style: type.label.copyWith(color: colors.warning),
                ),
            ],
          ),
          const SizedBox(height: DriftSpacing.s2),
          if (!swing.measured)
            Text(
              SwingMetricFormat.reason(l10n, swing.reason),
              style: type.bodySmall.copyWith(color: colors.textSecondary),
            )
          else
            Wrap(
              spacing: DriftSpacing.s4,
              runSpacing: DriftSpacing.s2,
              children: [
                for (final key in keys)
                  Text(
                    '${SwingMetricFormat.label(l10n, key)}: '
                    '${SwingMetricFormat.value(locale, key, swing.values[key]!)}',
                    style: type.bodySmall,
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({
    required this.icon,
    required this.color,
    required this.surface,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final Color color;
  final Color surface;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Container(
      padding: const EdgeInsets.all(DriftSpacing.s4),
      decoration: BoxDecoration(color: surface, borderRadius: BorderRadius.circular(12)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color),
          const SizedBox(width: DriftSpacing.s3),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: type.subtitle),
                const SizedBox(height: DriftSpacing.s1),
                Text(body, style: type.bodySmall.copyWith(color: colors.textSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
