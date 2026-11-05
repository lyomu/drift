/**
 * Languages the club console ships in — the same three as the mobile app and
 * the public site (`website/lib/locales.ts`).
 *
 * The choice is kept in a `drift-locale` cookie (read by the server layout so
 * the first paint is already in the right language) and mirrored to the
 * account via `PATCH /users/me/locale` so staff emails follow it. With no
 * cookie, the browser's Accept-Language decides: fr → French, es → Spanish,
 * anything else → English. Unlike the website there are no `/fr` URL
 * prefixes — the console isn't indexed, so one URL per page is enough.
 */
export const LOCALES = ["en", "fr", "es"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "drift-locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Each language named in itself, so someone in the wrong one can find theirs. */
export const LANGUAGES: { code: Locale; name: string; flag: string }[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" },
];

/**
 * First supported primary tag in an Accept-Language header, in preference
 * order: `fr-CA,en;q=0.8` → `fr`.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(",")) {
    const primary = part.split(";")[0].trim().split("-")[0].toLowerCase();
    if (isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}
