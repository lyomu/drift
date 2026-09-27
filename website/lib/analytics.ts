/**
 * Analytics configuration — the one place that decides what "configured"
 * means.
 *
 * WHY THESE ARE NOT `NEXT_PUBLIC_*`: that prefix is inlined at build time,
 * which binds an image to one environment — the trap `club-admin` and
 * `platform-admin` are already in, documented at the top of
 * `app/api/waitlist/route.ts`. These are read on the server at request time
 * (in the two root layouts) and handed to the client component as props, so
 * the same image runs in staging and production with different keys.
 *
 * Every field is `null` when its variable is unset, and each integration is
 * skipped entirely in that case. An unconfigured build therefore ships no
 * third-party script at all — which is also what keeps the Content Security
 * Policy in `next.config.ts` tight, since it is built from these same
 * variables and must not widen for a tool that is not loading.
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

/** True when at least one tool is configured. */
export function anyAnalyticsEnabled(config: AnalyticsConfig): boolean {
  return Boolean(
    config.posthogKey || config.gaMeasurementId || config.clarityProjectId,
  );
}
