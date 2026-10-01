import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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
  });

  final String label;
  final TextEditingController? controller;
  final String? hintText;
  final String? errorText;
  final bool obscureText;
  final TextInputType? keyboardType;
  final ValueChanged<String>? onChanged;

  /// Multi-line inputs (free-text notes, reasons). Must stay 1 when
  /// [obscureText] is set — Flutter disallows obscured multi-line fields.
  final int maxLines;
  final int? maxLength;
  final List<TextInputFormatter>? inputFormatters;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      onChanged: onChanged,
      maxLines: obscureText ? 1 : maxLines,
      maxLength: maxLength,
      inputFormatters: inputFormatters,
      decoration: InputDecoration(
        // An empty label means "no label" — used where the field sits under a
        // heading that already names it. Passing '' through would reserve the
        // floating-label row and render a blank line above the field.
        labelText: label.isEmpty ? null : label,
        hintText: hintText,
        errorText: errorText,
      ),
    );
  }
}
