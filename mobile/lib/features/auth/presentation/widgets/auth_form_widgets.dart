import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_typography.dart';

/// Filled brand-blue pill CTA for the redesigned auth screens
/// ("Continue with Email", "Login"). Glows softly by default.
class AuthPrimaryButton extends StatelessWidget {
  const AuthPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    // Fixed brand blue — this is a light-surface CTA and shouldn't shift in
    // dark mode the way colors.primary does.
    const blue = Color(0xFF1C91D0);
    final enabled = onPressed != null && !loading;

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        boxShadow: enabled
            ? const [
                BoxShadow(
                  color: Color(0x591C91D0), // blue @ 35%
                  blurRadius: 24,
                  offset: Offset(0, 8),
                ),
              ]
            : null,
      ),
      child: Material(
        color: enabled ? blue : blue.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(999),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: enabled ? onPressed : null,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: loading
                ? const Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (icon != null) ...[
                        Icon(icon, size: 20, color: Colors.white),
                        const SizedBox(width: 10),
                      ],
                      Text(
                        label,
                        style: const TextStyle(
                          fontFamily: 'DMSans',
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

/// Neutral "ghost" pill for third-party sign-in ("Continue with Google",
/// "Continue with Apple").
class AuthSocialButton extends StatelessWidget {
  const AuthSocialButton({
    super.key,
    required this.label,
    required this.icon,
    required this.onPressed,
    this.loading = false,
  });

  final String label;
  final Widget icon;

  /// Null disables the button — used while the other provider's sheet is
  /// open, so two sign-ins can't race each other.
  final VoidCallback? onPressed;

  /// Swaps the leading glyph for a spinner. The provider sheet takes a moment
  /// to appear, and without this the button looks unresponsive.
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !loading;
    return Opacity(
      opacity: enabled || loading ? 1 : 0.5,
      child: Material(
        color: const Color(0xFFF4F4F4),
        borderRadius: BorderRadius.circular(999),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: enabled ? onPressed : null,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: const Color(0xFFE8E8E8), width: 1.5),
            ),
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 20,
                  height: 20,
                  child: Center(
                    child: loading
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : icon,
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  label,
                  style: const TextStyle(
                    fontFamily: 'DMSans',
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1A1A1A),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Rounded, bordered single-line input with a leading icon and optional
/// trailing widget (e.g. the password reveal toggle).
class AuthInputField extends StatelessWidget {
  const AuthInputField({
    super.key,
    required this.controller,
    required this.hintText,
    required this.icon,
    this.obscureText = false,
    this.keyboardType,
    this.trailing,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final String hintText;
  final IconData icon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final Widget? trailing;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colors.border, width: 1.5),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: colors.textSecondary),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller,
              obscureText: obscureText,
              keyboardType: keyboardType,
              onSubmitted: onSubmitted,
              cursorColor: colors.primary,
              style: const TextStyle(
                fontFamily: 'DMSans',
                fontSize: 15,
                fontWeight: FontWeight.w400,
              ),
              decoration: InputDecoration(
                isDense: true,
                filled: false,
                contentPadding: const EdgeInsets.symmetric(vertical: 15),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                disabledBorder: InputBorder.none,
                errorBorder: InputBorder.none,
                focusedErrorBorder: InputBorder.none,
                hintText: hintText,
                hintStyle: TextStyle(
                  fontFamily: 'DMSans',
                  fontSize: 15,
                  color: colors.textSecondary,
                ),
              ),
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// "Already have an account? Log in" style prompt, centred, with a
/// bold tappable action word.
class AuthFooterPrompt extends StatelessWidget {
  const AuthFooterPrompt({
    super.key,
    required this.lead,
    required this.action,
    required this.onTap,
  });

  final String lead;
  final String action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(lead, style: type.body.copyWith(color: colors.textSecondary)),
        GestureDetector(
          onTap: onTap,
          child: Text(
            action,
            style: type.body.copyWith(
              color: colors.textPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}

class AgePolicyAcceptance extends StatelessWidget {
  const AgePolicyAcceptance({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => onChanged(!value),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 24,
              height: 24,
              child: Checkbox(
                value: value,
                activeColor: colors.primary,
                onChanged: (checked) => onChanged(checked ?? false),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'I confirm I am 18 or older and agree to the Terms & '
                'Privacy Policy.',
                style: type.caption.copyWith(
                  color: colors.textSecondary,
                  height: 1.35,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Google's four-colour "G", copied from the prototype's inline SVG.
class GoogleGlyph extends StatelessWidget {
  const GoogleGlyph({super.key, this.size = 18});

  final double size;

  static const _svg = '''
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
<path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.77h5.4a4.6 4.6 0 0 1-2 3.03v2.5h3.23c1.9-1.74 2.97-4.32 2.97-7.3z" fill="#4285F4"/>
<path d="M10 20c2.7 0 4.96-.9 6.62-2.47l-3.23-2.5c-.9.6-2.04.96-3.39.96-2.6 0-4.8-1.76-5.6-4.12H1.07v2.58A10 10 0 0 0 10 20z" fill="#34A853"/>
<path d="M4.4 11.87A5.96 5.96 0 0 1 4.08 10c0-.65.11-1.28.31-1.87V5.55H1.07A10 10 0 0 0 0 10c0 1.61.39 3.13 1.07 4.45l3.33-2.58z" fill="#FBBC05"/>
<path d="M10 3.96c1.47 0 2.79.5 3.83 1.5l2.86-2.86A9.96 9.96 0 0 0 10 0 10 10 0 0 0 1.07 5.55L4.4 8.13C5.2 5.72 7.4 3.96 10 3.96z" fill="#EA4335"/>
</svg>''';

  @override
  Widget build(BuildContext context) {
    return SvgPicture.string(_svg, width: size, height: size);
  }
}
