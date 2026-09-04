import 'package:flutter/material.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_spacing.dart';
import '../../../../core/theme/drift_typography.dart';
import '../../../../shared/widgets/drift_text_field.dart';
import 'auth_form_widgets.dart';

/// Which input chrome to wear. The two callers sit in different design
/// languages — the auth screens use hint-only [AuthInputField] with a leading
/// icon, onboarding uses the labelled [DriftTextField] — and the number should
/// look native to whichever it is in.
enum PhoneFieldVariant { auth, form }

/// Phone number plus "this number is on WhatsApp", as one unit.
///
/// Both sign-up paths need the identical pair: the email signup screen, and
/// Basic Profile for social sign-ups, which never pass through signup at all.
///
/// The number is optional everywhere and stored unverified (there is no SMS
/// provider), so nothing here validates beyond shape. The backend wants
/// E.164, which is what the hint asks for.
class PhoneField extends StatelessWidget {
  const PhoneField({
    super.key,
    required this.controller,
    required this.onWhatsApp,
    required this.onWhatsAppChanged,
    this.variant = PhoneFieldVariant.form,
  });

  final TextEditingController controller;
  final bool onWhatsApp;
  final ValueChanged<bool> onWhatsAppChanged;
  final PhoneFieldVariant variant;

  static const _hint = '+254 700 000000';

  @override
  Widget build(BuildContext context) {
    // The checkbox is meaningless without a number, so it stays inert until
    // one is typed. Listening to the controller here rather than lifting the
    // text into the parent keeps both callers free of that bookkeeping.
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: controller,
      builder: (context, value, _) {
        final hasNumber = value.text.trim().isNotEmpty;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            switch (variant) {
              PhoneFieldVariant.auth => AuthInputField(
                controller: controller,
                hintText: 'Phone number (optional)',
                icon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
              ),
              PhoneFieldVariant.form => DriftTextField(
                label: 'Phone number (optional)',
                controller: controller,
                hintText: _hint,
                keyboardType: TextInputType.phone,
              ),
            },
            _WhatsAppCheckbox(
              value: onWhatsApp && hasNumber,
              enabled: hasNumber,
              onChanged: onWhatsAppChanged,
            ),
          ],
        );
      },
    );
  }
}

/// Mirrors [AgePolicyAcceptance] — same 24px box, same caption treatment —
/// with a disabled state that one doesn't need.
class _WhatsAppCheckbox extends StatelessWidget {
  const _WhatsAppCheckbox({
    required this.value,
    required this.enabled,
    required this.onChanged,
  });

  final bool value;
  final bool enabled;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final type = Theme.of(context).extension<DriftTypography>()!;

    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: enabled ? () => onChanged(!value) : null,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: DriftSpacing.s1),
        child: Row(
          children: [
            SizedBox(
              width: 24,
              height: 24,
              child: Checkbox(
                value: value,
                activeColor: colors.primary,
                onChanged: enabled
                    ? (checked) => onChanged(checked ?? false)
                    : null,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'This number is on WhatsApp',
                style: type.caption.copyWith(
                  color: enabled
                      ? colors.textSecondary
                      : colors.textSecondary.withValues(alpha: 0.5),
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
