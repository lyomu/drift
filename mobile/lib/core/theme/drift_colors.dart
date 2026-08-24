import 'package:flutter/material.dart';

/// Semantic colour tokens for Drift Tennis.
///
/// Mirrors `foundation/05-design-system.md` §2. Keep the token names
/// identical to the CSS custom properties used in the published design
/// docs (`color.primary`, `color.text.secondary`, ...) so the same
/// vocabulary works across Flutter and the Next.js admin apps once those
/// are built.
class DriftColors extends ThemeExtension<DriftColors> {
  const DriftColors({
    required this.primary,
    required this.primaryDark,
    required this.primaryLight,
    required this.background,
    required this.surface,
    required this.surfaceRaised,
    required this.textPrimary,
    required this.textSecondary,
    required this.border,
    required this.success,
    required this.successSurface,
    required this.warning,
    required this.warningSurface,
    required this.error,
    required this.errorSurface,
  });

  final Color primary;
  final Color primaryDark;
  final Color primaryLight;
  final Color background;
  final Color surface;
  final Color surfaceRaised;
  final Color textPrimary;
  final Color textSecondary;
  final Color border;
  final Color success;
  final Color successSurface;
  final Color warning;
  final Color warningSurface;
  final Color error;
  final Color errorSurface;

  static const light = DriftColors(
    primary: Color(0xFF1C91D0),
    primaryDark: Color(0xFF126A9B),
    primaryLight: Color(0xFFE8F5FC),
    background: Color(0xFFF7FAFC),
    surface: Color(0xFFFFFFFF),
    surfaceRaised: Color(0xFFFFFFFF),
    textPrimary: Color(0xFF111827),
    textSecondary: Color(0xFF6B7280),
    border: Color(0xFFE5E7EB),
    success: Color(0xFF16A34A),
    successSurface: Color(0xFFEAFBF1),
    warning: Color(0xFFF59E0B),
    warningSurface: Color(0xFFFEF6E7),
    error: Color(0xFFDC2626),
    errorSurface: Color(0xFFFDECEC),
  );

  static const dark = DriftColors(
    primary: Color(0xFF4FB3E8),
    primaryDark: Color(0xFF7CC9EF),
    primaryLight: Color(0xFF16324A),
    background: Color(0xFF0A121F),
    surface: Color(0xFF111B2C),
    surfaceRaised: Color(0xFF162236),
    textPrimary: Color(0xFFEEF2F7),
    textSecondary: Color(0xFF93A2B7),
    border: Color(0xFF24324A),
    success: Color(0xFF34D399),
    successSurface: Color(0xFF10291F),
    warning: Color(0xFFFBBF24),
    warningSurface: Color(0xFF2E2408),
    error: Color(0xFFF87171),
    errorSurface: Color(0xFF341415),
  );

  @override
  DriftColors copyWith({
    Color? primary,
    Color? primaryDark,
    Color? primaryLight,
    Color? background,
    Color? surface,
    Color? surfaceRaised,
    Color? textPrimary,
    Color? textSecondary,
    Color? border,
    Color? success,
    Color? successSurface,
    Color? warning,
    Color? warningSurface,
    Color? error,
    Color? errorSurface,
  }) {
    return DriftColors(
      primary: primary ?? this.primary,
      primaryDark: primaryDark ?? this.primaryDark,
      primaryLight: primaryLight ?? this.primaryLight,
      background: background ?? this.background,
      surface: surface ?? this.surface,
      surfaceRaised: surfaceRaised ?? this.surfaceRaised,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      border: border ?? this.border,
      success: success ?? this.success,
      successSurface: successSurface ?? this.successSurface,
      warning: warning ?? this.warning,
      warningSurface: warningSurface ?? this.warningSurface,
      error: error ?? this.error,
      errorSurface: errorSurface ?? this.errorSurface,
    );
  }

  @override
  DriftColors lerp(ThemeExtension<DriftColors>? other, double t) {
    if (other is! DriftColors) return this;
    return DriftColors(
      primary: Color.lerp(primary, other.primary, t)!,
      primaryDark: Color.lerp(primaryDark, other.primaryDark, t)!,
      primaryLight: Color.lerp(primaryLight, other.primaryLight, t)!,
      background: Color.lerp(background, other.background, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      surfaceRaised: Color.lerp(surfaceRaised, other.surfaceRaised, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      border: Color.lerp(border, other.border, t)!,
      success: Color.lerp(success, other.success, t)!,
      successSurface: Color.lerp(successSurface, other.successSurface, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      warningSurface: Color.lerp(warningSurface, other.warningSurface, t)!,
      error: Color.lerp(error, other.error, t)!,
      errorSurface: Color.lerp(errorSurface, other.errorSurface, t)!,
    );
  }
}
