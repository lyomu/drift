import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';
import '../../../shared/widgets/buttons/drift_button.dart';
import '../../../shared/widgets/drift_filter_chip.dart';
import '../../../shared/widgets/drift_scaffold.dart';
import '../../profile/application/profile_providers.dart';
import '../application/clip_analysis_controller.dart';
import '../application/swing_check_providers.dart';
import '../domain/pose_frame.dart';
import '../domain/swing_metrics.dart';
import '../swing_check_config.dart';

/// Pick forehand or serve and the hitting hand, read the setup tips, start.
class SwingCheckSetupScreen extends ConsumerStatefulWidget {
  const SwingCheckSetupScreen({super.key});

  @override
  ConsumerState<SwingCheckSetupScreen> createState() =>
      _SwingCheckSetupScreenState();
}

class _SwingCheckSetupScreenState extends ConsumerState<SwingCheckSetupScreen> {
  SwingStroke _stroke = SwingStroke.forehand;
  HittingHand? _hand;
  bool _picking = false;

  /// Opens the gallery, then the clip progress screen. The clip is read on
  /// the phone and never uploaded.
  Future<void> _useClip(HittingHand hand) async {
    if (_picking) return;
    setState(() => _picking = true);
    String? path;
    try {
      path = await ref.read(swingClipPickerProvider)();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.l10n.swingClipUnreadable)),
        );
      }
    } finally {
      if (mounted) setState(() => _picking = false);
    }
    if (!mounted || path == null) return;
    context.push(
      '/swing-check/clip',
      extra: SwingClipRequest(
        setup: SwingCheckSetup(stroke: _stroke, hand: hand),
        path: path,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final colors = Theme.of(context).extension<DriftColors>()!;
    final profileHand = ref.watch(ownProfileProvider).valueOrNull?.dominantHand;
    final hand = _hand ?? HittingHand.fromProfile(profileHand);

    final tips = [l10n.swingTip1, l10n.swingTip2, l10n.swingTip3, l10n.swingTip4];

    return DriftScaffold(
      title: l10n.swingCheckTitle,
      trailing: IconButton(
        tooltip: l10n.swingHistory,
        icon: const Icon(Icons.history_rounded),
        onPressed: () => context.push('/swing-check/history'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          Text(l10n.swingSetupIntro, style: type.body.copyWith(color: colors.textSecondary)),
          const SizedBox(height: DriftSpacing.s6),
          Text(l10n.swingStrokeLabel, style: type.subtitle),
          const SizedBox(height: DriftSpacing.s3),
          Wrap(
            spacing: DriftSpacing.s3,
            children: [
              DriftFilterChip(
                label: l10n.swingStrokeForehand,
                selected: _stroke == SwingStroke.forehand,
                onTap: () => setState(() => _stroke = SwingStroke.forehand),
              ),
              DriftFilterChip(
                label: l10n.swingStrokeServe,
                selected: _stroke == SwingStroke.serve,
                onTap: () => setState(() => _stroke = SwingStroke.serve),
              ),
            ],
          ),
          const SizedBox(height: DriftSpacing.s2),
          Text(
            l10n.swingBackhandNote,
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
          const SizedBox(height: DriftSpacing.s6),
          Text(l10n.onbPlayingHand, style: type.subtitle),
          const SizedBox(height: DriftSpacing.s3),
          Wrap(
            spacing: DriftSpacing.s3,
            children: [
              DriftFilterChip(
                label: l10n.onbHandRight,
                selected: hand == HittingHand.right,
                onTap: () => setState(() => _hand = HittingHand.right),
              ),
              DriftFilterChip(
                label: l10n.onbHandLeft,
                selected: hand == HittingHand.left,
                onTap: () => setState(() => _hand = HittingHand.left),
              ),
            ],
          ),
          const SizedBox(height: DriftSpacing.s6),
          Text(l10n.swingTipsHeading, style: type.subtitle),
          const SizedBox(height: DriftSpacing.s3),
          for (final tip in tips)
            Padding(
              padding: const EdgeInsets.only(bottom: DriftSpacing.s2),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.check, size: 18, color: colors.primary),
                  const SizedBox(width: DriftSpacing.s2),
                  Expanded(
                    child: Text(tip, style: type.body.copyWith(color: colors.textSecondary)),
                  ),
                ],
              ),
            ),
          const SizedBox(height: DriftSpacing.s4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.lock_outline, size: 18, color: colors.textSecondary),
              const SizedBox(width: DriftSpacing.s2),
              Expanded(
                child: Text(
                  l10n.swingPrivacyNote,
                  style: type.bodySmall.copyWith(color: colors.textSecondary),
                ),
              ),
            ],
          ),
          const SizedBox(height: DriftSpacing.s6),
          DriftButton(
            label: l10n.swingStart,
            onPressed: () => context.push(
              '/swing-check/capture',
              extra: SwingCheckSetup(stroke: _stroke, hand: hand),
            ),
          ),
          const SizedBox(height: DriftSpacing.s2),
          DriftButton(
            label: l10n.swingUseClip,
            variant: DriftButtonVariant.text,
            onPressed: _picking ? null : () => _useClip(hand),
          ),
          Text(
            l10n.swingClipHint(kMaxClipDuration.inSeconds),
            textAlign: TextAlign.center,
            style: type.bodySmall.copyWith(color: colors.textSecondary),
          ),
        ],
      ),
    );
  }
}
