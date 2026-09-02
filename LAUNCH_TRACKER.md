# Drift Tennis — Launch Tracker

Checklist form of `LAUNCH_PLAN.md`. IDs are stable and match the live tracker
artifact, so a commit or PR can close an item by referencing its ID
(e.g. `closes tracker 1.1`).

**Status key:** `[ ]` to do · `[~]` in progress · `[!]` blocked · `[x]` done

**24 items · 6 closed**

---

## Phase 0 — Done 2026-09-02

- [x] **0.1 — TLS renewal reload hook**
  `renew_hook` added and verified firing (a real `Reloaded nginx.service` at 09:07:06
  via `--run-deploy-hooks`). Without it a renewed cert would land on disk while nginx
  kept serving the old one.
- [x] **0.2 — Nightly backups + rehearsed restore**
  `scripts/ops/drift-backup.sh`, 14-day retention, weekly restore rehearsal. First
  verify matched live exactly: 94 tables, 7 users, live database untouched.

---

## Phase 1 — Stop the bleeding 🔴

- [ ] **1.1 — Offsite backup copy**
  Backups share a disk with the database, so they do not survive the disk loss they
  exist for. Both candidate commands are at the foot of `scripts/ops/drift-backup.sh`.
  *Blocked on:* destination + credentials · *Effort:* ~30 min
- [x] **1.2 — Monitoring and alerting**
  `scripts/ops/drift-health-guard.sh` runs on the box (`/usr/local/sbin/`, cron'd every
  15 min) — API health, TLS expiry, container state/restarts — and was forced-failure-tested,
  so detection is real. The alert channel it reuses (`alert.sh` → Jenkins `ops-alert` job →
  email) turned out to have never actually delivered: `/root/.jenkins_ops_token` 401'd
  against `ci.einsbrand.com`. Token re-issued by the owner 2026-09-02 and delivery proven
  end-to-end: crumb issuer 200, `alert.sh` POST → HTTP 201, Jenkins build
  `einsbrand/ops-alert` #14 SUCCESS (the job's `mail` step fails the build on SMTP
  rejection, so SUCCESS means the message was accepted), test email received at the job's
  configured recipient `hello@lyomu.com`. Note: changing the `nebulaRet` Jenkins password
  revokes its API tokens — a future 401 after a password change means re-issue, not
  debugging.
- [x] **1.3 — Secrets off the filesystem**
  `.env.production` was already `600`, drift-deploy-owned, single-SSH-key access —
  no real secret ever found in git history or CI logs. The open gap was proving a
  rotation actually works: `JWT_SECRET` rotated live 2026-09-02, verified — the
  pre-rotation token now 401s, a fresh login issues a working token, API stayed
  healthy through the container recreate. *Reference:* SECURITY_REVIEW A02

## Phase 2 — The domain 🔴

- [x] **2.1 — Acquire and point the domain**
  Settled on `drift.einsbrand.com` — a subdomain of the zone the owner already controls
  (`ns1.noc254.com`), so this became a record change, not a purchase. DNS set 2026-09-02:
  `A → 135.181.146.130`, `AAAA → 2a01:4f9:c013:fb24::1`, TTL 300, verified from the
  authoritative server and public resolvers. No wildcard on the zone (probe confirmed),
  so the pre-existing `drift` record pointing at the apex host was edited in place.
- [x] **2.2 — Reissue TLS against real names** *(depends on 2.1)*
  90-day Let's Encrypt cert for `drift.einsbrand.com` issued 2026-09-02 (expires
  2026-12-01) via `certbot certonly --nginx`; `renew_hook = systemctl reload nginx`
  inherited into its renewal config; `certbot renew --dry-run` passes (EXIT 0). Nginx
  split into a name vhost (`/etc/nginx/conf.d/drift-name.conf`) plus the IP vhost kept
  as 443 `default_server` so preview APKs compiled with the old IP URL keep working —
  the short-lived IP cert still renews for it. Health guard now watches the domain
  (cert check reports 89 days, not 5). Mobile rebuild should pass
  `--dart-define=DRIFT_API_BASE_URL=https://drift.einsbrand.com/api`.
- [ ] **2.3 — SPF, DKIM, DMARC** *(depends on 2.1)*
  Without these, provider email lands in spam, silently undermining Phase 3.

## Phase 3 — Email provider 🟠

