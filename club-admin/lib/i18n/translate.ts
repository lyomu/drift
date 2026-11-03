import { en, type MessageKey } from "./messages/en";
import { es } from "./messages/es";
import { fr } from "./messages/fr";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";

const CATALOGS: Record<Locale, Record<MessageKey, string>> = { en, fr, es };

/**
 * Translation for code outside React (the API client's error messages). Reads
 * the language from `<html lang>`, which the root layout sets on the server and
 * `I18nProvider.setLocale` updates — components use `useT()` instead.
 */
export function translateNow(key: MessageKey): string {
  const lang = typeof document === "undefined" ? DEFAULT_LOCALE : document.documentElement.lang;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  return CATALOGS[locale][key] ?? en[key] ?? key;
}
