# Drift Tennis production deployment

Target: the shared box `46.225.106.43` (Hetzner, Nuremberg — also hosts
RetailFlow and harusi-ke prod). Primary domain: `driftsports.app`.

This replaces an earlier trial deployment on a now-deleted dedicated box
(`135.181.146.130` / `drift.einsbrand.com`). Nothing from that deployment
carries over — different host, different domain, different routing shape
(subdomains instead of path prefixes).

See `devops-infra/docs/SHARED_BOX_ADD_PRODUCT_RUNBOOK.md` for the general
shared-box onboarding process this deployment follows, and
`devops-infra/docs/SHARED_BOX_CAPACITY.md` for the memory budget this
product's `mem_limit`s were sized against.

## Public routes

| Route | Service | Port |
|---|---|---|
| `https://driftsports.app/` (and `www.`) | Website (landing page) | `127.0.0.1:3008` |
| `https://admin.driftsports.app/` | Club Admin | `127.0.0.1:3006` |
| `https://console.driftsports.app/` | Platform Admin | `127.0.0.1:3007` |
| `https://api.driftsports.app/` | NestJS API | `127.0.0.1:3005` |
| `https://api.driftsports.app/socket.io/` | Socket.IO gateway | `127.0.0.1:3005` |

`admin.` and `console.` are protected with HTTP basic auth at nginx — the
security review (`SECURITY_REVIEW.md`) is still a conditional NO-GO on a few
open items (Android key rotation, an endpoint-by-endpoint authz matrix), so
staff-facing surfaces keep this extra layer even though the product itself
is now public. The website and API are not basic-auth protected: the
website is public marketing content and the API serves the mobile app and
browser clients directly, neither of which can answer a credential prompt.

## Server-side isolation

Provisioned per `SHARED_BOX_ADD_PRODUCT_RUNBOOK.md` §4 — a `drift-deploy`
user confined to `/srv/drift`, unable to read or write RetailFlow's or
harusi-ke's files, with sudo limited to exactly `nginx -t` and
`nginx -s reload`. Run once, as root:

```bash
cd /srv/drift/prod
bash scripts/provision-server.sh
```

This creates `drift-deploy`, `/srv/drift/prod`, and the scoped sudoers
entry. It does **not** install Docker/nginx/certbot/UFW or create swap —
those are already provisioned box-wide for RetailFlow and harusi-ke, and
re-bootstrapping them here would touch a shared, live setup. Swap and the
Drift-specific Postgres backup cron are provisioned separately, once, by
root — see the runbook's §1.1/§1.4.

Verify isolation before trusting it:

```bash
sudo -u deploy ls /srv/drift            # must fail: Permission denied
sudo -u drift-deploy ls /srv/harusi-ke  # must fail: Permission denied
```

## Environment file

Create `/srv/drift/prod/.env.production` on the box (mode `600`):

```bash
POSTGRES_DB=drift_tennis
POSTGRES_USER=drift
POSTGRES_PASSWORD=<generate-a-strong-password>

PUBLIC_API_URL=https://api.driftsports.app

JWT_SECRET=<openssl rand -hex 32>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
PLATFORM_ADMIN_JWT_TTL=2h
PLATFORM_ADMIN_WEB_URL=https://console.driftsports.app
CLUB_ADMIN_URL=https://admin.driftsports.app
CORS_ALLOWED_ORIGINS=https://admin.driftsports.app,https://console.driftsports.app

NEWS_FEED_ALLOWED_HOSTS=feeds.bbci.co.uk,www.atptour.com

# Transactional email keeps sending from the already-verified einsbrand.com
# relay — driftsports.app publishes only a sender-less SPF/DMARC (see below),
# it does not send its own mail.
SMTP_HOST=mail.einsbrand.com
SMTP_PORT=465
SMTP_USER=drift@einsbrand.com
SMTP_PASS=
MAIL_FROM=Drift Tennis <drift@einsbrand.com>
```

`PUBLIC_API_URL` is baked into both consoles' Next.js builds and their CSP
headers at **build time**, not read at runtime — the image build stage
(local or Jenkins) needs it, not just this file. The website takes no build
args.

