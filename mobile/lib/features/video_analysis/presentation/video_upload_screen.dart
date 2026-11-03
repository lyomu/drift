import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/video_analysis_providers.dart';
import '../data/video_analysis_repository.dart';
import '../../../core/l10n/l10n.dart';

/// Record or pick a clip, upload it, and find out straight away whether it can
/// be analysed.
///
/// The screen exists to deliver a refusal well, not to celebrate a success:
/// most clips fail, and they fail for reasons the person can fix — filmed in
/// portrait, sent through a messaging app, a court whose lines have worn away.
/// The server sends back a sentence per problem, calibrated against real
/// footage; those sentences are shown verbatim rather than collapsed into
/// "invalid video", which would leave someone with nothing to do next.
class VideoUploadScreen extends ConsumerWidget {
  const VideoUploadScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(uploadControllerProvider);
    final serviceStatus = ref.watch(cvServiceStatusProvider);

    return DriftScaffold(
      title: context.l10n.settingsAnalyseClip,
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          serviceStatus.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const _ServiceDownNotice(),
            data: (status) => status.up
                ? const SizedBox.shrink()
                : const _ServiceDownNotice(),
          ),
          const _Intro(),
          const SizedBox(height: DriftSpacing.s6),
          if (state.isBusy)
            _UploadProgress(state: state)
          else if (state.phase == UploadPhase.done && state.job != null)
            _Verdict(job: state.job!)
          else ...[
            if (state.error != null) _ErrorNotice(message: state.error!),
            const _Picker(),
          ],
        ],
      ),
    );
  }
}

class _Intro extends StatelessWidget {
  const _Intro();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(context.l10n.videoTipsHeading, style: type.subtitle),
        const SizedBox(height: DriftSpacing.s3),
        // Every line here is something that actually caused a refusal on the
        // first batch of real footage, in the order it cost us clips.
        ..._tips(context.l10n).map(
          (tip) => Padding(
            padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.check, size: 18, color: colors.primary),
                const SizedBox(width: DriftSpacing.s2),
                Expanded(
                  child: Text(
                    tip,
                    style: type.body.copyWith(color: colors.textSecondary),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  static List<String> _tips(AppLocalizations l) => [
    l.videoTip1,
    l.videoTip2,
    l.videoTip3,
    l.videoTip4,
    l.videoTip5,
  ];
}

class _Picker extends ConsumerWidget {
  const _Picker();

  Future<void> _pick(WidgetRef ref, ImageSource source) async {
    final file = await ImagePicker().pickVideo(
      source: source,
      // Long clips are slow to upload and the pipeline analyses one passage of
      // play, not a whole session.
      maxDuration: const Duration(minutes: 3),
    );
    if (file == null) return;
    await ref.read(uploadControllerProvider.notifier).upload(file.path);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      children: [
        DriftButton(
          label: context.l10n.videoRecord,
          onPressed: () => _pick(ref, ImageSource.camera),
        ),
        const SizedBox(height: DriftSpacing.s3),
        DriftButton(
          label: context.l10n.videoChooseLibrary,
          variant: DriftButtonVariant.text,
          onPressed: () => _pick(ref, ImageSource.gallery),
        ),
      ],
    );
  }
}

class _UploadProgress extends ConsumerWidget {
  const _UploadProgress({required this.state});

  final UploadState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final checking = state.phase == UploadPhase.checking;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          checking
              ? context.l10n.videoChecking
              : context.l10n.videoUploading,
          style: type.subtitle,
        ),
        const SizedBox(height: DriftSpacing.s3),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            // Indeterminate once the bytes are up: the server is working and a
            // bar frozen at 100% reads as a stall.
            value: checking ? null : state.progress,
            minHeight: 8,
            backgroundColor: colors.border,
          ),
        ),
        const SizedBox(height: DriftSpacing.s3),
        Text(
          checking
              ? context.l10n.videoCoupleSeconds
              : '${(state.progress * 100).round()}%',
          style: type.bodySmall.copyWith(color: colors.textSecondary),
        ),
        const SizedBox(height: DriftSpacing.s5),
        DriftButton(
          label: context.l10n.commonCancel,
          variant: DriftButtonVariant.text,
          onPressed: () => ref.read(uploadControllerProvider.notifier).cancel(),
        ),
      ],
    );
  }
}

