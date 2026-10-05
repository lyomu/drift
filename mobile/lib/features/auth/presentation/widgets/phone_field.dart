import 'package:country_picker/country_picker.dart';
import 'package:country_flags/country_flags.dart' as country_flags;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/drift_colors.dart';
import '../../../../core/theme/drift_spacing.dart';
import '../../../../core/theme/drift_typography.dart';

/// Which input chrome to wear. The auth and onboarding forms have deliberately
/// different density, but country selection must work identically in both.
enum PhoneFieldVariant { auth, form }

/// A universal telephone field. [controller] always contains either an empty
/// string or a canonical E.164 number; the person only sees and edits their
/// local digits beside the selected flag and calling code.
class PhoneField extends StatefulWidget {
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

  @override
  State<PhoneField> createState() => _PhoneFieldState();
}

class _PhoneFieldState extends State<PhoneField> {
  static final _countries = CountryService().getAll();
  late final TextEditingController _localController;
  late Country _country;

  @override
  void initState() {
    super.initState();
    final initial = _split(widget.controller.text);
    _country = initial.$1;
    _localController = TextEditingController(text: initial.$2);
    _localController.addListener(_writeE164);
    // A legacy local number is only rewritten in memory. It reaches the
    // server in canonical form when the enclosing form is next saved.
    if (widget.controller.text.trim().isNotEmpty &&
        !widget.controller.text.trim().startsWith('+')) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _writeE164());
    }
  }

  /// Select the longest calling-code prefix. This correctly handles countries
  /// sharing `+1` and keeps an existing E.164 number editable without asking
  /// someone to select their country again.
  (Country, String) _split(String raw) {
    final digits = raw.replaceAll(RegExp(r'[^0-9]'), '');
    if (raw.trim().startsWith('+')) {
      final matches =
          _countries
              .where((country) => digits.startsWith(country.phoneCode))
              .toList()
            ..sort((a, b) => b.phoneCode.length.compareTo(a.phoneCode.length));
      if (matches.isNotEmpty) {
        final country = matches.first;
        return (country, digits.substring(country.phoneCode.length));
      }
    }
    final locale = WidgetsBinding.instance.platformDispatcher.locale;
    final country = _countries.firstWhere(
      (item) =>
          item.countryCode.toLowerCase() == locale.countryCode?.toLowerCase(),
      orElse: () => _countries.firstWhere(
        (item) => item.countryCode == 'KE',
        orElse: () => _countries.first,
      ),
    );
    return (country, digits);
  }

  void _writeE164() {
    final local = _localController.text.replaceAll(RegExp(r'[^0-9]'), '');
    final value = local.isEmpty ? '' : '+${_country.phoneCode}$local';
    if (widget.controller.text != value) widget.controller.text = value;
  }

  void _selectCountry() {
    showCountryPicker(
      context: context,
      showPhoneCode: true,
      showSearch: true,
      searchAutofocus: true,
      customFlagBuilder: (country) => _CircularFlag(country: country),
      countryListTheme: CountryListThemeData(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        inputDecoration: const InputDecoration(
          labelText: 'Search countries',
          prefixIcon: Icon(Icons.search),
        ),
      ),
      onSelect: (country) {
        setState(() => _country = country);
        _writeE164();
      },
    );
  }

  @override
  void dispose() {
    _localController
      ..removeListener(_writeE164)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final auth = widget.variant == PhoneFieldVariant.auth;
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: _localController,
      builder: (context, value, _) {
        final hasNumber = value.text.trim().isNotEmpty;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _localController,
              keyboardType: TextInputType.phone,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                labelText: auth ? null : 'Phone number (optional)',
                hintText: _country.example.isEmpty
                    ? 'Phone number'
                    : _country.example,
                prefixIconConstraints: const BoxConstraints(minWidth: 0),
                prefixIcon: Semantics(
                  button: true,
                  label:
                      'Select country, currently ${_country.name}, plus ${_country.phoneCode}',
                  child: TextButton(
                    onPressed: _selectCountry,
                    style: TextButton.styleFrom(
                      foregroundColor: colors.textPrimary,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      minimumSize: const Size(76, 48),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _CircularFlag(country: _country, size: 20),
                        const SizedBox(width: 6),
                        Text('+${_country.phoneCode}'),
                        const Icon(Icons.keyboard_arrow_down, size: 18),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            _WhatsAppCheckbox(
              value: widget.onWhatsApp && hasNumber,
              enabled: hasNumber,
              onChanged: widget.onWhatsAppChanged,
            ),
          ],
        );
      },
    );
  }
}

/// Emoji flags are naturally rectangular; clipping them into a small circle
/// gives the selector the compact avatar-like marker used throughout Drift.
class _CircularFlag extends StatelessWidget {
  const _CircularFlag({required this.country, this.size = 24});

  final Country country;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: country_flags.CountryFlag.fromCountryCode(
        country.countryCode,
        theme: country_flags.ImageTheme(
          width: size,
          height: size,
          shape: const country_flags.Circle(),
        ),
      ),
    );
  }
}

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
