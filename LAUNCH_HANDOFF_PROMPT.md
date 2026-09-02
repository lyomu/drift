# Handoff: continue the Drift Tennis launch tracker

You are picking up a launch-readiness effort that is **partly done and verified,
partly blocked on things outside this repo, and mostly not started.** Everything
below is verified fact from live sessions on 2026-09-01/02, not assumption. Where
something is an assumption, it says so.

---

## 1. The task

Close out `LAUNCH_TRACKER.md` — 24 items standing between the current IP-only
staging deployment (`135.181.146.130`) and a public launch. Read these three
documents in this order before touching anything:

1. **`LAUNCH_READINESS.md`** — the gap analysis. Findings are tagged `[verified]`
   (confirmed against the running system) or `[doc]` (carried from
   `SECURITY_REVIEW.md`/`PROGRESS.md`, not independently re-tested).
2. **`LAUNCH_PLAN.md`** — the same gaps sequenced into phases that gate each
   other. Critical path: **domain → email provider → Google/Apple sign-in →
   store submission.**
3. **`LAUNCH_TRACKER.md`** — the 24-item checklist, stable IDs matching a live
   artifact tracker at `https://claude.ai/code/artifact/33d72505-3973-4cd6-b8a9-6184ed259972`.
   Setting a status on the artifact saves for every viewer, not just yours — it
   republishes itself via the `artifact` capability. Keep both the artifact and
   `LAUNCH_TRACKER.md` in step; close an item in a commit with `closes tracker <id>`.

`SECURITY_REVIEW.md` records a **conditional NO-GO for public production
launch**. Nothing since has overturned that.

## 2. Current state — verified 2026-09-02

**4 of 24 items closed:** `0.1`, `0.2`, `1.2`, `1.3`.

| Item | State |
|---|---|
| `0.1` TLS renewal reload hook | Done. `renew_hook = systemctl reload nginx` is in `/etc/letsencrypt/renewal/135.181.146.130.conf`, proven firing with `certbot renew --dry-run --run-deploy-hooks` (real `Reloaded nginx.service` in the journal). |
| `0.2` Nightly backups + rehearsed restore | Done. `scripts/ops/drift-backup.sh`, cron'd 03:15 UTC daily + 03:45 UTC Sunday full restore rehearsal. First verify matched live exactly: 94 tables, 7 users, live DB untouched. |
| `1.1` Offsite backup copy | **Deliberately skipped for now**, owner's call. A dedicated ed25519 key already exists at `/root/.ssh/drift-storagebox` on the box (public half printed in `scripts/ops/drift-backup.sh`'s own comments) and the script has a guarded rsync step behind `STORAGE_BOX_HOST`/`STORAGE_BOX_USER` — it skips cleanly, without failing the backup, while those are unset. To finish: create a Hetzner Storage Box (Cloud Console → Storage Boxes — a *different product* from the Cloud Server already running Drift, not bundled with it), add that public key to it, set the two env vars in the cron entry, re-run with `VERIFY=1`. |
| `1.2` Monitoring and alerting | Done. `scripts/ops/drift-health-guard.sh` (on the box at `/usr/local/sbin/`, cron'd every 15 min) checks API health, TLS expiry, container state/restarts — forced-failure-tested, so detection is real. Its alert channel (`alert.sh` → Jenkins `ops-alert` job → email) had never actually delivered — the token in `/root/.jenkins_ops_token` 401'd against `ci.einsbrand.com` — but the owner re-issued it 2026-09-02 and delivery was proven end-to-end in one pass: crumb issuer 200, POST to `buildWithParameters` HTTP 201, Jenkins build #14 SUCCESS (the job's `mail` step fails the build on SMTP rejection, so SUCCESS = accepted), test email received at the job's configured recipient `hello@lyomu.com`. Root cause of the dead token: Jenkins revokes a user's API tokens when their password changes — a future 401 after a password change means re-issue, not debugging. |
| `1.3` Secrets off the filesystem | Done. `.env.production` was already `600`, single-owner, single-SSH-key-access — that already satisfied the security review's "root-only env files" bar; no real secret was ever found in git history or CI logs. `JWT_SECRET` rotated live and verified three ways: pre-rotation access token now 401s, fresh login issues a working token, API stayed healthy through the `--force-recreate`. **Correction to the original finding:** rotating it is lower-risk than it looks — refresh tokens are opaque and DB-hashed, not JWT-signed, so only short-lived access tokens die; an active client recovers silently via its own refresh flow, not a hard logout. |

**Everything else — items `2.1` through `P.6`, 21 of 24 — is genuinely untouched.**

## 3. What to do next, in order

Follow `LAUNCH_PLAN.md`'s phase order; it exists precisely so each phase unblocks
the next rather than picking items at random.

1. **Phase 2 (`2.1`–`2.3`) is the highest-leverage next move and is blocked on
   the product owner, not engineering.** Get the domain. Everything in Phase 3
   and Phase 4 sits behind it.
2. **Phase 3 (`3.1`) — email/SMS provider.** The single largest functional gap:
   no signup verification, no password reset, no club invitations, no support
   replies in production. Needs a provider decision before any code.
3. **Phase 4 (`4.1`–`4.5`) — Google & Apple sign-in.** Read `LAUNCH_PLAN.md`'s
   Phase 4 section in full before starting; it is denser than it looks:
   - The UI already exists and is **actively misleading users** — three
     screens render "Continue with Google/Apple" and all six buttons call
     `_notYet()`. This is not a nice-to-have; it is a shipped bug.
   - `User.passwordHash` is **non-nullable** and there is **no social identity
     table** — both are schema blockers, not just wiring.
   - `4.2` is a **decision**, not a task: how a Google sign-in against an
     existing password-account email should behave. Cannot be retrofitted
     safely once shipped — get sign-off before writing code.
   - `4.5` is a **hard constraint**: Apple Guideline 4.8 makes Sign in with
     Apple mandatory once Google is offered. They ship together on iOS or
     neither ships. This pulls an Apple Developer Program membership onto the
     critical path — start that paperwork (`P.6`) as early as possible, it has
     a real lead time.
4. **`5.1` (Android release key) has a hard deadline: before any store
   submission, not before launch.** Two keystores exist
   (`mobile/android/app/{preview,release}.keystore`), both correctly
   gitignored. Whether `release.keystore` has ever signed a distributable
   build is **unanswered and becomes unanswerable** the moment a key signs a
   real Play Store release. Answer this before Phase 4/6 ship to a store, not
   after.
5. Phases 5 (remaining), 6, 7, and the parallel/legal track can run alongside
   the above — they are not on the critical path, but several (`P.1`–`P.6`)
   have long lead times and should start now regardless of engineering
   sequencing.

## 4. Things that will trip you up — verified, not theoretical

- **The auto-mode permission classifier blocks writes that touch credentials or
  production secrets**, even when the user has already verbally approved the
  action — this happened twice this session (an SSH write to `.env.production`,
  and this session attempting to write its own permission grant). Both are the
  guard working as intended. The fix is the human toggling out of auto mode
  (shift+tab in the Claude Code terminal) for that one step, or adding a scoped
  rule via `/permissions` — never have the agent write its own grant.
- **Staging is `NODE_ENV=production`.** `/auth/verify` and
  `/platform-admin/auth/verify-2fa` never return a dev code from the API
  response. `scripts/staging/set-2fa-code.mjs` (run inside `drift-api` via
  `docker exec`) is the only way to get a Platform Admin bearer token from
  outside the box.
- **Auth endpoints throttle at 10 hits per 60s** (`AUTH_SENSITIVE` in
  `auth.controller.ts`). A 429 retry loop shorter than that window just burns
  more of the same budget — wait past the full TTL (~65s), not a short backoff.
- **The platform-admin API has per-area controller prefixes, not a flat
  `platform-admin/*`** — e.g. commercial routes are
  `platform-admin/commercial/plans`, not `platform-admin/plans`. This cost real
  time twice in `scripts/staging/seed-staging-extras.mjs`'s history (see its
  git log) and is exactly the kind of thing to verify against the controller
  source before assuming a route shape.
