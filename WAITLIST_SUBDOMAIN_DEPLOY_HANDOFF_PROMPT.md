# Handoff: ship the waitlist subdomain, the clubs/coaches CTA and analytics

The code is written, reviewed-ready and **merges cleanly**. Nothing is
deployed. What is left is a box-side sequence (nginx + TLS + a container
redeploy) plus supplying analytics keys.

The plan behind this work is at
`C:\Users\gmnyo\.claude\plans\i-want-us-to-melodic-patterson.md` — read it for
the rationale (why `/request-club` and not `/signup`, why the waitlist stays in
the same container, why analytics keys cannot be plain env vars read in a
layout). This doc is the "what is true right now" complement.

**Branch:** `feat/website-cta-waitlist-analytics`, commit `cb83e29`
**PR:** #17 → `master`, state `MERGEABLE` as of 2026-09-28
**Rebased** onto `master` at `a01190d` (the SEO pass), so the earlier duplicate
conflicts are gone.

---

## 1. Read this before you touch nginx

**The deploy comment at the top of `deploy/nginx/driftsports.app.conf` will take
the production site down if you follow it literally.** It says to deploy with
"every `listen 443` block removed/commented out". That instruction was written
for the original greenfield bootstrap, when nothing was serving yet. The site is
now live on five names with those 443 blocks doing the serving.

For this change you comment out **only the new `waitlist` 443 block**, and leave
the other four alone. Everything else in that header (the certbot invocation,
the `chown`, the sites-available convention) is still correct.

I did not rewrite that header, because the greenfield path is still the right
instruction for a from-scratch rebuild. Treat it as "first install" and this doc
as "incremental change".

## 2. Verified live state, 2026-09-28

Checked from outside the box, read-only:

- **DNS is done** (the product owner added it). `waitlist.driftsports.app` →
  `46.225.106.43` on both `8.8.8.8` and `1.1.1.1`, matching the apex.
- **The cert does not cover it.** Live SANs on the apex are `driftsports.app`,
  `www.`, `admin.`, `console.`, `api.` — five names, `notAfter=Dec 15 19:53:05
  2026 GMT`. No `waitlist.`.
- **`waitlist.driftsports.app` currently serves the wrong product.** No deployed
  vhost matches the name, so it falls through to the shared box's default
  server:
  - port 80 → stock `Welcome to nginx!` (nginx/1.24.0 Ubuntu)
  - port 443 → **harusi.ke's** vhost, so a visitor gets a certificate error
    naming `harusi.ke` (`CN=harusi.ke`, SANs `harusi.ke`, `app.harusi.ke`,
    `api.harusi.ke`, `console.harusi.ke`, `storage.harusi.ke`, `www.harusi.ke`)

  This is cosmetic, not a breach — it is what a wildcard-less shared box does
  with an unmatched name. But the name is publicly resolving to a neighbouring
  product's certificate right now, so there is mild time pressure.

The box is shared with **RetailFlow and harusi-ke**. A bad `nginx -t` or reload
affects them, not just Drift. Gate every reload on `nginx -t`.

## 3. The deploy sequence

Order matters. Steps 2 and 3 are what make the ACME challenge reachable; step 4
is what makes the subdomain serve the right thing the moment you enable it.

**1 — Merge PR #17.**

**2 — Install the new nginx conf with only the waitlist 443 block commented out.**
The port-80 `server_name` in the new file already includes
`waitlist.driftsports.app`; that is the line that makes the webroot challenge
resolvable. Without it, certbot's challenge for the new name hits the default
server and fails.

```bash
cp deploy/nginx/driftsports.app.conf /etc/nginx/sites-available/driftsports.app
# comment out ONLY the `server { ... server_name waitlist.driftsports.app; ... }`
# 443 block. Leave the apex, www, admin, console and api 443 blocks serving.
nginx -t && systemctl reload nginx
```

**3 — Expand the certificate to six names.**

```bash
certbot certonly --webroot -w /var/www/certbot \
  --cert-name driftsports.app --expand \
  -d driftsports.app -d www.driftsports.app -d admin.driftsports.app \
  -d console.driftsports.app -d api.driftsports.app \
  -d waitlist.driftsports.app
```

