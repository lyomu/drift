import { NextResponse, type NextRequest } from "next/server";

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
 * Legal routes (`/terms`, `/privacy-policy`, `/data-privacy`), the API and
 * static assets are excluded from the matcher: the legal documents are
 * authoritative in English only, so they exist at exactly one URL.
 *
 * English is never shown at `/en/...`: that path redirects to the unprefixed
 * form, and unprefixed English pages are served by a rewrite, so every locale
 * has exactly one canonical URL (search engines see three, not six).
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

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
    // Everything except the API, Next internals, images and the (English-only)
    // legal documents.
    "/((?!api|_next|images|favicon.ico|terms|privacy-policy|data-privacy).*)",
  ],
};
