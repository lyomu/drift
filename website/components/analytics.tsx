"use client";

/**
 * Loads PostHog, GA4 and Microsoft Clarity, and reports page views on client
 * navigation.
 *
 * WHY THE CONFIG IS FETCHED: every page here is statically prerendered, so a
 * server component reading `process.env` would be evaluated at build time and
 * bake the keys into the HTML. `/api/analytics` is dynamic and reads them per
 * request instead, which keeps the pages static AND the keys runtime. See that
 * route for the full reasoning.
 *
 * WHY PAGE VIEWS ARE MANUAL: in the App Router a client-side navigation does
 * not reload the document, so the vendor snippets' own automatic page view
 * fires only once, on first paint. Everything after that has to be sent by
 * hand or the whole session collapses into a single view of the landing page.
 * GA is initialised with `send_page_view: false` and PostHog with
 * `capture_pageview: false`, so the first view is sent by the same effect that
 * sends the rest and is never double-counted.
 *
 * Clarity is left on its own automatic tracking: it is a session recorder
 * rather than an event pipeline, and it follows history changes itself.
 *
 * Each tool is skipped when its key is absent, so an unconfigured environment
 * loads no third-party script and makes no third-party request.
 */

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Suspense, useEffect, useRef, useState } from "react";

import type { AnalyticsConfig } from "@/lib/analytics";

declare global {
  interface Window {
    // GA4's queue, defined by the gtag snippet. Typed loosely because its
    // signature is variadic and untyped upstream.
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Fetches the runtime config once. Null until it arrives, or if it fails. */
function useAnalyticsConfig(): AnalyticsConfig | null {
  const [config, setConfig] = useState<AnalyticsConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/analytics")
      .then((response) => (response.ok ? response.json() : null))
      .then((value: AnalyticsConfig | null) => {
        if (!cancelled && value) setConfig(value);
      })
      // Analytics must never surface as an error to the person using the site.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}

/**
 * PostHog is loaded through its npm package rather than the inline snippet: the
 * snippet assigns to `window.posthog`, which strict mode's double effect
 * invocation makes awkward to guard, and the package gives a typed `capture`.
 * Imported inside the effect so the chunk is only fetched when it is used.
 */
function usePostHog(config: AnalyticsConfig | null) {
  const started = useRef(false);

  useEffect(() => {
    if (!config?.posthogKey || started.current) return;
    started.current = true;

    void import("posthog-js").then(({ default: posthog }) => {
      posthog.init(config.posthogKey as string, {
        api_host: config.posthogHost,
        // Sent by `PageViews`, which also covers client navigation.
        capture_pageview: false,
        capture_pageleave: true,
        defaults: "2025-05-24",
      });
    });
  }, [config]);
}

/**
 * Sends one page view per URL, to PostHog and GA4.
 *
 * The URL is compared against the last one sent because `usePathname` and
 * `useSearchParams` can settle in separate renders, which would otherwise
 * report the same page twice.
 */
function PageViews({ config }: { config: AnalyticsConfig | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!config) return;

    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    if (lastSent.current === url) return;
    lastSent.current = url;

    if (config.posthogKey) {
      void import("posthog-js").then(({ default: posthog }) => {
        posthog.capture("$pageview", { $current_url: window.location.href });
      });
    }

    if (config.gaMeasurementId && window.gtag) {
      window.gtag("event", "page_view", {
        page_path: url,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [pathname, searchParams, config]);

  return null;
}

export function Analytics() {
  const config = useAnalyticsConfig();
  usePostHog(config);

  return (
    <>
      {config?.gaMeasurementId ? (
        <>
          <Script
            id="ga-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${config.gaMeasurementId}`}
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${config.gaMeasurementId}',{send_page_view:false});`}
          </Script>
        </>
      ) : null}

      {config?.clarityProjectId ? (
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${config.clarityProjectId}");`}
        </Script>
      ) : null}

      <Suspense fallback={null}>
        <PageViews config={config} />
      </Suspense>
    </>
  );
}