`--cert-name driftsports.app` is not optional cosmetics. Without it certbot can
create a **new lineage** at `/etc/letsencrypt/live/driftsports.app-0001/`, while
every `ssl_certificate` line in the conf points at
`/etc/letsencrypt/live/driftsports.app/`. You would get a successful-looking
issuance and nginx would keep serving the old five-name cert. `--expand` stops
it prompting about the changed domain set.

Confirm the lineage actually moved before going on:

```bash
certbot certificates --cert-name driftsports.app     # expect 6 domains
openssl x509 -noout -ext subjectAltName \
  -in /etc/letsencrypt/live/driftsports.app/fullchain.pem
```

Also confirm the renew hook survived the expansion — a renewed cert landing on
disk while nginx serves the old one is the exact bug tracker 0.1 fixed:

```bash
grep renew_hook /etc/letsencrypt/renewal/driftsports.app.conf
```

**4 — Redeploy the website container.** The new image carries the `Host`-based
routing in `website/proxy.ts`. If you enable the vhost while the old image is
running, `waitlist.driftsports.app` will serve the **landing page** at `/`
instead of the waitlist — not broken, but wrong, and it will look like the
nginx change failed.

`docker-compose.prod.yml` already declares the new env on the `website` service:
`WAITLIST_HOST=waitlist.driftsports.app` plus the four analytics vars. All are
runtime, so no rebuild is needed to change a key later.

**5 — Uncomment the waitlist 443 block, `nginx -t`, reload.**

## 4. Analytics keys

Everything is wired and **inert until keys are supplied**. Nothing breaks
without them; no third-party script loads at all. Full detail in
`docs/ANALYTICS.md`.

Website — add to `/srv/drift/.env.production`, then
`docker compose -f docker-compose.prod.yml up -d website`:

| Variable | Notes |
| --- | --- |
| `POSTHOG_KEY` | `phc_…` |
| `POSTHOG_HOST` | defaults to `https://eu.i.posthog.com` |
| `GA_MEASUREMENT_ID` | `G-…` |
| `CLARITY_PROJECT_ID` | |

Mobile keys are `--dart-define` and therefore **baked into the build** — a new
key means a new APK. `DRIFT_CLARITY_PROJECT_ID`, `DRIFT_POSTHOG_KEY`,
`DRIFT_POSTHOG_HOST`. `mobile/tool/dev_run.sh` forwards whichever of the three
are exported in your shell and omits the rest.

## 5. Gotchas that will cost you an hour each

**Do not convert the analytics keys to `NEXT_PUBLIC_*` or read them in a
layout.** Every website page is statically prerendered, so a server component
reading `process.env` is evaluated at *build* time and bakes the key into the
HTML — the same trap `club-admin` and `platform-admin` are in, documented at the
top of `website/app/api/waitlist/route.ts`. That is why the keys come from a
`force-dynamic` route (`website/app/api/analytics/route.ts`) that the client
fetches on mount. The invariant to protect:

```bash
curl -s https://driftsports.app/ | grep -c 'G-\|phc_'   # must be 0
curl -s https://driftsports.app/api/analytics           # must show the keys
```

**The CSP names the three vendors unconditionally, on purpose.** `headers()` in
`next.config.ts` is compiled into the build manifest, so a policy derived from
the keys would be fixed at build time while the keys are runtime — add a key on
the box and the scripts would load and then be silently blocked. If you add a
fourth tool, or self-host PostHog on a custom domain, add its origins to
`ANALYTICS_SCRIPT` / `ANALYTICS_CONNECT` / `ANALYTICS_IMG` as well as its key.

**The legal pages are reachable on both hosts.** They are excluded from the
proxy matcher, so `waitlist.driftsports.app/terms` serves rather than redirects.
Each sets a self-referencing apex canonical, so crawlers consolidate. This is
deliberate — pulling them into the matcher would mean giving them a locale
passthrough they do not otherwise need, to stop them being rewritten to an
`/en/terms` route that does not exist.

**nginx noindex, after the rebase.** `master`'s SEO pass added
`X-Robots-Tag: noindex, nofollow` to admin/console/api; my branch came from a
lineage that added HSTS and removed club-admin's basic auth but never had those
headers. The conflict resolution kept **both**. Current intended state:

| Host | noindex | basic auth |
| --- | --- | --- |
| apex, www, **waitlist** | no (public, indexable) | no |
| admin | yes | no (open testing) |
| console | yes | yes |
| api | yes | no |

If you see that table drift, something re-resolved the conflict wrongly.

**There is no coach path.** The header says "Clubs & coaches" and both links go
to Club Admin, because no coach console and no coach signup exist —
`club-admin/app/signup` is only a redirect to `/request-club`, and
`backend/src/coaches/` is a player-facing directory. If a real coach flow is
ever built, `CLUB_SIGN_UP_URL` in `website/lib/site.ts` is the single place to
split them.

**No consent banner.** Analytics load immediately, including for the fr/es
locales. That was an explicit product decision taken with the GDPR exposure
stated. Disclosure lives in the Privacy Policy's "Analytics and cookies" section
and the Data Privacy Notice's "Third parties" section. If a gate is ever added,
`website/lib/analytics.ts` is the one place that decides whether a tool is
enabled, so gating there covers the scripts and the CSP together.

## 6. Riding along in this commit

The working tree held prior uncommitted work that shared files with this change
and could not be split out, so PR #17 also contains:

- the **mobile package rename** to `app.driftsports.drift` (`MainActivity.kt`
  moved, `build.gradle.kts`, a second Android client in `google-services.json`)
- Montserrat font files and redesigned auth/onboarding screens
- assorted doc edits and `SUPPORT_TICKET_RICH_TEXT_HANDOFF_PROMPT.md`

**The package rename is the highest-risk item in the PR and I did not verify
it.** It was already in the tree. Before release, check anything keyed to the
old `com.drift.tennis.drift_tennis`: the Play Console listing, Firebase client
entries, signing config, and any OAuth client restricted by package name +
SHA-1. A rename that reaches Play as a new package cannot be undone.

## 7. Verification once deployed

```bash
# subdomain serves the waitlist, on its own cert
curl -sI https://waitlist.driftsports.app/ | head -1
openssl s_client -connect waitlist.driftsports.app:443 \
  -servername waitlist.driftsports.app </dev/null 2>/dev/null \
  | openssl x509 -noout -ext subjectAltName          # must list waitlist.

# apex path redirects to it, locale preserved
curl -sI https://driftsports.app/waitlist    | grep -i location   # -> waitlist origin /
curl -sI https://driftsports.app/fr/waitlist | grep -i location   # -> .../fr

# stray paths on the subdomain go home
curl -sI https://waitlist.driftsports.app/pricing | grep -i location

# canonical is on the waitlist origin; share image stays on the apex
curl -s https://waitlist.driftsports.app/ | grep -E 'canonical|og:image'

# sitemap spans both hosts, no trailing-slash mismatch against the canonical
curl -s https://driftsports.app/sitemap.xml | grep -o '<loc>[^<]*</loc>'

# the console CTA is live
curl -s https://driftsports.app/ | grep -o 'admin.driftsports.app[^"]*' | sort -u

# neighbours still fine — the box is shared
curl -sI https://harusi.ke/ | head -1
```

Local re-verification, if you change the website: from `website/`,
`npx tsc --noEmit`, `npx eslint .`, `npm run build`. Note `next start` warns
under `output: standalone`; it still serves well enough to curl. Mobile:
`flutter pub get && flutter analyze`.

All of the above passed locally on `cb83e29` before the push, including the
no-keys case emitting zero third-party script.

## 8. Working conventions in this repo

- **Port 3000 is taken** by another of the owner's projects. Run the backend on
  `3009`; I used 3013–3021 for throwaway website servers.
- **Build then test**, in one pass at the end — do not interleave test runs with
  implementation, and when asked to "just write code", write code only.
- **Do not spawn exploration subagents**; read and grep directly.
- **Get a written plan approved** before multi-file edits.
- **Update `PROGRESS.md` at every phase boundary**, not just at session end. The
  row for this work is already there, dated 2026-09-27, marked verified locally
  and not deployed. Update it when this actually ships.
- Never `npm run build` in `backend/` while the `start:dev` watcher is running.
- `npm run lint` in `backend/` is `eslint --fix` and rewrites ~24 unrelated
  files; there are pre-existing lint/tsc errors there.
