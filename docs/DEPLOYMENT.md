# Drift Tennis staging deployment

Target server: `135.181.146.130` · primary name: `drift.einsbrand.com` (since 2026-09-02)

The deployment is reachable under its real domain with a normal 90-day Let's Encrypt
certificate. The original bare-IP vhost is kept as `default_server` alongside it so
preview APKs compiled with the old IP URL keep working until the next mobile rebuild
— the IP certificate still renews on its own timer.

## Public routes

| Route | Service |
|---|---|
| `https://drift.einsbrand.com/` | Club Admin |
| `https://drift.einsbrand.com/platform` | Platform Admin |
| `https://drift.einsbrand.com/api/` | NestJS API |
| `https://drift.einsbrand.com/socket.io/` | Socket.IO gateway |
| `https://135.181.146.130/…` | same services, IP vhost (legacy fallback) |

Both admin surfaces are protected with HTTP basic auth at Nginx. The API and
Socket.IO routes are not basic-auth protected so browser/mobile clients can call
them normally. Plain HTTP 80 redirects to HTTPS on both vhosts.

## Server setup

Initial root provisioning:

```bash
cd /srv/drift/app
bash scripts/provision-server.sh
```

The provisioner creates:

- a 4 GB swapfile;
- Docker CE with the Compose plugin;
- Nginx, Certbot, UFW, unattended upgrades, and `apache2-utils`;
- `/srv/drift`, owned by `drift-deploy`;
- a narrow sudoers file allowing `drift-deploy` to run only `nginx -t` and
  `nginx -s reload`;
- UFW rules for only `22`, `80`, and `443`.

## Environment file

Create `/srv/drift/app/.env.production` on the server. Keep it server-local and
mode `600`.

```bash
POSTGRES_DB=drift_tennis
POSTGRES_USER=drift
POSTGRES_PASSWORD=<generate-a-strong-password>

PUBLIC_API_URL=https://135.181.146.130/api

JWT_SECRET=<openssl rand -hex 32>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
PLATFORM_ADMIN_JWT_TTL=2h
PLATFORM_ADMIN_WEB_URL=https://135.181.146.130/platform
CLUB_ADMIN_URL=https://135.181.146.130
CORS_ALLOWED_ORIGINS=https://135.181.146.130

NEWS_FEED_ALLOWED_HOSTS=feeds.bbci.co.uk,www.atptour.com

# Transactional email (see "Email / SMTP" below). Leave SMTP_HOST unset to keep
# the pre-mailer behaviour (dev console codes / PENDING_PROVIDER in production).
SMTP_HOST=mail.einsbrand.com
SMTP_PORT=465
SMTP_USER=drift@einsbrand.com
SMTP_PASS=
MAIL_FROM=Drift Tennis <drift@einsbrand.com>
```

`PUBLIC_API_URL` is baked into both Next.js builds and their CSP headers, so it
must be correct before `docker compose build` runs.

**Domain migration note (2026-09-02):** the box's `.env.production` still carries
the `135.181.146.130` URLs above. nginx now terminates both the domain and the IP
vhost, so nothing is broken, but the next full rebuild should move these four URL
variables to `drift.einsbrand.com` (and add it to `CORS_ALLOWED_ORIGINS`) so
CSPs, links, and email-bound URLs use the real identity.

## DNS records for email deliverability

These live in the `einsbrand.com` zone, not in this repo. They are recorded here
because a record that exists only in someone's memory is a record that gets lost.

**SPF — already published, no action.** Verified 2026-09-02 and again 2026-09-03:

```
einsbrand.com  TXT  "v=spf1 +a +mx +ip4:84.16.229.230 include:relay.mailbaby.net +ip4:178.162.196.44 +ip4:167.235.180.68 +ip4:207.180.237.29 ~all"
```

`MAIL_FROM` sends as `drift@einsbrand.com`, so the From domain is the org domain
the SPF record covers and relaxed alignment holds. No separate SPF record is
needed for `drift.einsbrand.com` — nothing sends as a subdomain address.

**DMARC — publish this.** As of 2026-09-03 `_dmarc.einsbrand.com` does not
resolve, so no DMARC policy is in force at all:

