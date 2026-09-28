/**
 * Analytics configuration — the one place that decides what "configured"
 * means.
 *
 * WHY THESE ARE NOT `NEXT_PUBLIC_*`: that prefix is inlined at build time,
 * which binds an image to one environment — the trap `club-admin` and
 * `platform-admin` are already in, documented at the top of
 * `app/api/waitlist/route.ts`. Reading them in a layout would be no better:
 * every page here is statically prerendered, so a server component reading
 * `process.env` is evaluated at build time and bakes the keys into the HTML
 * just as surely. The only caller is therefore the `force-dynamic` handler in
 * `app/api/analytics/route.ts`, which `components/analytics.tsx` fetches on
 * mount — see that route for the full reasoning.
 *
 * Every field is `null` when its variable is unset, and each integration is
 * skipped entirely in that case, so an unconfigured build ships no third-party
 * script and makes no third-party request.
 *
 * The Content Security Policy in `next.config.ts` deliberately does NOT follow
 * suit: it names all three vendor origins unconditionally, because `headers()`
 * is fixed at build time while these keys are runtime, so a policy derived from
 * them would silently block a tool enabled later on the box.
 *
 * NOTE ON CONSENT: these load unconditionally, with no consent gate. That was
 * a deliberate product decision. The privacy policy discloses all three
 * processors; if a consent gate is ever added, this module is where the
 * decision belongs.
 */

export type AnalyticsConfig = {
  /** PostHog project API key (`phc_…`). Product analytics and funnels. */
  posthogKey: string | null;
  /** PostHog ingestion host. Regional: `eu.i.posthog.com` for EU projects. */
  posthogHost: string;
  /** GA4 measurement id (`G-…`). Acquisition and campaign reporting. */
  gaMeasurementId: string | null;
  /** Microsoft Clarity project id. Heatmaps and session replay. */
  clarityProjectId: string | null;
};

/** Trims and treats blank strings as absent — an empty env var is not a key. */
function read(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export const DEFAULT_POSTHOG_HOST = "https://eu.i.posthog.com";

/**
 * Server-only: reads the environment. Calling this from a client component
 * would silently return all-nulls, because `process.env` is not populated in
 * the browser for unprefixed names.
 */
export function analyticsConfig(): AnalyticsConfig {
  return {
    posthogKey: read("POSTHOG_KEY"),
    posthogHost: read("POSTHOG_HOST") ?? DEFAULT_POSTHOG_HOST,
    gaMeasurementId: read("GA_MEASUREMENT_ID"),
    clarityProjectId: read("CLARITY_PROJECT_ID"),
  };
}
