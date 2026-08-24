import 'package:flutter/material.dart';

import '../../../core/theme/drift_colors.dart';
import '../../../core/theme/drift_spacing.dart';
import '../../../core/theme/drift_typography.dart';

/// Button variants from `foundation/05-design-system.md` §6-7.
enum DriftButtonVariant {
  /// Filled, brand-blue background — the default action button, used on
  /// light/neutral surfaces. Backed by [ElevatedButtonTheme] from
  /// `app_theme.dart`.
  primary,

  /// Fully-rounded, white-on-primary — for CTAs sitting on top of a
  /// [DriftHeroScaffold] (the AO-onboarding-inspired "pill" pattern).
  /// Never used on a light/neutral surface — there's not enough contrast.
  pill,

  /// Text-only, no fill or border — secondary actions ("Sign In", "Skip").
  text,
}

class DriftButton extends StatelessWidget {
  const DriftButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = DriftButtonVariant.primary,
    this.foregroundColor,
    this.backgroundColor,
  });

  final String label;
  final VoidCallback? onPressed;
  final DriftButtonVariant variant;

  /// Overrides the text colour — for the [DriftButtonVariant.text] variant
  /// sitting on a dark/solid-colour background (e.g. "Sign In" on
  /// [DriftHeroScaffold]), where the themed default wouldn't have enough
  /// contrast.
  final Color? foregroundColor;

  /// [DriftButtonVariant.primary] only — for a destructive primary action
  /// (Delete Account) where text-only wouldn't be prominent enough.
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    switch (variant) {
      case DriftButtonVariant.primary:
        return ElevatedButton(
          onPressed: onPressed,
          style: backgroundColor == null
              ? null
              : ElevatedButton.styleFrom(backgroundColor: backgroundColor),
          child: Text(label),
        );

      case DriftButtonVariant.pill:
        final type = Theme.of(context).extension<DriftTypography>()!;
        final colors = Theme.of(context).extension<DriftColors>()!;
        return SizedBox(
          height: 52,
          child: ElevatedButton(
            onPressed: onPressed,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: colors.primaryDark,
              elevation: 0,
              shape: const StadiumBorder(),
              textStyle: type.button,
            ),
            child: Text(label),
          ),
        );

      case DriftButtonVariant.text:
        return TextButton(
          onPressed: onPressed,
          style: TextButton.styleFrom(
            foregroundColor: foregroundColor,
            padding: const EdgeInsets.symmetric(
              horizontal: DriftSpacing.s2,
              vertical: DriftSpacing.s2,
            ),
          ),
          child: Text(label),
        );
    }
  }
}
