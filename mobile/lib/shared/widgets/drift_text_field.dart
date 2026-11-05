import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/drift_spacing.dart';

/// Thin wrapper over [TextField] so call sites use one consistent
/// label/hint/error pattern rather than repeating [InputDecoration]
/// boilerplate. Visual styling comes from [InputDecorationTheme] in
/// `app_theme.dart`. See `foundation/05-design-system.md` §6.
class DriftTextField extends StatelessWidget {
  const DriftTextField({
    super.key,
    required this.label,
    this.controller,
    this.hintText,
    this.errorText,
    this.obscureText = false,
    this.keyboardType,
    this.onChanged,
    this.maxLines = 1,
    this.maxLength,
    this.inputFormatters,
    this.labelStyle,
  });

  final String label;
  final TextEditingController? controller;
  final String? hintText;
  final String? errorText;
  final bool obscureText;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onChanged;

  /// Overrides the label's text style. Used sparingly — e.g. to
  /// de-emphasise secondary fields (confirm password) so they read quieter
  /// than the primary field above them.
  final TextStyle? labelStyle;

  /// Multi-line inputs (free-text notes, reasons). Must stay 1 when
  /// [obscureText] is set — Flutter disallows obscured multi-line fields.
  final int maxLines;
  final int? maxLength;
  final List<TextInputFormatter>? inputFormatters;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final field = TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      onChanged: onChanged,
      maxLines: obscureText ? 1 : maxLines,
      maxLength: maxLength,
      inputFormatters: inputFormatters,
      decoration: InputDecoration(hintText: hintText, errorText: errorText),
    );

    if (label.isEmpty) return field;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: labelStyle ?? theme.textTheme.labelMedium),
        const SizedBox(height: DriftSpacing.s1),
        field,
      ],
    );
  }
}
