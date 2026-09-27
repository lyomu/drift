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

/**
 * Club Admin, the console clubs and coaches sign in to. A separate origin, not
 * a route on this site, so these are absolute URLs everywhere they are used.
 *
 * Sign-up points at `/request-club` rather than `/signup`: self-service signup
 * was replaced by the club-request -> approval -> magic-link setup flow, and
 * `/signup` now only redirects here (club-admin/app/signup/page.tsx). Linking
 * the redirect would cost a hop for nothing.
 *
 * Coaches share the club destination. There is no coach console and no coach
 * signup today, so the request form is the one honest way in for both.
 */
export const CLUB_ADMIN_URL = "https://admin.driftsports.app";
export const CLUB_SIGN_IN_URL = CLUB_ADMIN_URL;
export const CLUB_SIGN_UP_URL = `${CLUB_ADMIN_URL}/request-club`;

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

/**
 * The waitlist lives on its own origin.
 *
 * WHY: it is the site's one conversion page, and separating it means its
 * traffic, its share links and its search presence are not mixed in with the
 * landing page's. It is still the same Next.js app in the same container —
 * nginx sends `waitlist.driftsports.app` to the same upstream, and `proxy.ts`
 * maps that host's `/` onto the `[locale]/waitlist` route. Nothing moved in
 * the App Router; only the public URL changed.
 *
 * Consequences that are easy to miss, all handled in `lib/seo.ts`:
 *  - `metadataBase` is the apex, so the waitlist page's canonical, hreflang
 *    and `og:url` have to be absolute on THIS origin, not relative.
 *  - the share image still lives on the apex, so its URL has to be absolute
 *    there or it resolves against this origin and 404s.
 */
export const WAITLIST_URL = "https://waitlist.driftsports.app";

/**
 * The host `proxy.ts` treats as the waitlist origin. Overridable so a local or
 * staging run can exercise the same path without owning the real name.
 */
export const WAITLIST_HOST =
  process.env.WAITLIST_HOST?.trim() || "waitlist.driftsports.app";

/**
 * A page served at the root of `origin`, in a locale: the bare origin for
 * English, `origin/fr` and `origin/es` otherwise.
 *
 * English has no trailing slash, so the URL here is byte-identical to the one
 * Next emits as the canonical. A sitemap entry that differs from the canonical
 * by a slash is the kind of mismatch that makes a crawler pick one and report
 * the other as a duplicate.
 */
export function originRootUrl(origin: string, locale: Locale): string {
  return `${origin}${localeHref(locale, "")}`;
}

/** Absolute waitlist URL for a locale. */
export function waitlistUrl(locale: Locale): string {
  return originRootUrl(WAITLIST_URL, locale);
}

/**
 * Absolute apex URL for a localized path. Used by the header and footer when
 * they render on the waitlist origin, where a relative link would stay on the
 * wrong host.
 */
export function apexUrl(locale: Locale, path: string): string {
  return absoluteUrl(localizedPath(locale, path));
}
