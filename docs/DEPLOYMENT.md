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
