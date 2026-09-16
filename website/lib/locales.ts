/**
 * Locales supported by the public site.
 *
 * `en` is the default and renders at unprefixed paths (`/`, `/waitlist`);
 * `fr` and `es` render under a prefix (`/fr`, `/es/waitlist`). `middleware.ts`
 * reads the device's Accept-Language header on first visit, redirects to the
 * matching prefix, and pins a `drift-locale` cookie so the choice sticks.
 */
export const LOCALES = ["en", "fr", "es"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * The URL prefix for a locale. English stays unprefixed so its URLs never
 * change; every other locale carries its code.
 */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

/** Prefix a same-site path (always starting with `/`) for a locale. */
export function localeHref(locale: Locale, path: string): string {
  return `${localePrefix(locale)}${path}`;
}
