import 'package:flutter/material.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_typography.dart';

/// The redesign's in-app filled CTA: brand blue, 12px radius, full width
/// (`App.tsx` in-app button style). Distinct from [AuthPrimaryButton], which
/// is a fully-rounded pill for the auth screens.
class DriftPrimaryButton extends StatelessWidget {
  const DriftPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
    this.fontSize = 15,
    this.verticalPadding = 14,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final double fontSize;
  final double verticalPadding;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    final enabled = onPressed != null && !loading;

    return Material(
      color: enabled ? colors.primary : colors.primary.withValues(alpha: 0.5),
      borderRadius: BorderRadius.circular(12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: enabled ? onPressed : null,
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: verticalPadding),
          child: Center(
            child: loading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    label,
                    style: type.button.copyWith(
                      color: Colors.white,
                      fontSize: fontSize,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}

/// Centred text link ("Dispute", "Reschedule", "How did it feel?").
class DriftTextLink extends StatelessWidget {
  const DriftTextLink({super.key, required this.label, required this.onPressed});

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        foregroundColor: colors.primary,
        padding: const EdgeInsets.symmetric(vertical: 8),
        minimumSize: const Size.fromHeight(0),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: Text(
        label,
        style: type.subtitle.copyWith(
          color: colors.primary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