- [ ] **3.1 — Choose and wire an email & SMS provider**
  No mail dependency exists; the API returns `PENDING_PROVIDER`. Breaks signup
  verification, password reset, admin 2FA, club invitations and support replies.
  Gates account recovery and staff login.
  *Blocked on:* provider decision · *Effort:* 2–3 days

## Phase 4 — Google & Apple sign-in 🟠

- [ ] **4.1 — Schema: optional password + identity table**
  `passwordHash` is non-nullable, so a social-only user cannot exist. No table for
  `(provider, providerAccountId, userId)`. *Effort:* ~1 day incl. migration
- [ ] **4.2 — Decide the account-linking policy** *(decision, not code)*
  `User.email` is unique. Google sign-in against an existing password account must
  auto-link, reject, or prompt-to-link. **Recommend prompt-to-link.** Cannot be
  retrofitted safely.
- [ ] **4.3 — Backend: token verification endpoints**
  `POST /auth/oauth/google` and `/apple`, verified server-side, returning the existing
  access/refresh pair. Never trust a client-supplied id or email.
  *Libraries:* `google-auth-library`, `jose` · *Effort:* 2–3 days
- [ ] **4.4 — Mobile: wire the existing buttons**
  Buttons already render on login, sign-up and welcome; all six call `_notYet()`.
  Route new social users to `BASIC_PROFILE`, not an empty home feed.
  *Blocked on:* Apple Developer account · *Effort:* 2–3 days
- [ ] **4.5 — Apple Guideline 4.8 constraint** 🔴
  Offering Google makes Sign in with Apple **mandatory** on iOS. They ship together or
  neither ships. Pulls the Apple Developer membership onto the critical path.

## Phase 5 — Production hygiene 🟡

- [ ] **5.1 — Android release key decision** 🔴
  Two keystores exist. Rotate if `release.keystore` ever protected a distributable
  build. **Unanswerable once a key signs a Play release.**
  *Deadline:* before any store submission
- [ ] **5.2 — Move deployment off the box**
  CI has no deploy job; a human builds images on the production host against 3.7 GB
  of RAM, with no artifact to roll back to.
- [ ] **5.3 — Pin CI actions to commit SHAs**
  `checkout@v6`, `setup-node@v6`, `flutter-action@v2`.
- [ ] **5.4 — Dependency advisories**
  Four high findings via Prisma (`deepmerge-ts`, `mysql2`). **Do not run
  `npm audit fix --force`** — it downgrades to Prisma 6.19.3. Was three, now four.
- [ ] **5.5 — Password policy · egress · CSP**
  Bare 8-char minimum, no breach screening; ingestion egress restriction; confirm
  nginx does not strip the consoles' headers.

## Phase 6 — Push notifications 🟡

- [ ] **6.1 — FCM and APNs delivery**
  Nothing reaches a user without the app open, removing the core loop: challenge
  received, result awaiting confirmation, round deadline.
  *Sequence:* directly after Phase 4 — shares the Apple account and signing setup.

## Phase 7 — Payments ⚪

- [ ] **7.1 — Wire a payments provider**
  Schema and services are provider-neutral and admin plans are seeded, but no money
  can move. *Condition:* only if the launch tier is paid.

---

## Parallel — decision, lawyer or purchase

- [ ] **P.1 — Terms & Privacy Policy**
  `legal_screen.dart:13,22` reads *"This is placeholder copy pending a full legal
  review."* *Owner:* legal
- [ ] **P.2 — Minors / age-gating policy**
  No age gate. A tennis product attracts under-18s → COPPA / GDPR-K, guardian consent,
  and whether minors appear in discovery. *Owner:* product + legal
- [ ] **P.3 — GDPR erasure**
  Deletion is a soft flag; it does not cascade or anonymise, so a real erasure request
  cannot be honoured.
- [ ] **P.4 — Support mailbox**
  Help and Contact are placeholder with no monitored address behind them.
- [ ] **P.5 — Load testing**
  Never performed. One 3.7 GB host runs Postgres, Redis, the API and two Next apps.
- [ ] **P.6 — Apple & Google developer accounts**
  Prerequisites for Phases 4 and 6. Long lead time — start the paperwork early.
  *Blocks:* 4.4, 4.5, 6.1

---

## Critical path

**2.1 domain → 3.1 email → 4.1–4.5 social sign-in → store submission**

Most likely to be underestimated: **4.5** (Google alone means iOS rejection) and
**5.1** (unanswerable after first release).
