import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/l10n/l10n.dart';
import '../../users/data/users_repository.dart';

const _localeKey = 'appearance.locale';

/// The language choice from Settings. `null` means "never chosen": the app
/// follows the device language (French and Spanish phones open in those,
/// everything else in English), which is what a fresh install shows. Once a
/// language is picked it is restored from local storage on every launch.
final localeProvider = NotifierProvider<LocaleController, Locale?>(
  LocaleController.new,
);

class LocaleController extends Notifier<Locale?> {
  /// Read once in `main()` before the first frame, so the app never flashes
  /// the device language before switching to the saved one, and the first
  /// `/users/me` sync already sees the saved choice.
  static Future<void> preload() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final code = prefs.getString(_localeKey);
      if (code != null) CurrentAppLocale.picked = resolveAppLocale(Locale(code));
    } catch (_) {
      // Storage unavailable: keep following the device.
    }
  }

  @override
  Locale? build() => CurrentAppLocale.pickedOrNull;

  Future<void> select(Locale locale) async {
    CurrentAppLocale.picked = locale;
    state = locale;
    // Push notifications and emails are written server-side, so the account
    // has to know too. Best-effort: signed out, or offline, the next
    // `currentUserProvider` load catches it up.
    ref
        .read(usersRepositoryProvider)
        .updateLocale(locale.languageCode)
        .catchError((_) {});
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_localeKey, locale.languageCode);
    } catch (_) {
      // The choice still applies for this session.
    }
  }
}
