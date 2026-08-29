import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_typography.dart';

/// The five pill tones from `DESIGN_SPEC.md` §4.
enum DriftPillTone { info, success, warning, error, neutral }

/// Small rounded label — no icon (that's [DriftStatusBadge]). 12px / w600,
/// 3×10 padding, fully rounded.
class DriftPill extends StatelessWidget {
  const DriftPill({super.key, required this.label, this.tone = DriftPillTone.info});

  final String label;
  final DriftPillTone tone;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    final (bg, fg) = switch (tone) {
      DriftPillTone.info => (colors.primaryLight, colors.primary),
      DriftPillTone.success => (colors.successSurface, colors.success),
      DriftPillTone.warning => (colors.warningSurface, colors.warning),
      DriftPillTone.error => (colors.errorSurface, colors.error),
      DriftPillTone.neutral => (
        colors.textSecondary.withValues(alpha: 0.12),
        colors.textSecondary,
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: type.caption.copyWith(color: fg, fontWeight: FontWeight.w600),
      ),
    );
  }
}
