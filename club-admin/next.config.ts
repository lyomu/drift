import type { NextConfig } from "next";

/**
 * The API origin has to be reachable from the browser, so it must be named in
 * `connect-src` explicitly; a bare 'self' policy would block every request
 * this app makes.
 */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3009";

/**
 * Baseline security headers.
 *
 * There is no known XSS vector today (no `dangerouslySetInnerHTML` anywhere
 * in either console), but the access token lives in `localStorage` rather
 * than an httpOnly cookie, so any future script injection would hand over a
 * session. This is the defence-in-depth layer for that.
 *
 * `'unsafe-inline'` on styles is required by Tailwind's runtime style
 * injection; Next/React development tooling also requires `'unsafe-eval'`.
 * Production keeps eval blocked.
 */
const scriptSrc =
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      `connect-src 'self' ${API_ORIGIN}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  headers() {
    return Promise.resolve([{ source: "/:path*", headers: securityHeaders }]);
  },
};

export default nextConfig;
