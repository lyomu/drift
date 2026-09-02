import 'package:flutter/material.dart';

import 'drift_colors.dart';
import 'drift_spacing.dart';
import 'drift_typography.dart';

/// Builds Drift Tennis's light/dark [ThemeData] from the design tokens in
/// `foundation/05-design-system.md`. Screens should read tokens via
/// `Theme.of(context).extension<DriftColors>()` /
/// `Theme.of(context).extension<DriftTypography>()` rather than
/// hard-coding colours or text styles.
class AppTheme {
  const AppTheme._();

  static ThemeData light() => _build(DriftColors.light, Brightness.light);

  static ThemeData dark() => _build(DriftColors.dark, Brightness.dark);

  static ThemeData _build(DriftColors colors, Brightness brightness) {
    final typography = DriftTypography.from(
      colors.textPrimary,
      colors.textSecondary,
    );

    final colorScheme = ColorScheme(
      brightness: brightness,
      primary: colors.primary,
      onPrimary: Colors.white,
      secondary: colors.primaryDark,
      onSecondary: Colors.white,
      error: colors.error,
      onError: Colors.white,
      surface: colors.surface,
      onSurface: colors.textPrimary,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: colors.background,
      fontFamily: 'DMSans',
      textTheme: TextTheme(
        displayLarge: typography.display,
        headlineLarge: typography.h1,
        headlineMedium: typography.h2,
        headlineSmall: typography.h3,
        titleLarge: typography.h4,
        titleMedium: typography.title,
        titleSmall: typography.subtitle,
        bodyLarge: typography.bodyLarge,
        bodyMedium: typography.body,
        bodySmall: typography.bodySmall,
        labelLarge: typography.button,
        labelMedium: typography.label,
        labelSmall: typography.caption,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: colors.background,
        foregroundColor: colors.textPrimary,
        elevation: 0,
        titleTextStyle: typography.h4,
      ),
      cardTheme: CardThemeData(
        color: colors.surface,
        // Redesign card style (`DESIGN_SPEC.md` §1): white, r16, one soft
        // shadow, no border. Mirrors `DriftSoftCard`.
        elevation: 1,
        shadowColor: const Color(0x12000000),
        surfaceTintColor: Colors.transparent,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(DriftRadius.xl),
        ),
      ),
      dividerTheme: DividerThemeData(color: colors.border, thickness: 1),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colors.primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: colors.primary.withValues(alpha: 0.5),
          disabledForegroundColor: Colors.white,
          minimumSize: const Size.fromHeight(48),
          elevation: 0,
          textStyle: typography.button.copyWith(fontWeight: FontWeight.w700),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(DriftRadius.lg),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: DriftSpacing.s6,
            vertical: DriftSpacing.s4,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: DriftSpacing.s4,
          vertical: DriftSpacing.s3,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(DriftRadius.md),
          borderSide: BorderSide(color: colors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(DriftRadius.md),
          borderSide: BorderSide(color: colors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(DriftRadius.md),
          borderSide: BorderSide(color: colors.primary, width: 2),
        ),
      ),
      extensions: [colors, typography],
    );
  }
}
