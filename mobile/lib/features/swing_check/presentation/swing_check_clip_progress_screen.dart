import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../application/clip_analysis_controller.dart';

/// Analyses a recorded clip on the phone: progress while frames are read,
/// then the same results screen a live session opens.
class SwingCheckClipProgressScreen extends ConsumerStatefulWidget {
  const SwingCheckClipProgressScreen({super.key, required this.request});

  final SwingClipRequest request;

  @override
  ConsumerState<SwingCheckClipProgressScreen> createState() =>
      _SwingCheckClipProgressScreenState();
}

class _SwingCheckClipProgressScreenState
    extends ConsumerState<SwingCheckClipProgressScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(clipAnalysisControllerProvider(widget.request).notifier).start();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = clipAnalysisControllerProvider(widget.request);
    final state = ref.watch(provider);
    final controller = ref.read(provider.notifier);
    final l10n = context.l10n;

    ref.listen(provider, (previous, next) {
      if (next.phase == ClipPhase.saved && next.savedId != null) {
        context.pushReplacement('/swing-check/${next.savedId}');
      } else if (next.phase == ClipPhase.cancelled) {
        context.pop();
      }
    });

    return DriftScaffold(
      title: l10n.swingClipTitle,
      body: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: switch (state.phase) {
              ClipPhase.idle || ClipPhase.analysing || ClipPhase.cancelled =>
                _AnalysingPanel(state: state, onCancel: controller.cancel),
              ClipPhase.saving || ClipPhase.saved => const _SavingPanel(),
              ClipPhase.failed => _FailedPanel(
                message: state.error ?? l10n.swingClipFailed,
                canRetrySave: state.analysis != null && state.analysis!.detected > 0,
                onRetrySave: controller.retrySave,
                onBack: () => context.pop(),
              ),
            },
          ),
        ),
      ),
    );
  }
}

class _AnalysingPanel extends StatelessWidget {
  const _AnalysingPanel({required this.state, required this.onCancel});

  final ClipAnalysisState state;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final progress = state.progress;
    final started = progress.total > 0;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            minHeight: 8,
            value: started ? progress.fraction : null,
            color: colors.primary,
            backgroundColor: colors.border,
          ),
        ),
        const SizedBox(height: DriftSpacing.s3),
        Text(
          started
              ? l10n.swingClipProgress(progress.done, progress.total)
              : l10n.swingClipOpening,
          style: type.subtitle,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: DriftSpacing.s2),
        Text(
          l10n.swingClipKeepOpen,
          style: type.bodySmall.copyWith(color: colors.textSecondary),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: DriftSpacing.s6),
        DriftButton(
          label: l10n.commonCancel,
          variant: DriftButtonVariant.text,
          onPressed: onCancel,
        ),
      ],
    );
  }
}

class _SavingPanel extends StatelessWidget {
  const _SavingPanel();

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const CircularProgressIndicator(),
        const SizedBox(height: DriftSpacing.s3),
        Text(context.l10n.swingSaving, style: type.body),
      ],
    );
  }
}

class _FailedPanel extends StatelessWidget {
  const _FailedPanel({
    required this.message,
    required this.canRetrySave,
    required this.onRetrySave,
    required this.onBack,
  });

  final String message;
  final bool canRetrySave;
  final VoidCallback onRetrySave;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(Icons.info_outline_rounded, size: 40, color: colors.textSecondary),
        const SizedBox(height: DriftSpacing.s3),
        Text(message, style: type.body, textAlign: TextAlign.center),
        const SizedBox(height: DriftSpacing.s5),
        if (canRetrySave) ...[
          DriftButton(label: l10n.swingRetrySave, onPressed: onRetrySave),
          const SizedBox(height: DriftSpacing.s2),
        ],
        DriftButton(
          label: l10n.swingBackToSetup,
          variant: canRetrySave ? DriftButtonVariant.text : DriftButtonVariant.primary,
          onPressed: onBack,
        ),
      ],
    );
  }
}
