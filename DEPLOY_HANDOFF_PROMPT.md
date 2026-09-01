# Handoff: deploy Drift Tennis to `135.181.146.130`

You are picking up a deployment that has been **scoped and researched but not
started** — nothing has been changed on the server or in the repo except this
file. Everything below is verified fact from a live session on 2026-09-01, not
assumption. Where something is an assumption, it says so.

---

## 1. The task

Stand up Drift Tennis on its own Hetzner box at `135.181.146.130`:

- NestJS API (`backend/`)
- Club Admin console (`club-admin/`, Next.js)
- Platform Admin console (`platform-admin/`, Next.js)
- Postgres + Redis alongside them
- Nginx reverse proxy + Let's Encrypt TLS in front of all three

The Flutter app (`mobile/`) is **not** server-deployed — it only needs its
`DRIFT_API_BASE_URL` pointed at the new API once that is live.

## 2. Decisions already made by the product owner

These were answered directly in the prior session. Do not re-litigate them.

| Decision | Answer |
|---|---|
| **Domain** | The owner **has a domain and will provide it**. It was not given before the session ended — **this is the one open blocker; ask for it first.** No candidate Drift domain (`drifttennis.com`, `drift.tennis`, `drifttennis.co.ke`, `drifttennis.app`) resolves anywhere today. |
| **Environment** | **Internal staging / preview**, not public production. Consequence: put HTTP basic-auth in front of both admin consoles. |
| **Deploy mechanism** | **Versioned deploy script + compose files in the repo first.** Get it live and verified; onboarding to Jenkins (`ci.einsbrand.com`) is a deliberate later follow-up, not part of this task. |
| **Image builds** | **Build on the box**, after adding ~4 GB swap. No Docker Hub repo or registry credentials needed. Builds will be slow; that was accepted. |

## 3. Server: verified state

```
ssh -i ~/.ssh/drift-tennis-hetzner root@135.181.146.130
```

Root SSH works with that key today (the key already exists locally; its comment
is `deploy@drift-tennis-hetzner`). Verified inventory:

- Ubuntu **24.04.4 LTS**, kernel 6.8.0-137, KVM, hostname `drift`
- **2 vCPU / 3.7 GB RAM / 38 GB disk** (1.6 G used) — a CX22-class box
- **`135.181.x` is Hetzner Helsinki.**
- **Completely bare**: no `docker`, no `nginx`, no `certbot`, no `node`
- **No swap** (`Swap: 0B`) — hence the swap decision above
- **UFW inactive**, nothing in `/srv`, no non-root users (uid >= 1000)
- Only port 22 listening (plus systemd-resolved on loopback)

## 4. Repo: verified state

- Monorepo, git remote `https://github.com/lyomu/drift.git`, branch `master`,
  HEAD `8ec9699`.
- **No Dockerfiles anywhere. No production compose. No deploy scripts.**
  `backend/docker-compose.yml` is **local-dev only** (Postgres on host port
  `5434`, Redis `6379`, trivial `drift/drift` credentials) — do not deploy it
  as-is.
- `.github/workflows/ci.yml` exists and is build/test only, no deploy. It pins
  Node **24** and Flutter **3.35.6** — match those versions in the Dockerfiles
  you write.
- Next.js **16.3.1** / React 19.2.8 in both consoles. Their `package.json`
  scripts are stock (`dev`/`build`/`start`/`lint`) — **no `output: "standalone"`
  is configured** in either `next.config.ts`, so either add it (much smaller
  images) or plan to ship `node_modules` and run `next start`.
- Prisma: **40 migrations**, `provider = "postgresql"`, no `url` in the
  datasource block (it comes from `DATABASE_URL`). Deploy path is
  `npx prisma migrate deploy`.
- **Media is stored as a `Bytes` column** (`ClubMediaAsset.bytes`) in Postgres
  — there is **no object store and none is needed**. This is simpler than
  harusi-ke's MinIO setup; do not copy that pattern here. It does mean Postgres
  backups carry all media, and `client_max_body_size` on the API vhost matters.
