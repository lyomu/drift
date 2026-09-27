# Analytics

Three tools, each independently switchable. **Every one of them is inert until
its key is supplied**, and an unconfigured build loads no third-party script and
makes no third-party request. That is deliberate: it keeps local development,
CI and any environment you have not deliberately instrumented clean, and it
keeps the website's Content Security Policy tight.

| Tool | Where | What it is for |
| --- | --- | --- |
| **PostHog** | website + mobile | Events, funnels, retention. The one that answers "did people get through the flow". |
| **Google Analytics 4** | website | Acquisition and campaign reporting. The one that answers "where did they come from". |
| **Microsoft Clarity** | mobile (primary) + website | Session replay and heatmaps. The one that answers "why did they give up on this screen". |

## Website

Read at **runtime**, per request, and served to the browser by
`website/app/api/analytics/route.ts`. The client component fetches that endpoint
on mount and initialises whichever tools came back configured
(`website/lib/analytics.ts` → `website/components/analytics.tsx`).

They are deliberately **not** `NEXT_PUBLIC_*`. That prefix is inlined at build
time, which binds a built image to one environment — the trap `club-admin` and
`platform-admin` are already in, documented at the top of
`website/app/api/waitlist/route.ts`.

**Plain env vars alone are not enough to avoid that trap here.** Every page on
this site is statically prerendered, so a server component reading
`process.env` is evaluated at *build* time and bakes the keys into the HTML just
as surely as `NEXT_PUBLIC_*` would. Forcing the layouts dynamic to dodge it
would cost the whole site its static rendering. A dynamic route handler keeps
both: static pages, runtime keys. You can verify the property holds:

```bash
# the built HTML must contain no key, whatever the environment
curl -s https://driftsports.app/ | grep -c 'G-\|phc_'   # expect 0
curl -s https://driftsports.app/api/analytics            # expect the keys
```

| Variable | Example | Required |
| --- | --- | --- |
| `POSTHOG_KEY` | `phc_…` | no |
| `POSTHOG_HOST` | `https://eu.i.posthog.com` | no, defaults to EU |
| `GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` | no |
| `CLARITY_PROJECT_ID` | `abcdefghij` | no |

Set them in `.env.production` on the box; `docker-compose.prod.yml` passes them
through to the `website` service.

### The CSP names the vendors unconditionally

`website/next.config.ts` lists all three vendors' origins whether or not a key
is set. That is deliberate. `headers()` is compiled into the build manifest, so
anything read from the environment there is fixed at build time — while the keys
are runtime. A policy derived from the keys would go stale the moment one was
added on the box: the scripts would load and then be silently blocked, which
looks exactly like a wrong key and is miserable to diagnose.

The trade is that the policy permits a little more than any given environment
uses, and in exchange it can never disagree with what is actually loading.

This is the thing that breaks first if you add a fourth tool, or self-host
PostHog on a custom domain: add its origins to `ANALYTICS_SCRIPT` /
`ANALYTICS_CONNECT` / `ANALYTICS_IMG` as well as its key, or it will load and be
blocked.

### Page views are sent manually

In the App Router a client-side navigation does not reload the document, so the
vendor snippets' own automatic page view fires once and never again. GA is
initialised with `send_page_view: false` and PostHog with
`capture_pageview: false`, and both are sent by the `PageViews` effect instead —
so the first view is not double-counted. Clarity is left on its own tracking; it
follows history changes itself.

## Mobile

Supplied with `--dart-define`, the same way `DRIFT_API_BASE_URL` and the social
sign-in ids are (`mobile/lib/core/network/dio_client.dart`,
`mobile/lib/core/analytics/analytics.dart`).

| Define | Example |
| --- | --- |
| `DRIFT_CLARITY_PROJECT_ID` | `abcdefghij` |
| `DRIFT_POSTHOG_KEY` | `phc_…` |
| `DRIFT_POSTHOG_HOST` | `https://eu.i.posthog.com` (default) |

```bash
flutter build apk --release \
  --dart-define=DRIFT_API_BASE_URL=https://api.driftsports.app \
  --dart-define=DRIFT_CLARITY_PROJECT_ID=xxxxxxxx \
  --dart-define=DRIFT_POSTHOG_KEY=phc_xxxxxxxx
```

For emulator runs, `mobile/tool/dev_run.sh` forwards any of the three that are
exported in your shell and omits the rest:

```bash
export DRIFT_CLARITY_PROJECT_ID=xxxxxxxx
bash tool/dev_run.sh
```

Clarity works by **wrapping the widget tree**, not by an init call, so it is
applied in `mobile/lib/main.dart` rather than in `initAnalytics()`. Without a
project id the wrapper is not introduced at all, and the app renders exactly the
tree it rendered before analytics existed.

Screen views come from `AnalyticsNavigatorObserver`, registered on the router in
`mobile/lib/core/router/app_router.dart`. Without it a whole session arrives as
one undifferentiated recording, because go_router pushes routes rather than
reloading a document.

Sign-in calls `identifyUser`, sign-out calls `resetAnalyticsIdentity` — the
latter matters on shared devices, where the next person would otherwise be
recorded as the previous one.

## Consent

**There is no consent gate. All three load immediately, including for visitors
in the EU**, where the site is served in French and Spanish. This was a
deliberate product decision, taken with the risk stated.

What exists instead is disclosure: the analytics section of
`website/app/(legal)/privacy-policy/page.tsx` names all three processors and
what each collects, and the "Third parties" section of the Data Privacy Notice
matches it.

If a consent gate is added later, `website/lib/analytics.ts` is where the
decision belongs — it is already the one place that decides whether a tool is
enabled, so gating it there covers the scripts and the CSP together.

## Adding a key to production

1. Add the variable to `/srv/drift/.env.production` on the box (file is `600`,
   `drift-deploy`-owned).
2. `docker compose -f docker-compose.prod.yml up -d website` — the website
   service reads it at boot.
3. Confirm the endpoint now reports it:
   ```bash
   curl -s https://driftsports.app/api/analytics
   ```
   No rebuild is needed, and the CSP does not need to change — it already names
   all three vendors.
4. For mobile, the key is baked into the build, so a new key means a new APK.