| Field | Value |
|---|---|
| Type | `TXT` |
| Host / name | `_dmarc` (FQDN `_dmarc.einsbrand.com`) |
| TTL | `3600` |
| Value | `v=DMARC1; p=none; rua=mailto:drift@einsbrand.com` |

`p=none` is deliberate for the first pass. DMARC passes when SPF **or** DKIM
aligns; SPF alignment looks correct but DKIM signing on `mail.einsbrand.com` is
unconfirmed, and publishing an enforcing policy against an unverified setup sends
signup-verification and password-reset mail to spam with no error anywhere. `none`
puts the record in place and starts the reports; tighten once the reports prove
alignment. One DMARC record on the org domain also covers subdomains, so
`drift.einsbrand.com` needs nothing of its own.

Verify after publishing (allow for the TTL):

```bash
nslookup -type=TXT _dmarc.einsbrand.com 8.8.8.8
```

Then, after ~2 weeks of aggregate reports showing SPF/DKIM aligned on every
legitimate source, raise the policy — `p=quarantine`, and later `p=reject`.

**DKIM — check, then act.** Whether `mail.einsbrand.com` signs outbound is a
mail-server question, not a repo one. To find out, open any mail Drift sent and
read its headers: a `DKIM-Signature:` line names the selector in `s=`. If it is
there, publish the matching `<selector>._domainkey.einsbrand.com` record the mail
server generated. If there is no such header, the server is not signing and DMARC
rests on SPF alone — survivable, but it means forwarded mail (which breaks SPF)
will fail DMARC once the policy is enforcing.

## Nginx and IP certificate

Bootstrap HTTP-only first:

```bash
cp deploy/nginx/drift-ip-http.conf /etc/nginx/conf.d/drift-ip.conf
nginx -t
systemctl reload nginx
```

Issue a Let's Encrypt IP certificate. Certbot must be new enough to support
`--ip-address` and `--preferred-profile shortlived`.

```bash
certbot certonly \
  --preferred-profile shortlived \
  --webroot \
  --webroot-path /var/www/certbot \
  --ip-address 135.181.146.130
```

Then install the HTTPS vhost:

```bash
cp deploy/nginx/drift-ip-https.conf /etc/nginx/conf.d/drift-ip.conf
chown drift-deploy:drift-deploy /etc/nginx/conf.d/drift-ip.conf
nginx -t
systemctl reload nginx
```

IP certificates are short-lived, so verify renewal and add a deploy hook that
reloads Nginx:

```bash
certbot renew --dry-run --no-random-sleep
certbot reconfigure --cert-name 135.181.146.130 \
  --deploy-hook "systemctl reload nginx"
```

Since 2026-09-02 the primary certificate is a normal 90-day one for
`drift.einsbrand.com` (`certbot certonly --nginx -d drift.einsbrand.com`), with
the same `renew_hook = systemctl reload nginx` in its renewal config — verify
with `certbot renew --dry-run --cert-name drift.einsbrand.com --no-random-sleep`.
The short-lived IP cert remains for the fallback vhost.

## Basic auth

Create `/etc/nginx/.htpasswd-drift`:

```bash
htpasswd -c /etc/nginx/.htpasswd-drift drift-preview
```

Store the password in the team's password manager. Do not commit it.

## Staging test accounts

The deploy only runs `prisma migrate deploy`, so test accounts must be
bootstrapped separately. `scripts/staging/` (mirrored to
`/srv/drift/app/scripts/` on the box) holds two idempotent helpers run inside
the API container:

```bash
# create/update both accounts
docker exec -i drift-api node - < /srv/drift/app/scripts/bootstrap-accounts.mjs

# Club Admin — logs in directly
#   https://135.181.146.130/  →  owner@drift.test / Password123!

# Platform Admin — login always issues a 2FA challenge. The code is delivered by
# email in production (delivery: "EMAIL"); SMTP_PASS must be set in
# .env.production or the challenge reports 'PENDING_PROVIDER'.
#   https://135.181.146.130/platform  →  admin@drift.test / DriftPlatform2026!
```

