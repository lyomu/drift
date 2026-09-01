# Drift Tennis IP-only staging deployment

Target server: `135.181.146.130`

This is an internal staging/preview deployment until a real domain exists. The
domain-based vhost split should replace this once DNS is ready.

## Public routes

| Route | Service |
|---|---|
| `https://135.181.146.130/` | Club Admin |
| `https://135.181.146.130/platform` | Platform Admin |
| `https://135.181.146.130/api/` | NestJS API |
| `https://135.181.146.130/socket.io/` | Socket.IO gateway |

Both admin surfaces are protected with HTTP basic auth at Nginx. The API and
Socket.IO routes are not basic-auth protected so browser/mobile clients can call
them normally.

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
```

`PUBLIC_API_URL` is baked into both Next.js builds and their CSP headers, so it
must be correct before `docker compose build` runs.

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

## Basic auth

Create `/etc/nginx/.htpasswd-drift`:

```bash
htpasswd -c /etc/nginx/.htpasswd-drift drift-preview
```

Store the password in the team's password manager. Do not commit it.

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

## Deferred domain migration

When the domain is ready, replace this IP-only shape with separate hostnames for
the API and both consoles. Rebuild both Next.js apps with the final
`NEXT_PUBLIC_API_URL`, update API `CORS_ALLOWED_ORIGINS`, issue normal 45/90-day
domain certificates, and update the mobile `DRIFT_API_BASE_URL`.