class _Verdict extends ConsumerWidget {
  const _Verdict({required this.job});

  final VideoAnalysisJob job;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final rejected = job.status.isRejected;
    final warnings = job.findings.where((f) => f.isWarning).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Banner(
          icon: rejected ? Icons.error_outline : Icons.check_circle_outline,
          color: rejected ? colors.error : colors.success,
          surface: rejected ? colors.errorSurface : colors.successSurface,
          title: rejected
              ? context.l10n.videoClipRejected
              : context.l10n.videoClipUsable,
          // Not "we'll analyse it shortly": nothing analyses it yet, and the
          // honest version costs nothing here.
          subtitle: rejected
              ? context.l10n.videoWhatToChange
              : context.l10n.videoPassedChecks,
        ),
        if (rejected) ...[
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
        if (!rejected && warnings.isNotEmpty) ...[
          const SizedBox(height: DriftSpacing.s5),
          Text(context.l10n.videoWorthKnowing, style: type.subtitle),
          const SizedBox(height: DriftSpacing.s2),
          ...warnings.map(
            (finding) => Padding(
              padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
              child: Text(
                finding.message,
                style: type.bodySmall.copyWith(color: colors.textSecondary),
              ),
            ),
          ),
        ],
        if (!rejected && !job.courtChecked) ...[
          const SizedBox(height: DriftSpacing.s4),
          // A pass with the court unchecked is not a pass on the court. Saying
          // "looks good" flatly would overstate what was actually verified.
          Text(
            context.l10n.videoCourtUnchecked,
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
        ],
        const SizedBox(height: DriftSpacing.s6),
        if (!rejected) ...[
          DriftButton(
            label: context.l10n.videoAnalyseThis,
            onPressed: () {
              // Reset first: coming back to a screen still showing the previous
              // verdict, with its own "analyse" button, is how the same clip
              // gets queued twice.
              ref.read(uploadControllerProvider.notifier).reset();
              context.push('/video-analysis/${job.id}');
            },
          ),
          const SizedBox(height: DriftSpacing.s3),
        ],
        DriftButton(
          label: rejected
              ? context.l10n.videoTryAnother
              : context.l10n.videoUploadAnother,
          variant: rejected
              ? DriftButtonVariant.primary
              : DriftButtonVariant.text,
          onPressed: () => ref.read(uploadControllerProvider.notifier).reset(),
        ),
      ],
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({
    required this.icon,
    required this.color,
    required this.surface,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final Color color;
  final Color surface;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Container(
      padding: const EdgeInsets.all(DriftSpacing.s4),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(12),
      ),
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
                Text(
                  subtitle,
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

class _ErrorNotice extends StatelessWidget {
  const _ErrorNotice({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Padding(
      padding: const EdgeInsets.only(bottom: DriftSpacing.s4),
      child: _Banner(
        icon: Icons.error_outline,
        color: colors.error,
        surface: colors.errorSurface,
        title: context.l10n.videoDidntWork,
        subtitle: message,
      ),
    );
  }
}

class _ServiceDownNotice extends StatelessWidget {
  const _ServiceDownNotice();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Padding(
      padding: const EdgeInsets.only(bottom: DriftSpacing.s4),
      child: _Banner(
        icon: Icons.cloud_off,
        color: colors.warning,
        surface: colors.warningSurface,
        title: context.l10n.videoCheckingOffline,
        // Said before they pick a file, because the alternative is uploading a
        // few hundred MB on mobile data and learning it afterwards.
        subtitle: context.l10n.videoCheckingOfflineBody,
      ),
    );
  }
}
