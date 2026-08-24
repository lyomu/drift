import 'package:flutter/material.dart';

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

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      onChanged: onChanged,
      maxLines: obscureText ? 1 : maxLines,
      decoration: InputDecoration(
        labelText: label,
        hintText: hintText,
        errorText: errorText,
      ),
    );
  }
}