It does, however, make one server-side API call: the waitlist form posts to
`/api/waitlist`, a same-origin route that proxies to the API from inside the
website's own container (see `website/app/api/waitlist/route.ts`). That hop
reads `API_URL` — not `PUBLIC_API_URL` — at **runtime**, so it has to be set
in `docker-compose.prod.yml`'s `website` service, pointed at the API's
compose service name (`http://api:3009`), not at `PUBLIC_API_URL`'s public
hostname.

The same values also go into the `drift-prod-env-file` Jenkins credential
(see below) so a Jenkins-driven deploy and a manual one use identical
config.

## DNS records

All A records 600s TTL, all pointed at `46.225.106.43`. Verified 2026-09-16:
all five already resolve here — nothing left to add.

| Host | Type | Value |
|---|---|---|
| `driftsports.app` | A | `46.225.106.43` |
| `www.driftsports.app` | A | `46.225.106.43` |
| `admin.driftsports.app` | A | `46.225.106.43` |
| `console.driftsports.app` | A | `46.225.106.43` |
| `api.driftsports.app` | A | `46.225.106.43` |

**SPF/DMARC: deliberately left alone.** The domain already carries a real
SPF record (`v=spf1 a mx ip4:23.106.59.129 include:relay.mailbaby.net
ip6:... ~all`) — the same `relay.mailbaby.net` pattern `einsbrand.com`
uses — so mail may already be live on this domain through the registrar's
bundled hosting, even though `MAIL_FROM` for the app itself stays
`drift@einsbrand.com`. Owner decision 2026-09-16: don't touch the existing
SPF record, and don't add DMARC yet, until it's confirmed what (if
anything) is actually sending through that relay. Revisit once that's
known — an unconfirmed sender is exactly the situation `einsbrand.com`'s
own `p=none` staging period exists to protect against.

## Nginx and TLS

Bootstrap HTTP-only first, same two-phase pattern as every other vhost on
this box:

```bash
cp deploy/nginx/driftsports.app.conf /etc/nginx/sites-available/driftsports.app
# comment out every `listen 443` server block first — see the file's own header
ln -s /etc/nginx/sites-available/driftsports.app /etc/nginx/sites-enabled/driftsports.app
nginx -t
systemctl reload nginx
```

Issue one certificate covering all five names:

```bash
certbot certonly --webroot -w /var/www/certbot \
  -d driftsports.app -d www.driftsports.app -d admin.driftsports.app \
  -d console.driftsports.app -d api.driftsports.app
```

Restore the commented-out `443` blocks, then:

```bash
nginx -t
systemctl reload nginx
chown drift-deploy:drift-deploy /etc/nginx/sites-available/driftsports.app
```

