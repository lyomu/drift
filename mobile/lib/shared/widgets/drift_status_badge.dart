import 'package:flutter/material.dart';

import '../../core/theme/drift_colors.dart';
import '../../core/theme/drift_typography.dart';

/// Semantic status tones. Mirrors `color.status.*` in
/// `foundation/05-design-system.md` §2.
enum DriftStatusTone { success, warning, error, info, neutral }

/// Status badge — always icon + label, never colour alone (accessibility
/// rule in `foundation/05-design-system.md` §9). Used for match states
/// (Scheduled/Disputed/...), competition states, verification badges.
class DriftStatusBadge extends StatelessWidget {
  const DriftStatusBadge({
    super.key,
    required this.label,
    required this.tone,
    this.icon,
  });

  final String label;
  final DriftStatusTone tone;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    final (Color fg, Color bg, IconData defaultIcon) = switch (tone) {
      DriftStatusTone.success => (
        colors.success,
        colors.successSurface,
        Icons.check_circle_outline,
      ),
      DriftStatusTone.warning => (
        colors.warning,
        colors.warningSurface,
        Icons.error_outline,
      ),
      DriftStatusTone.error => (
        colors.error,
        colors.errorSurface,
        Icons.warning_amber_outlined,
      ),
      DriftStatusTone.info => (
        colors.primaryDark,
        colors.primaryLight,
        Icons.info_outline,
      ),
      DriftStatusTone.neutral => (
        colors.textSecondary,
        colors.border.withValues(alpha: 0.4),
        Icons.circle_outlined,
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon ?? defaultIcon, size: 14, color: fg),
          const SizedBox(width: 5),
          Text(
            label,
            style: type.caption.copyWith(
              color: fg,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
