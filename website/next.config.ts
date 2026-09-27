import type { NextConfig } from "next";

/**
 * The page's own resources are all first-party (fonts are self-hosted by
 * next/font). The only third parties are the three analytics tools, whose
 * origins are listed below.
 *
 * WHY THE ANALYTICS ORIGINS ARE UNCONDITIONAL, not gated on whether a key is
 * set: `headers()` is compiled into the build manifest, so anything read from
 * the environment here is fixed at BUILD time. The keys themselves are runtime
 * (`app/api/analytics/route.ts`), so a policy derived from them would go stale
 * the moment a key was added on the box — the scripts would load and then be
 * silently blocked, which looks exactly like a wrong key and is miserable to
 * diagnose. A fixed policy naming three vendor origins is the cheaper trade:
 * it allows a little more than a given environment uses, and it can never
 * disagree with what is actually loading.
 *
 * Adding a fourth tool, or self-hosting PostHog on a custom domain, means
 * adding its origins here as well as its key.
 */
const ANALYTICS_SCRIPT = [
  "https://www.googletagmanager.com", // GA4
  "https://www.clarity.ms", // Clarity
  "https://*.posthog.com", // PostHog, both regions and both asset hosts
];

const ANALYTICS_CONNECT = [
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://*.googletagmanager.com",
  "https://*.clarity.ms",
  "https://*.posthog.com",
];

const ANALYTICS_IMG = [
  "https://www.googletagmanager.com",
  "https://*.google-analytics.com",
  "https://*.clarity.ms",
];

function contentSecurityPolicy(): string {
  const script = ["'self'", "'unsafe-inline'", ...ANALYTICS_SCRIPT];
  if (process.env.NODE_ENV !== "production") script.push("'unsafe-eval'");

  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${ANALYTICS_IMG.join(" ")}`,
    "font-src 'self' data:",
    `connect-src 'self' ${ANALYTICS_CONNECT.join(" ")}`,
    // PostHog's session replay runs its recorder in a worker from a blob URL.
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
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