Verify renewal (root's systemd certbot timer handles this; `drift-deploy`
has no certbot sudo grant, deliberately — see the runbook's note on
harusi-ke's TLS stage silently failing for a month):

```bash
certbot renew --dry-run --cert-name driftsports.app --no-random-sleep
```

## Basic auth

```bash
htpasswd -c /etc/nginx/.htpasswd-drift <username>
```

Store the password in the team's password manager, and put the same
username/password into the `drift-basic-auth` Jenkins credential (used by
the pipeline's smoke tests). Do not commit either.

## Deploying a published image

This box **only ever runs a pinned, published image** — never builds on the
box. Building here would compete for CPU/RAM with RetailFlow's and
harusi-ke's live traffic and add to this box's disk churn from image layers,
which is exactly what `SHARED_BOX_ADD_PRODUCT_RUNBOOK.md` §3 warns a shared
host is vulnerable to.

The Jenkins pipeline (`Jenkinsfile`) builds and pushes all four images to
GHCR on every push, then — on `master`, after manual approval — deploys via
SSH by running `scripts/deploy.sh` on the box. A manual break-glass deploy
uses the exact same script:

```bash
# on the box, as drift-deploy
cd /srv/drift/prod
export DRIFT_IMAGE_TAG=sha-0123456789ab   # from the Jenkins build or a GitHub Actions run summary
bash scripts/deploy.sh
```

The script fetches `master`, pulls the pinned images, runs
`prisma migrate deploy`, brings the stack up, and prints container status.
`DRIFT_IMAGE_TAG` is required — there is no `:local` fallback on this box.

**Rolling back** is re-running the same command with the previous `sha-`
tag. This does **not** undo a migration — `prisma migrate deploy` only rolls
forward, so a release that changes the schema needs its down-path thought
about before it ships, not after.

**The console images are environment-specific.** Both bake
`NEXT_PUBLIC_API_URL` into the bundle and the CSP `connect-src` at build
time, so a rollback to an older image tag also rolls back to whatever origin
that image was built against.

## Jenkins pipeline

`ci.einsbrand.com`, folder `einsbrand/drift`, multibranch, polling GitHub
(`lyomu/drift`) with the Multibranch Scan Webhook Trigger for near-instant
rescans. Stages: `Checkout → Build CI images → Lint → Typecheck (backend) →
Test → Docker Build & Push (GHCR) → Approval (master only) → Deploy Prod →
Smoke Tests`.

Job-scoped credentials (isolated from RetailFlow/harusi-ke):

| Credential ID | Type | Purpose |
|---|---|---|
| `drift-deploy-ssh-key` | SSH private key | `drift-deploy` on the shared box |
| `drift-ghcr-token` | Username/password | GitHub PAT (`write:packages`), pushes to `ghcr.io` |
| `drift-prod-env-file` | Secret file | `.env.production` content |
| `drift-basic-auth` | Username/password | Smoke-tests the two basic-auth-protected consoles |

Global env var (`Manage Jenkins → System`): `DRIFT_PROD_HOST =
46.225.106.43` — never hardcoded in the Jenkinsfile, matching the
convention the other two pipelines already use after harusi-ke's old
hardcoded-IP incident.

Smoke Tests is a **hard gate** — a failing curl fails the build. Verify any
change to this pipeline by reading a real build's console log directly, not
by trusting a green checkmark (`DEVOPS.md` records a stage on harusi-ke's
pipeline reporting SUCCESS while silently no-op'ing for a month).

## Smoke tests

```bash
curl -fsS http://127.0.0.1:3005/health
curl -fkI https://api.driftsports.app/health
curl -fkI https://driftsports.app/
curl -fkI -u <user>:<password> https://admin.driftsports.app/
curl -fkI -u <user>:<password> https://console.driftsports.app/
```

## Mobile app (APK rebuild)

The Flutter app is not server-deployed — it only needs its API base URL
pointed at the live deployment, baked in at build time. Only rebuild once
`https://api.driftsports.app/health` is actually reachable:

```bash
cd mobile
flutter build apk --release --split-per-abi \
  --dart-define=DRIFT_API_BASE_URL=https://api.driftsports.app \
  --dart-define=DRIFT_SUPPORT_EMAIL=drift@einsbrand.com
```

Outputs land in `mobile/build/app/outputs/flutter-apk/`
(`app-arm64-v8a-release.apk`, `app-armeabi-v7a-release.apk`). Verify with a
real install (`adb install <apk>`) rather than trusting the build output
alone. Signing config is unchanged from the existing release flow.

## Backups

`/root/backup-drift.sh` on the box, daily cron, mirrors the runbook's
minimum viable shape:

```bash
docker exec drift-postgres pg_dump -U drift drift_tennis | gzip \
  > /srv/backups/drift-db-$(date +%Y%m%d-%H%M%S).sql.gz
```

7-day local rotation. **Off-box copy and a drilled restore are not yet
done** — this is on-box-only today, which the runbook treats as incomplete;
a Storage Box (or equivalent) and a real restore drill are a near-term
follow-up, not part of this deployment.

## Deferred / not part of this deployment

- Observability agent (needs a private Prometheus/Loki path — see
  `devops-infra/docs/LOGGING.md` §4).
- Off-box backup copy and a full disaster-recovery restore drill.
- HSTS (add once the domain is confirmed permanent).
- Payment/push/social-login provider credentials — the app already degrades
  gracefully with all of them unset (`backend/.env.example`).
