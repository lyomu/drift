import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/widgets.dart';

import '../../l10n/app_localizations.dart';

export '../../l10n/app_localizations.dart';

/// The languages the app ships in, in the order the Language sheet lists
/// them. Strings live in `lib/l10n/app_<code>.arb`.
const supportedAppLocales = [Locale('en'), Locale('fr'), Locale('es')];

/// Display data for the Language row and sheet. Each language is named in
/// itself, so someone stuck in the wrong language can still find their own.
class AppLanguage {
  const AppLanguage(this.code, this.nativeName);

  final String code;
  final String nativeName;

  String get countryCode => switch (code) {
    'en' => 'GB',
    'fr' => 'FR',
    'es' => 'ES',
    _ => 'GB',
  };

  static const all = [
    AppLanguage('en', 'English'),
    AppLanguage('fr', 'Français'),
    AppLanguage('es', 'Español'),
  ];

  static AppLanguage of(Locale locale) => all.firstWhere(
    (language) => language.code == locale.languageCode,
    orElse: () => all.first,
  );
}

/// Maps any device locale onto a supported one: `fr_CA` → French,
/// `es_MX` → Spanish, anything else → English.
Locale resolveAppLocale(Locale? device) {
  for (final supported in supportedAppLocales) {
    if (supported.languageCode == device?.languageCode) return supported;
  }
  return supportedAppLocales.first;
}

/// Walks the device's preferred-language list in order, so a phone set to
/// German-then-French opens in French rather than falling straight to English.
Locale resolveFromDeviceList(List<Locale>? deviceLocales) {
  for (final device in deviceLocales ?? const <Locale>[]) {
    for (final supported in supportedAppLocales) {
      if (supported.languageCode == device.languageCode) return supported;
    }
  }
  return supportedAppLocales.first;
}

/// The language the app is showing right now, for code with no
/// `BuildContext` (API request bodies). Kept current by `LocaleController`:
/// the explicit Settings choice when there is one, otherwise the device's.
class CurrentAppLocale {
  CurrentAppLocale._();

  static Locale? _picked;

  static set picked(Locale? value) => _picked = value;

  /// The explicit Settings choice, or null while following the device.
  static Locale? get pickedOrNull => _picked;

  static Locale get value =>
      _picked ?? resolveFromDeviceList(PlatformDispatcher.instance.locales);

  static String get code => value.languageCode;
}

/// Strings for code with no `BuildContext` — repositories and error
/// messages, built at the moment they're thrown. Widgets use `context.l10n`
/// instead, so they rebuild when the language changes.
AppLocalizations get l10nNow => lookupAppLocalizations(CurrentAppLocale.value);

/// The active locale's tag for `intl` formatters in code with no context.
String get localeTagNow => CurrentAppLocale.value.toLanguageTag();

extension L10nContext on BuildContext {
  /// `context.l10n.someKey` — the generated strings for the active language.
  AppLocalizations get l10n => AppLocalizations.of(this);

  /// The active locale's tag (`en`, `fr`, `es`) for `intl` formatters.
  String get localeTag => Localizations.localeOf(this).toLanguageTag();
}
