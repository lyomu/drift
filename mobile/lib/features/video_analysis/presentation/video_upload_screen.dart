import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/video_analysis_providers.dart';
import '../data/video_analysis_repository.dart';

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
      title: 'Analyse a clip',
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
        Text('For the best chance of a usable clip', style: type.subtitle),
        const SizedBox(height: DriftSpacing.s3),
        // Every line here is something that actually caused a refusal on the
        // first batch of real footage, in the order it cost us clips.
        ..._tips.map(
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

  static const _tips = [
    'Hold the phone sideways — landscape, not upright',
    'Prop it against the fence or use a tripod, and keep it still',
    'Get as much of the court in frame as you can',
    'Courts with clear, visible line markings work best',
    'One continuous take — no cuts or edits',
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
          label: 'Record a clip',
          onPressed: () => _pick(ref, ImageSource.camera),
        ),
        const SizedBox(height: DriftSpacing.s3),
        DriftButton(
          label: 'Choose from library',
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
          checking ? 'Checking your clip…' : 'Uploading…',
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
              ? 'This takes a couple of seconds.'
              : '${(state.progress * 100).round()}%',
          style: type.bodySmall.copyWith(color: colors.textSecondary),
        ),
        const SizedBox(height: DriftSpacing.s5),
        DriftButton(
          label: 'Cancel',
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
              ? "This clip can't be analysed"
              : 'This clip looks usable',
          // Not "we'll analyse it shortly": nothing analyses it yet, and the
          // honest version costs nothing here.
          subtitle: rejected
              ? 'Here’s what to change before filming again.'
              : 'It passed every check we can run today. Analysis itself is '
                    'still being built — we’ll let you know when it lands.',
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
          Text('Worth knowing', style: type.subtitle),
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
            'Note: we couldn’t check the court markings on this one, so we '
            'can’t promise the court itself will read correctly.',
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
        ],
        const SizedBox(height: DriftSpacing.s6),
        DriftButton(
          label: rejected ? 'Try another clip' : 'Upload another',
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
        title: "That didn't work",
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
        title: 'Clip checking is offline',
        // Said before they pick a file, because the alternative is uploading a
        // few hundred MB on mobile data and learning it afterwards.
        subtitle: "You can still upload, but we can't check the clip right now.",
      ),
    );
  }
}