`set-2fa-code.mjs` is a stopgap until a real 2FA delivery provider exists;
delete it and its doc row once email delivery lands.

## Deploy

Run as `drift-deploy` after root provisioning and env setup:

```bash
cd /srv/drift/app
bash scripts/deploy.sh
```

The deploy script fast-forwards `master`, builds images on the box, runs
`prisma migrate deploy`, starts the stack, and prints container status.

## Deploying a published image

Building on the box is the default and still works, but it competes for RAM with
the running stack and leaves nothing to roll back to — the whole of tracker 5.2.
`.github/workflows/release.yml` publishes the three images to GHCR on every `v*`
tag and on manual dispatch, tagged both with the release tag and with an
immutable `sha-<12>` tag.

To run a published build instead of building locally, set the tag before the
compose commands:

```bash
cd /srv/drift/app
export DRIFT_IMAGE_TAG=sha-0123456789ab      # from the workflow run summary
docker compose -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml --env-file .env.production \
  run --rm api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

GHCR needs a login on the box once, with a personal access token carrying
`read:packages`:

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-username> --password-stdin
```

**Rolling back** is the point of all this: re-run the same three commands with
the previous `sha-` tag. Note that a rollback does **not** undo a migration —
`prisma migrate deploy` only rolls forward, so a release that changed the schema
needs its down-path thought about before it ships, not after.

**The console images are environment-specific.** Both bake `NEXT_PUBLIC_API_URL`
into the bundle *and* into their CSP `connect-src` at build time, so an image
built for one origin cannot be re-pointed at another with an env var. The
workflow reads the value from the `PUBLIC_API_URL` repository variable, falling
back to `https://drift.einsbrand.com/api`. This is also why the domain migration
below needs a rebuild rather than a config change.

Deployment itself is deliberately not automated from CI. Wiring a job that holds
an SSH key to production is a decision with its own blast radius, and it is the
owner's to make; the runbook above is what it would automate.
The deploy script fast-forwards `master`, builds images on the box, runs
`prisma migrate deploy`, starts the stack, and prints container status.

## Smoke tests

```bash
curl -fsS http://127.0.0.1:3009/health
curl -fkI https://135.181.146.130/api/health
curl -fkI -u drift-preview:<password> https://135.181.146.130/
curl -fkI -u drift-preview:<password> https://135.181.146.130/platform
```

## Mobile app (APK rebuild)

The Flutter app is not server-deployed — it only needs its API base URL pointed
at the live deployment. The URL is baked in at build time and defaults to the
local dev server (`mobile/lib/core/network/dio_client.dart`), so pass it as a
dart-define:

```bash
cd mobile
flutter build apk --release --split-per-abi \
  --dart-define=DRIFT_API_BASE_URL=https://drift.einsbrand.com/api \
  --dart-define=DRIFT_SUPPORT_EMAIL=drift@einsbrand.com
```

Outputs land in `mobile/build/app/outputs/flutter-apk/` —
`app-arm64-v8a-release.apk` (modern devices) and
`app-armeabi-v7a-release.apk` (older devices). Install with
`adb install <apk>` or distribute directly.

`DRIFT_SUPPORT_EMAIL` is the public Contact Support mailbox used for account
recovery, erasure requests, billing, safety, and technical issues. The default
in code is `drift@einsbrand.com`; production readiness still requires confirming
that this mailbox is monitored or forwards into the support queue.

Notes:

- The staging API uses a Let's Encrypt **IP certificate**, which is publicly
  trusted — no special TLS handling is needed on devices.
- Rebuild only when the API URL changes, i.e. once more at the domain
  migration below.
- Signing config is unchanged from the normal release flow; the existing
  external signing values apply.

## Deferred domain migration

When the domain is ready, replace this IP-only shape with separate hostnames for
the API and both consoles. Rebuild both Next.js apps with the final
`NEXT_PUBLIC_API_URL`, update API `CORS_ALLOWED_ORIGINS`, issue normal 45/90-day
domain certificates, and update the mobile `DRIFT_API_BASE_URL`.
