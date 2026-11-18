import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../application/swing_check_providers.dart';
import 'widgets/pose_overlay_painter.dart';

/// Camera preview with the live skeleton, a framing hint and a swing counter.
/// Locked to landscape while open: the setup tips ask for it, and a landscape
/// frame keeps the whole body in view from 3-5 m.
class SwingCheckCaptureScreen extends ConsumerStatefulWidget {
  const SwingCheckCaptureScreen({super.key, required this.setup});

  final SwingCheckSetup setup;

  @override
  ConsumerState<SwingCheckCaptureScreen> createState() =>
      _SwingCheckCaptureScreenState();
}

class _SwingCheckCaptureScreenState
    extends ConsumerState<SwingCheckCaptureScreen> {
  @override
  void initState() {
    super.initState();
    SystemChrome.setPreferredOrientations(const [
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(captureControllerProvider(widget.setup).notifier).start();
    });
  }

  @override
  void dispose() {
    // Empty list = back to whatever the platform config allows.
    SystemChrome.setPreferredOrientations(const []);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = captureControllerProvider(widget.setup);
    final state = ref.watch(provider);
    final controller = ref.read(provider.notifier);
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final l10n = context.l10n;

    ref.listen(provider, (previous, next) {
      if (next.phase == CapturePhase.saved && next.savedId != null) {
        context.pushReplacement('/swing-check/${next.savedId}');
      }
    });

    final camera = controller.source.previewController;
    final showPreview = camera != null && camera.value.isInitialized;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (showPreview)
            ClipRect(
              child: FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                  width: camera.value.previewSize?.height ?? 1,
                  height: camera.value.previewSize?.width ?? 1,
                  child: CameraPreview(camera),
                ),
              ),
            ),
          if (showPreview)
            CustomPaint(
              painter: PoseOverlayPainter(
                frame: state.latestFrame,
                imageSize: controller.source.imageSize,
                hand: widget.setup.hand,
                boneColor: Colors.white,
                armColor: colors.primary,
              ),
            ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(DriftSpacing.s4),
              child: switch (state.phase) {
                CapturePhase.idle || CapturePhase.starting => _Centered(
                  child: Text(l10n.swingStarting, style: type.body.copyWith(color: Colors.white)),
                ),
                CapturePhase.recording => _RecordingHud(
                  state: state,
                  onStop: controller.stop,
                ),
                CapturePhase.saving || CapturePhase.saved => _Centered(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(color: Colors.white),
                      const SizedBox(height: DriftSpacing.s3),
                      Text(l10n.swingSaving, style: type.body.copyWith(color: Colors.white)),
                    ],
                  ),
                ),
                CapturePhase.failed => _Centered(
                  child: _FailedPanel(
                    message: state.error ?? l10n.swingErrorGeneric,
                    canRetrySave: state.analysis != null && state.analysis!.detected > 0,
                    onRetrySave: controller.retrySave,
                    onBack: () => context.pop(),
                  ),
                ),
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _Centered extends StatelessWidget {
  const _Centered({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Center(child: child);
}

class _RecordingHud extends StatelessWidget {
  const _RecordingHud({required this.state, required this.onStop});

  final CaptureState state;
  final VoidCallback onStop;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final good = state.framing == FramingStatus.good;
    final framingText = switch (state.framing) {
      FramingStatus.noPerson => l10n.swingFramingNoPerson,
      FramingStatus.armHidden => l10n.swingFramingArmHidden,
      FramingStatus.bodyCut => l10n.swingFramingBodyCut,
      FramingStatus.good => l10n.swingFramingGood,
    };
    final seconds = state.elapsed.inSeconds;
    final clock = '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            _Chip(
              icon: good ? Icons.check_circle : Icons.warning_amber_rounded,
              color: good ? colors.success : colors.warning,
              text: framingText,
            ),
            const Spacer(),
            _Chip(icon: Icons.timer_outlined, color: Colors.white, text: clock),
            const SizedBox(width: DriftSpacing.s2),
            _Chip(
              icon: Icons.sports_tennis,
              color: Colors.white,
              text: l10n.swingSwingCount(state.swingsSoFar),
            ),
          ],
        ),
        const Spacer(),
        Text(
          l10n.swingRecordingHint,
          textAlign: TextAlign.center,
          style: type.bodySmall.copyWith(color: Colors.white),
        ),
        const SizedBox(height: DriftSpacing.s3),
        Center(
          child: SizedBox(
            width: 240,
            child: DriftButton(label: l10n.swingStop, onPressed: onStop),
          ),
        ),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.icon, required this.color, required this.text});

  final IconData icon;
  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) {
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(text, style: type.label.copyWith(color: Colors.white)),
        ],
      ),
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
    return Container(
      constraints: const BoxConstraints(maxWidth: 420),
      padding: const EdgeInsets.all(DriftSpacing.s5),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(message, style: type.body, textAlign: TextAlign.center),
          const SizedBox(height: DriftSpacing.s4),
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
      ),
    );
  }
}
