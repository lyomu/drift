import 'package:flutter/material.dart';

/// Type scale for Drift Tennis. Mirrors `DESIGN_SPEC.md` §2.
///
/// DM Sans is the single app family — display, heading, body and UI. Outfit
/// was dropped in the 2026-09 header/shell redesign: headings there are heavy,
/// and DM Sans has no thin cut to carry the old `w100` display look.
///
/// Every style pins `letterSpacing: 0`. Without it the null field lets
/// Material's own text theme merge its default tracking back in (0.1-0.5 on
/// the body and label slots); Drift's scale is set at zero tracking.
class DriftTypography extends ThemeExtension<DriftTypography> {
  const DriftTypography({
    required this.display,
    required this.h1,
    required this.h2,
    required this.h3,
    required this.h4,
    required this.title,
    required this.subtitle,
    required this.bodyLarge,
    required this.body,
    required this.bodySmall,
    required this.label,
    required this.caption,
    required this.button,
    required this.statistics,
  });

  final TextStyle display;
  final TextStyle h1;
  final TextStyle h2;
  final TextStyle h3;
  final TextStyle h4;
  final TextStyle title;
  final TextStyle subtitle;
  final TextStyle bodyLarge;
  final TextStyle body;
  final TextStyle bodySmall;
  final TextStyle label;
  final TextStyle caption;
  final TextStyle button;
  final TextStyle statistics;

  static const _displayFamily = 'DMSans';
  static const _bodyFamily = 'DMSans';

  factory DriftTypography.from(Color textPrimary, Color textSecondary) {
    return DriftTypography(
      display: TextStyle(
        fontFamily: _displayFamily,
        fontSize: 34,
        height: 40 / 34,
        fontWeight: FontWeight.w700,
        letterSpacing: 0,
        color: textPrimary,
      ),
      h1: TextStyle(
        fontFamily: _displayFamily,
        fontSize: 28,
        height: 34 / 28,
        fontWeight: FontWeight.w700,
        letterSpacing: 0,
        color: textPrimary,
      ),
      h2: TextStyle(
        fontFamily: _displayFamily,
        fontSize: 24,
        height: 30 / 24,
        fontWeight: FontWeight.w700,
        letterSpacing: 0,
        color: textPrimary,
      ),
      h3: TextStyle(
        fontFamily: _displayFamily,
        fontSize: 20,
        height: 26 / 20,
        fontWeight: FontWeight.w700,
        letterSpacing: 0,
        color: textPrimary,
      ),
      h4: TextStyle(
        fontFamily: _displayFamily,
        fontSize: 18,
        height: 24 / 18,
        fontWeight: FontWeight.w700,
        letterSpacing: 0,
        color: textPrimary,
      ),
      title: TextStyle(
        fontFamily: _bodyFamily,
        fontSize: 16,
        height: 22 / 16,
        fontWeight: FontWeight.w600,
        letterSpacing: 0,
        color: textPrimary,
      ),
      subtitle: TextStyle(
        fontFamily: _bodyFamily,
        fontSize: 14,
        height: 20 / 14,
        fontWeight: FontWeight.w500,
        letterSpacing: 0,
        color: textSecondary,
      ),
      bodyLarge: TextStyle(
        fontFamily: _bodyFamily,
        fontSize: 16,
        height: 24 / 16,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        color: textPrimary,
      ),
      body: TextStyle(
        fontFamily: _bodyFamily,
        fontSize: 14,
        height: 20 / 14,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        color: textPrimary,
      ),
      bodySmall: TextStyle(
        fontFamily: _bodyFamily,
        fontSize: 13,
        height: 18 / 13,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        color: textSecondary,
      ),
      label: TextStyle(
        fontFamily: _bodyFamily,
        fontSize: 13,
        height: 16 / 13,
        fontWeight: FontWeight.w600,
        letterSpacing: 0,
        color: textPrimary,
      ),
      caption: TextStyle(
        fontFamily: _bodyFamily,
        fontSize: 12,
        height: 16 / 12,
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        color: textSecondary,
      ),
      button: TextStyle(
        fontFamily: _bodyFamily,
        fontSize: 15,
        height: 20 / 15,
        fontWeight: FontWeight.w600,
        letterSpacing: 0,
        color: textPrimary,
      ),
      statistics: TextStyle(
        fontFamily: _displayFamily,
        fontSize: 34,
        height: 1.1,
        fontWeight: FontWeight.w700,
        letterSpacing: 0,
        color: textPrimary,
        fontFeatures: const [FontFeature.tabularFigures()],
      ),
    );
  }

  @override
  DriftTypography copyWith({
    TextStyle? display,
    TextStyle? h1,
    TextStyle? h2,
    TextStyle? h3,
    TextStyle? h4,
    TextStyle? title,
    TextStyle? subtitle,
    TextStyle? bodyLarge,
    TextStyle? body,
    TextStyle? bodySmall,
    TextStyle? label,
    TextStyle? caption,
    TextStyle? button,
    TextStyle? statistics,
  }) {
    return DriftTypography(
      display: display ?? this.display,
      h1: h1 ?? this.h1,
      h2: h2 ?? this.h2,
      h3: h3 ?? this.h3,
      h4: h4 ?? this.h4,
      title: title ?? this.title,
      subtitle: subtitle ?? this.subtitle,
      bodyLarge: bodyLarge ?? this.bodyLarge,
      body: body ?? this.body,
      bodySmall: bodySmall ?? this.bodySmall,
      label: label ?? this.label,
      caption: caption ?? this.caption,
      button: button ?? this.button,
      statistics: statistics ?? this.statistics,
    );
  }

  @override
  DriftTypography lerp(ThemeExtension<DriftTypography>? other, double t) {
    if (other is! DriftTypography) return this;
    return TextStyle.lerp(display, other.display, t) == null
        ? this
        : DriftTypography(
            display: TextStyle.lerp(display, other.display, t)!,
            h1: TextStyle.lerp(h1, other.h1, t)!,
            h2: TextStyle.lerp(h2, other.h2, t)!,
            h3: TextStyle.lerp(h3, other.h3, t)!,
            h4: TextStyle.lerp(h4, other.h4, t)!,
            title: TextStyle.lerp(title, other.title, t)!,
            subtitle: TextStyle.lerp(subtitle, other.subtitle, t)!,
            bodyLarge: TextStyle.lerp(bodyLarge, other.bodyLarge, t)!,
            body: TextStyle.lerp(body, other.body, t)!,
            bodySmall: TextStyle.lerp(bodySmall, other.bodySmall, t)!,
            label: TextStyle.lerp(label, other.label, t)!,
            caption: TextStyle.lerp(caption, other.caption, t)!,
            button: TextStyle.lerp(button, other.button, t)!,
            statistics: TextStyle.lerp(statistics, other.statistics, t)!,
          );
  }
}
