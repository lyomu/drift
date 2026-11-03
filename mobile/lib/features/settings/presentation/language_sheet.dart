import 'package:country_flags/country_flags.dart' as country_flags;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/drift_colors.dart';
import '../application/locale_provider.dart';

const _font = 'Outfit';

/// Settings → Language. A bottom sheet listing each language in its own name
/// with its flag; the active one is tinted and ticked. Picking applies at
/// once (the whole app rebuilds in the new language) and closes the sheet.
Future<void> showLanguageSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: Theme.of(context).extension<DriftColors>()!.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => const _LanguageSheet(),
  );
}

class _LanguageSheet extends ConsumerWidget {
  const _LanguageSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final active = Localizations.localeOf(context).languageCode;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  context.l10n.settingsLanguage,
                  style: TextStyle(
                    fontFamily: _font,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: colors.textPrimary,
                  ),
                ),
              ),
              IconButton.filledTonal(
                tooltip: context.l10n.commonClose,
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Symbols.close),
              ),
            ],
          ),
          const SizedBox(height: 16),
          for (final language in AppLanguage.all) ...[
            _LanguageOption(
              language: language,
              selected: language.code == active,
              onTap: () {
                ref.read(localeProvider.notifier).select(Locale(language.code));
                Navigator.of(context).pop();
              },
            ),
            const SizedBox(height: 10),
          ],
        ],
      ),
    );
  }
}

class _LanguageOption extends StatelessWidget {
  const _LanguageOption({
    required this.language,
    required this.selected,
    required this.onTap,
  });

  final AppLanguage language;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).extension<DriftColors>()!;
    final fill = selected
        ? Color.alphaBlend(
            colors.primary.withValues(alpha: 0.22),
            colors.surface,
          )
        : colors.surfaceRaised;

    return Material(
      color: fill,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
          child: Row(
            children: [
              country_flags.CountryFlag.fromCountryCode(
                language.countryCode,
                theme: const country_flags.ImageTheme(
                  width: 32,
                  height: 22,
                  shape: country_flags.RoundedRectangle(2),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  language.nativeName,
                  style: TextStyle(
                    fontFamily: _font,
                    fontSize: 17,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    color: colors.textPrimary,
                  ),
                ),
              ),
              if (selected)
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: colors.textPrimary,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Symbols.check, size: 18, color: colors.surface),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