- Redis is **optional** — it is only the Socket.IO adapter and a realtime
  analytics helper. Both code paths log a warning and fall back to in-memory
  when `REDIS_URL` is unset. A single API instance means you *can* skip Redis,
  but deploying it is cheap and keeps the door open.

### The single biggest repo gotcha

**The working tree has 283 uncommitted changes** (235 modified, 33 untracked,
8 deleted, 4 renamed+modified, 2 added). Substantive product work is in there,
including a deleted `season-state.ts` replaced by `competition-state.spec.ts`.

Any deploy that builds from a git checkout on the box ships `8ec9699`, **not**
what the owner has been running locally. Resolve this deliberately before the
first deploy — either commit and push the work, or confirm with the owner that
deploying HEAD is intended. Do not silently pick one.

## 5. Application configuration you must get right

Local dev ports, which the config defaults assume:
API `3009`, club-admin `3010`, platform-admin `3011`.
(Port 3000 is unusable on the owner's machine — taken by an unrelated project.)

**The API fails closed at startup in production.** Both of these throw and kill
the process, by design (`backend/src/config/`):

1. `JWT_SECRET` must be >= 32 chars and must not contain `change-me`,
   `replace-with`, `example`, or the literal string `secret`
   (`environment.ts`). Generate with `openssl rand -hex 32`.
2. `CORS_ALLOWED_ORIGINS` must be present, comma-separated, no wildcard, no
   path, and **every origin must be `https://`** when `NODE_ENV=production`
   (`http-security.ts`). This is why the domain is a hard blocker — you cannot
   boot the API in production mode against a bare IP.

Full env surface is `backend/.env.example`. Production values needed:
`NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`,
`JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `PLATFORM_ADMIN_JWT_TTL`,
`PLATFORM_ADMIN_WEB_URL`, `CLUB_ADMIN_URL`, `CORS_ALLOWED_ORIGINS`.
`CLUB_ADMIN_URL` builds the club-setup magic link, so it must be the real
public URL, not localhost.

Both consoles read `NEXT_PUBLIC_API_URL` (`lib/api-client.ts`, default
`http://localhost:3009`). It is **baked in at build time** and is *also*
interpolated into the CSP `connect-src` in `next.config.ts` — so a wrong or
missing value at build time produces a console that silently fails every API
call with a CSP violation. Set it before `next build`, not at runtime.

Health endpoint: `GET /health` (`backend/src/app.controller.ts`). Use it for
container healthchecks and smoke tests.

## 6. What the infra docs require of you

Read `C:\Users\gmnyo\Desktop\Engineering projects\devops-infra\docs\` — it is a
second working directory in this session. The relevant conventions:

- **`JENKINS_NEW_PRODUCT_ONBOARDING.md`** — the default is one dedicated server
  per product. This box satisfies that; no colocation guardrails needed.
- **`SHARED_BOX_RETAILFLOW_HARUSI_MIGRATION.md` §4–§7** is the closest thing to
  a build-out template. Reuse: a dedicated non-root deploy user confined to
  `/srv/<product>`, sudoers limited to exactly `nginx -t` and `nginx -s reload`,
  `mem_limit`/`cpus` on **every** container from the first version (not
  retrofitted), UFW allowing only 22/80/443, and disk-guard alerting installed
  **before** real traffic lands.
- **§12 of that doc** lists three things that only surfaced during a real first
  deploy elsewhere and are worth pre-empting here: the deploy user needs
  `docker login` if it ever pulls private images; any
  `/etc/nginx/conf.d/*.conf` the deploy user rewrites must be `chown`'d to that
  user; and nginx/TLS must be bootstrapped **HTTP-only first**, then certbot,
  then the 443 blocks restored. `devops-infra/nginx/harusi.ke.conf` documents
  that two-phase pattern in its header comment — copy the approach, not the
  MinIO routing.
- **`scripts/disk-guard.sh` + `scripts/alert.sh`** are reusable, but `alert.sh`
  hardcodes `JENKINS_URL="http://127.0.0.1:8080"`, which is wrong on a
  non-Jenkins box. Make it overridable and export
  `JENKINS_URL=https://ci.einsbrand.com`, and provision a root-only
  `/root/.jenkins_ops_token` (mode 600, never committed).
- **`scripts/install-observability-agent.sh`** onboards a product server to the
  central Grafana/Loki stack. It needs `INFRA_PROM_REMOTE_WRITE_URL` and
  `INFRA_LOKI_PUSH_URL`. `DEVOPS.md §8.1` is explicit that these endpoints must
  **not** be exposed unauthenticated on the public internet — so this is a
  follow-up that needs a private path first, not something to bolt on now.
- Region note: the docs prefer Nuremberg/Falkenstein over Helsinki for
  proximity to the rest of the estate. This box is already Helsinki. That is
  acceptable here because Drift's database lives on the same box, so there is
  no cross-region DB round-trip. Worth one line in the runbook, not a reason to
  move.

## 7. Security posture — read before calling anything "live"

`SECURITY_REVIEW.md` (2026-08-25, updated 2026-08-29) records a **conditional
NO-GO for public production launch**. That is precisely why the owner chose
staging. Still open and relevant to how you deploy:

- **A05** explicitly asks for CSP/security headers on both deployed admin sites
  and confirmed proxy/TLS settings per environment — that is your job in the
  nginx config. The consoles already set their own headers via `next.config.ts`;
  do not let nginx strip them or set contradictory duplicates.
- **A10** — RSS/SSRF is mitigated in application code, but the review's
  remaining item is **restricting the ingestion worker's outbound network egress
  at the infrastructure layer**. That is an infra task and lands in your scope.
  `NEWS_FEED_ALLOWED_HOSTS` (in `.env.example`) is the app-level allowlist;
  consider setting it in production as belt-and-braces.
- **A02 / P0** — production secrets must live in a secret manager or root-only
  env files on the box, never in repo variables or build logs.
- **A06** — three high `npm audit` findings via Prisma 7.9.1 →
  `@prisma/config` → `deepmerge-ts` (GHSA-ggr8-5vv4-36mx). **Do not run
  `npm audit fix --force`** — it proposes a breaking downgrade. Known and
  accepted; track Prisma's stable fix.
- Basic-auth in front of both consoles is required by the staging decision.

## 8. Suggested order of work

1. **Get the domain from the owner.** Nothing HTTPS-shaped can start without it.
   Confirm the exact subdomain split you will use (something like `api.`,
   `admin.`, `console.`) and have the owner add A records → `135.181.146.130`.
2. Resolve the 283-file uncommitted-work question (§4).
3. Box baseline: 4 GB swapfile, Docker CE + compose plugin, nginx, certbot, UFW
   (22/80/443), unattended-upgrades, and a `drift-deploy` user confined to
   `/srv/drift` with the narrow sudoers line.
4. Write into the repo: `backend/Dockerfile`, `club-admin/Dockerfile`,
   `platform-admin/Dockerfile`, a root `docker-compose.prod.yml` with
   `mem_limit`/`cpus` on every service, and `scripts/deploy.sh`.
   Budget against 3.7 GB leaving ~800 MB for OS + Docker — roughly Postgres
   768m, Redis 192m, API 1g, each console 512m. Revise after observing real
   usage; treat these as a starting point, not gospel.
5. Nginx HTTP-only vhost → `certbot certonly --webroot` for all names in one
   cert → restore the 443 blocks → `chown` the conf to `drift-deploy`.
6. First deploy: build on box, `prisma migrate deploy`, bring up, verify
   `GET /health` and both consoles behind basic-auth.
7. Disk-guard + alerting (§6). Then update `devops-infra/docs/DEVOPS.md`'s
   inventory table and architecture diagram to include this box — that doc is
   the estate's source of truth and this deployment is currently absent from it.
8. Point `mobile/`'s `DRIFT_API_BASE_URL` at the new API and rebuild the APK.

## 9. Working conventions for this repo

- `PROGRESS.md` must be updated at every phase boundary, not just at session
  end. This deployment gets its own row.
- Get a written plan approved before multi-file edits. Picking the task is not
  approving the approach.
- "Just write code" from this owner means code only — no build, migrate, test,
  or dev-server runs mid-task. Do all verification in one pass at the end.
- Never run `npm run build` in `backend/` while a `start:dev` watcher is
  running locally; it kills the process on :3009.
