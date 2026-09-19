import type { Locale } from "./locales";
import { localeHref } from "./locales";

/**
 * Canonical origin. `www.` and plain HTTP redirect here at the edge (nginx),
 * so every absolute URL the site emits — canonicals, hreflang, sitemap,
 * Open Graph, JSON-LD — uses this host.
 */
export const SITE_URL = "https://driftsports.app";

export const SITE_NAME = "Drift Tennis";

export const CONTACT_EMAIL = "serve@driftsports.app";

/** `og:locale` values, one per supported locale. */
export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  fr: "fr_FR",
  es: "es_ES",
};

/** Absolute URL for a same-site path (always starting with `/`). */
export function absoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

/** Same-site path for a page in a locale: `/`, `/fr`, `/es/waitlist`, … */
export function localizedPath(locale: Locale, path: string): string {
  const full = localeHref(locale, path === "/" ? "" : path);
  return full === "" ? "/" : full;
}
