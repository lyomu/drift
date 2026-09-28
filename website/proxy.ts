import { NextResponse, type NextRequest } from "next/server";

import { SITE_URL, WAITLIST_HOST } from "@/lib/site";

/**
 * Device-language routing for the public site.
 *
 * Locales: `en` renders at unprefixed paths (`/`, `/waitlist`) and is the
 * canonical default; `fr` and `es` render under a prefix. On a first visit
 * with no cookie, the device's Accept-Language header decides: fr → `/fr`,
 * es → `/es`, anything else → unprefixed English. The choice is pinned in a
 * `drift-locale` cookie so a return visit lands where the person left the
 * site, and the header switcher keeps the cookie in sync.
 *
 * Legal routes (`/terms`, `/privacy-policy`, `/data-privacy`), the API,
 * static assets and the crawler/icon files (`/robots.txt`, `/sitemap.xml`,
 * `/icon.png`, `/apple-icon.png`) are excluded from the matcher: the legal
 * documents are authoritative in English only, so they exist at exactly one
 * URL, and the crawler files must be served as-is, not locale-rewritten.
 *
 * English is never shown at `/en/...`: that path redirects to the unprefixed
 * form, and unprefixed English pages are served by a rewrite, so every locale
 * has exactly one canonical URL (search engines see three, not six).
 *
 * HOST SPLIT: the same app serves two origins. The apex is the landing site;
 * `waitlist.driftsports.app` serves only the waitlist page, at that origin's
 * root. Locale detection is identical on both — the waitlist host's `/` is
 * rewritten to `/{locale}/waitlist` rather than to `/{locale}`.
 *
 * Each page therefore has exactly one home: `/waitlist` on the apex permanently
 * redirects to the waitlist origin, and any non-waitlist path on the waitlist
 * origin redirects back to the apex. Without both halves the two hosts would
 * serve duplicate copies of the same pages and split their own search ranking.
 *
 * ONE EXCEPTION: the legal documents are excluded from the matcher (below), so
 * they are served rather than redirected on the waitlist host too. That is
 * harmless — each one sets a self-referencing canonical on the apex
 * (`englishOnlyMetadata`), so a crawler that reaches
 * `waitlist.driftsports.app/terms` is told the real URL. Bringing them into the
 * matcher would mean giving them a locale passthrough they do not otherwise
 * need, to avoid being rewritten to a `/en/terms` route that does not exist.
 */
const COOKIE = "drift-locale";
const ONE_YEAR = 60 * 60 * 24 * 365;

function detectLocale(request: NextRequest): "en" | "fr" | "es" {
  const cookie = request.cookies.get(COOKIE)?.value;
  if (cookie === "fr" || cookie === "es") return cookie;
  if (cookie === "en") return "en";

  // Accept-Language: ordered, weighted tags ("fr-CH, fr;q=0.9, en;q=0.8").
  // First strong match wins; unknown tags are skipped.
  const header = request.headers.get("accept-language") ?? "";
  const candidates = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      let q = 1;
      for (const param of params) {
        const match = param.trim().match(/^q=([\d.]+)$/);
        if (match) q = Number.parseFloat(match[1]);
      }
      return { base: tag.toLowerCase().split("-")[0], q };
    })
    .filter((candidate) => Number.isFinite(candidate.q) && candidate.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { base } of candidates) {
    if (base === "fr") return "fr";
    if (base === "es") return "es";
    if (base === "en") return "en";
  }
  return "en";
}

/** Strips a leading locale segment, returning the prefix and the remainder. */
function splitLocale(pathname: string): {
  prefix: "" | "/fr" | "/es";
  rest: string;
} {
  const first = pathname.split("/")[1];
  if (first === "fr" || first === "es") {
    return { prefix: `/${first}`, rest: pathname.slice(first.length + 1) };
  }
  return { prefix: "", rest: pathname };
}

/**
 * The waitlist origin: one page at the root, per locale. Anything else there
 * belongs to the landing site and is sent to the apex.
 */
function proxyWaitlistHost(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { prefix, rest } = splitLocale(pathname);

  // `/`, `/fr`, `/es` (with or without a trailing slash) are the waitlist page.
  if (rest === "" || rest === "/") {
    const locale = prefix === "" ? detectLocale(request) : prefix.slice(1);
    const response = NextResponse.rewrite(
      new URL(`/${locale}/waitlist`, request.url),
    );
    if (request.cookies.get(COOKIE)?.value !== locale) {
      response.cookies.set(COOKIE, locale, {
        path: "/",
        maxAge: ONE_YEAR,
        sameSite: "lax",
      });
    }
    return response;
  }

  // Everything else lives on the apex. `/api/*` never reaches here (the
  // matcher excludes it), so the waitlist form still posts same-origin to
  // `/api/waitlist` on this host and `form-action 'self'` continues to hold.
  return NextResponse.redirect(new URL(pathname, SITE_URL), 308);
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // `request.headers.get("host")` rather than `nextUrl.host`: behind nginx the
  // former is the name the browser asked for, which is what distinguishes the
  // two origins.
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  if (host === WAITLIST_HOST) return proxyWaitlistHost(request);

  // On the apex the waitlist has moved. Redirect rather than rewrite so the
  // address bar, canonical and any shared link all agree on one origin.
  const waitlistPath = splitLocale(pathname);
  if (
    waitlistPath.rest === "/waitlist" ||
    waitlistPath.rest === "/waitlist/"
  ) {
    const target = waitlistPath.prefix === "" ? "/" : waitlistPath.prefix;
    return NextResponse.redirect(
      new URL(target, `https://${WAITLIST_HOST}`),
      308,
    );
  }

  const first = pathname.split("/")[1];

  // An explicit prefixed visit: serve it and pin the cookie.
  if (first === "fr" || first === "es") {
    const response = NextResponse.next();
    if (request.cookies.get(COOKIE)?.value !== first) {
      response.cookies.set(COOKIE, first, {
        path: "/",
        maxAge: ONE_YEAR,
        sameSite: "lax",
      });
    }
    return response;
  }

  // English is canonical at the root: fold /en paths back onto it.
  if (first === "en") {
    const response = NextResponse.redirect(
      new URL(pathname.replace(/^\/en/, "") || "/", request.url),
    );
    response.cookies.set(COOKIE, "en", {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
    });
    return response;
  }

  const locale = detectLocale(request);
  const rest = pathname === "/" ? "" : pathname;

  if (locale === "en") {
    // Serve the English pages (which live under the [locale] segment) at the
    // unprefixed URL. A rewrite, not a redirect: the address stays `/`.
    return NextResponse.rewrite(new URL(`/en${rest}`, request.url));
  }

  const response = NextResponse.redirect(
    new URL(`/${locale}${rest}`, request.url),
  );
  response.cookies.set(COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
  return response;
}

export const config = {
  matcher: [
    // Everything except the API, Next internals, images, the crawler/icon
    // files and the (English-only) legal documents.
    "/((?!api|_next|images|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml|terms|privacy-policy|data-privacy).*)",
  ],
};