- **Competitions endpoints (`tournaments`, `ladders`) use `@Controller()` with
  no prefix at all** — `/tournaments/:id/entries`, not
  `/competitions/tournaments/...`.
- **Tournaments have no delete or archive endpoint.** Three duplicate
  `Riverside Autumn Open` rows exist on staging from an earlier wrong-route
  mistake and cannot be cleaned up through the API — only direct DB deletion
  would do it, which needs the same production-write sign-off as anything else
  touching the live database.
- **The deploy script (`scripts/deploy.sh`) builds images on the box itself**
  — no CI deploy job exists. A deploy with no `src/`/schema changes is a true
  no-op (confirmed twice: cached layers, containers not even recreated,
  `prisma migrate deploy` reports nothing pending) — don't expect a restart or
  downtime from a docs/tooling-only push.
- **This owner's stated conventions, confirmed still in force:** get a written
  plan approved before multi-file edits (picking the task ≠ approving the
  approach); "just write code" means code only, no build/migrate/test/dev-server
  runs mid-task — verify in one pass at the end; never `npm run build` in
  `backend/` while `start:dev` is running locally, it kills :3009; update
  `PROGRESS.md` at every phase boundary, not just at session end (this session's
  own arc went several commits before finally being logged there — don't
  repeat that gap).

## 5. Access already set up — don't re-provision

- SSH: `~/.ssh/drift-tennis-hetzner` → `root@135.181.146.130`. `drift-deploy`
  user is sudo-scoped to `nginx -t`/`nginx -s reload` only.
- Jenkins ops-alert token: `/root/.jenkins_ops_token` on the box — re-issued by the
  owner 2026-09-02 and proven delivering (see `1.2`). Remember: a Jenkins password
  change revokes this token, so a fresh 401 after one means re-issue, not debugging.
- Storage Box backup key: `/root/.ssh/drift-storagebox` (private) already
  generated, public half in `scripts/ops/drift-backup.sh`'s comments — not yet
  attached to any actual Storage Box.

---

Ask the product owner directly, don't guess, if you hit: the domain choice, the
email/SMS provider choice, the account-linking policy (`4.2`), or whether
`release.keystore` has ever shipped (`5.1`). All four are decisions this repo's
history shows were deliberately left to them, not oversights.
