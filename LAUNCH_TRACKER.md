# Drift Tennis — Launch Tracker

Checklist form of `LAUNCH_PLAN.md`. IDs are stable and match the live tracker
artifact, so a commit or PR can close an item by referencing its ID
(e.g. `closes tracker 1.1`).

**Status key:** `[ ]` to do · `[~]` in progress · `[!]` blocked · `[x]` done

**27 items · 15 closed**

---

## Phase 0 — Done 2026-09-02

- [x] **0.1 — TLS renewal reload hook**
  `renew_hook` added and verified firing (a real `Reloaded nginx.service` at 09:07:06
  via `--run-deploy-hooks`). Without it a renewed cert would land on disk while nginx
  kept serving the old one.
- [x] **0.2 — Nightly backups + rehearsed restore**
  `scripts/ops/drift-backup.sh`, 14-day retention, weekly restore rehearsal. First
  verify matched live exactly: 94 tables, 7 users, live database untouched.
  *Interaction with P.3:* the dumps hold **pre-erasure data for up to 14 days** until
  they age out — a documented limitation, not something code can fix. The erasure job
  runs 03:40 UTC, after the 03:15 backup, so this is deliberate rather than accidental.
  It belongs in the P.1 privacy copy.

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
  **2026-09-02 verified:** `einsbrand.com` already publishes SPF
  (`v=spf1 +a +mx +ip4:84.16.229.230 include:relay.mailbaby.net +ip4:178.162.196.44
  +ip4:167.235.180.68 +ip4:207.180.237.29 ~all`) covering the owner's sending IPs,
  so SPF for the SMTP server is already in place. 3.1's actual sender is
  `drift.einsbrand.com` (From: `drift@einsbrand.com`), which is covered by the
  parent zone's SPF. **Still to add:** a DMARC TXT record
  (`v=DMARC1; p=quarantine; rua=mailto:…`) — draft provided when 3.1 closed — and
  a DKIM selector **if** the `mail.einsbrand.com` server signs outbound (depends
  on the server config, not this repo).

## Phase 3 — Email provider 🟠

- [x] **3.1 — Choose and wire an email & SMS provider**
  Provider decision (owner, 2026-09-02): the owner's own SMTP server,
  `mail.einsbrand.com:465` (implicit TLS; 587 STARTTLS is the documented fallback),
  auth `drift@einsbrand.com`. New global `MailModule` + `MailerService`
  (`backend/src/mail/`) on `nodemailer`, configured entirely from env
  (`SMTP_HOST/PORT/USER/PASS/MAIL_FROM`); disabled when `SMTP_HOST` is unset, so
  every consumer keeps its prior behaviour (dev console codes / `PENDING_PROVIDER`)
  and sends never throw. Wired six flows: signup verification + user password reset
  (`auth.service.ts`) · Platform Admin 2FA + staff password reset
  (`platform-admin.service.ts` — retires the `set-2fa-code.mjs` stopgap) · staff
  invitations (`access-control.service.ts`) · club-member added email
  (`clubs-admin.service.ts`) · club-onboarding setup link
  (`club-onboarding.service.ts`) · support ticket replies
  (`support-admin.service.ts`). Response `delivery` gains `EMAIL`.
  **Verified 2026-09-02:** `tsc -p tsconfig.build.json` clean, unit suite
  41 suites / 498 tests green; deployed live and the API logs
  `[MailerService] SMTP transport configured for mail.einsbrand.com:465` with
  **zero `Mail to … failed` lines**; test signups (`drift@einsbrand.com`,
  `mailer.proof.0902@einsbrand.com`) created with no `devVerificationCode`
  returned. SMS/phone verification is out of scope. *SMS intentionally deferred.*

## Phase 4 — Google & Apple sign-in 🟠

- [x] **4.1 — Schema: optional password + identity table**
  Migration `20260902200000_social_signin` applied 2026-09-02: `AuthProvider` enum,
  `social_identities` table (unique on `(provider, providerAccountId)`, `userId`
  indexed, `ON DELETE CASCADE`), and `users."passwordHash"` dropped to nullable.
  Hand-written SQL verified against the datamodel — `prisma migrate diff
  --from-config-datasource --to-schema` reports **"No difference detected"**.
  Every password read path audited: `login` and `changePassword` now guard the null
  and return the same generic rejection a wrong password gets, so a social-only
  account cannot be distinguished by probing. `users.service.ts` redaction and the
  platform-admin paths use a different model and are unaffected.
- [x] **4.2 — Decide the account-linking policy** *(decision, not code)*
  `User.email` is unique. Google sign-in against an existing password account must
  auto-link, reject, or prompt-to-link. **Decided 2026-09-02:** **auto-link when both
  sides are verified** (provider asserts `email_verified` AND the existing account has
  `emailVerifiedAt`); otherwise **fall back to prompt-to-link**. Implemented as: verified
  both sides → attach identity silently; not both → `409 EMAIL_LINK_REQUIRED` → app
  asks for the existing password → `/auth/oauth/link`. Reference: `docs/SOCIAL_SIGNIN_PLAN.md` §0.
- [x] **4.3 — Backend: token verification endpoints**
  `POST /auth/oauth/google`, `/auth/oauth/apple` and `/auth/oauth/link`, all under the
  existing `AUTH_SENSITIVE` throttle, returning the same access/refresh pair the
  password path issues. `OAuthService` verifies signature, issuer, audience, expiry
  and nonce server-side; only verified claims are trusted, never a client-supplied id
  or email. An unconfigured provider answers **503**, never a trusted guess.
  Returning users are matched on the provider's `sub`, so changing a Google address
  keeps the account. Suspended and deleted accounts are refused exactly as `login`
  refuses them. `oauth/link` additionally requires the token's address to equal the
  account being linked, or a token for account A could be attached to account B by
  anyone holding B's password; a successful link revokes other sessions.
  *Libraries:* `google-auth-library@11`, **`jose@4`** — 5.x onward is ESM-only and
  ts-jest cannot load it, which would break every auth spec, not just this one.
  *Verified:* `tsc` clean · unit **42 suites / 520 tests** (was 41/498) · new
  `oauth.e2e-spec.ts` drives 409 `EMAIL_LINK_REQUIRED` → link → straight-through.
  *Remaining before real use:* Google OAuth client IDs in `GOOGLE_OAUTH_CLIENT_IDS`
  (Apple can wait — see 4.5).
- [x] **4.4 — Mobile: wire the existing buttons**
  All six `_notYet()` call sites replaced by one `SocialAuthButtons` widget owning
  the whole flow, so Welcome, Login and Sign-up cannot drift apart. `SocialAuthService`
  wraps `google_sign_in@7` and `sign_in_with_apple@7`; nothing above it imports a
  provider package, which is why the flow is testable without a device.
  Handles: cancel (silent — announcing a failure after a deliberate back-out is the
  usual way this feels broken), the `409` linking prompt, an unconfigured build
  (`503`/missing client ID reported plainly, not as a crash), and routing a fresh
  social user to `BASIC_PROFILE`. **Nonce:** proper per-attempt for Apple — the raw
  value is sent, `sha256` goes to Apple, and the backend now compares the hash, so a
  stolen token alone won't pass. Google is per-app-launch only: `google_sign_in@7`
  takes the nonce in `initialize()`, which its own docs say runs exactly once per
  process. That is the API's ceiling, and it is recorded rather than papered over.
  *Verified:* `flutter analyze` clean · **555 tests** (5 new covering link-prompt,
  cancel, dismissal and unconfigured builds).
  *Remaining before it does anything real:* `GOOGLE_OAUTH_CLIENT_IDS` +
  `--dart-define` client IDs — see `docs/SOCIAL_SIGNIN_SETUP.md`. Apple stays gated
  on 4.5; its button reports "not available" on Android until configured.
- [ ] **4.5 — Apple Guideline 4.8 constraint** 🔴
  Offering Google makes Sign in with Apple **mandatory** on iOS. They ship together or
  neither ships. Pulls the Apple Developer membership onto the critical path.

## Phase 5 — Production hygiene 🟡

- [x] **5.1 — Android release key decision** 🔴
  **Answered with evidence 2026-09-03, and the answer was rotate.** The question was
  whether `release.keystore` ever protected a distributable build. It did:
  `drift-tennis-release.apk` (2026-08-18 16:35, four minutes after the keystore was
  created) carries SHA-1 `0B:B5:B3:E7:5E:7C:01:7C:74:A0:D8:FB:33:44:3F:03:90:BA:C6:19`,
  an exact match for that keystore. Two further findings made it unambiguous:
  commit `378780f` hardcoded `storePassword`/`keyPassword` = `"drifttennis"` into
  `build.gradle.kts` and that commit is **pushed to GitHub**, and the password is
  trivially weak regardless (it equals the alias and the product name). The keystore
  *file* was never committed — checked, no blob in history — so exposure needed both
  halves, but a published, guessable password cannot be relied on.
  **Rotated:** new `app/release-2026.keystore` (RSA 4096, SHA384withRSA, valid to
  2054, alias `drift-release`) with a 32-char random password that was written
  straight to a `600` file and never printed. Old key renamed
  `RETIRED-release-compromised-20260818.keystore` so it cannot be selected by
  accident. New SHA-1 `B1:FF:6E:D1:BE:0F:19:1D:36:CA:18:D5:98:DD:86:5F:3C:46:CE:BF`.
  Credentials in `key.release.properties`, added to `.gitignore` as an exact-match
  rule so `key.properties.example` stays tracked.
  **This was free today and impossible after the first Play release** — which is
  exactly why it was worth answering before submission rather than after.
  *Still to do:* register the new SHA-1 on the Google Cloud Android OAuth client (and
  Firebase) before a release build signs in with Google, and **back up the keystore
  plus its password** — losing both after a Play release means the app can never be
  updated again.
- [ ] **5.2 — Move deployment off the box**
  CI has no deploy job; a human builds images on the production host against 3.7 GB
  of RAM, with no artifact to roll back to.
- [ ] **5.3 — Pin CI actions to commit SHAs**
  `checkout@v6`, `setup-node@v6`, `flutter-action@v2`.
- [x] **5.4 — Dependency advisories**
  **Closed 2026-09-03. The entry had drifted badly and the shape had changed** — it
  said "four high via Prisma", implying everything was an unfixable transitive. By
  today it was **13 (6 high, 7 moderate)**, and three of them were ours to fix.
  **Fixed — now 10 (4 high, 6 moderate):**
  · **`nodemailer` 6.10.1 → 9.1.1**, the one that mattered. A *direct* dependency on
  the auth path shipped in 3.1 (signup verification, password reset, staff 2FA),
  carrying 8 advisories. Reachability was checked rather than counted: 6 of the 8
  need APIs we never touch — `raw`, `envelope`, `List-*` headers, `jsonTransport`,
  OAuth2, a transport `name`. The **two that were reachable** both go through
  address parsing (addressparser DoS, and delivery to an unintended domain), and
  `to` derives from user-supplied signup addresses. All three major bumps miss us:
  7.0 dropped the old SES SDK (we use SMTP), 8.0 renamed error code `NoAuth` →
  `ENOAUTH` (we never branch on codes), 9.0 added TLS validation when *fetching
  remote content* — attachments, OAuth2 endpoints, proxies — none of which we use.
  Engines are `>=6.0.0`; we run Node 24 everywhere.
  · **`fast-uri`** (4 high, SSRF/host-confusion) — **devDependencies only**, via
  `@nestjs/cli`'s ajv/webpack. Never in the production runtime.
  · **`qs`** (2 moderate) — transitive through `express@5`, and this one *is* in the
  request path.
  **The remaining 10 have no upstream fix, and that is the point of recording them:**
  both clusters sit inside vendors we are already on the newest release of —
  **Prisma 7.10.0** (latest stable; `latest` currently points at an 8.0 RC) and
  **firebase-admin 14.3.0** (latest). npm's suggested "fixes" are `prisma@6.19.3`
  and `firebase-admin@10.3.0` — **both downgrades**, both flagged semver-major. That
  is why **`npm audit fix --force` must not be run**: it is not a fix, it is a
  rollback. Also worth knowing: `mysql2` arrives via Prisma and this product runs
  Postgres, so it is unreachable regardless.
  *Watch for:* a Prisma 7.x patch or firebase-admin release that clears these. Until
  then there is no action, and the item is closed rather than left open to generate
  phantom work.
  *Verified:* `tsc` clean · **46 suites / 559 tests**. *Not covered by tests:* live
  SMTP delivery — confirm after deploy by the absence of `Mail to … failed` lines.
  *Incidental:* `npm audit fix` bumped the `prisma` CLI to 7.10.0 while leaving
  `@prisma/client` at 7.9.1 — a skew that would have shipped through `npm ci`.
  Both are now aligned at 7.10.0, which is what a clean install of the existing
  `^7.9.1` ranges produces anyway.
- [ ] **5.5 — Password policy · egress · CSP**
  Bare 8-char minimum, no breach screening; ingestion egress restriction; confirm
  nginx does not strip the consoles' headers.

## Phase 6 — Push notifications 🟡

- [x] **6.1 — FCM and APNs delivery**
  Turned out far cheaper than scoped: `NotificationsService.create()` was already
  *"the one entry point every other module calls"* — verified across **16 call
  sites** — so push hooks into one function with no call-site changes, and the
  existing preference check gates push for free (a muted category can't be pushed,
  pinned by a test). One `DeviceToken` model, migration diff-verified. FCM fans out
  to both APNs and Android, so this is one integration rather than two.
  `PushService` copies the `MailerService` idiom: env-configured, **disabled when
  `FIREBASE_SERVICE_ACCOUNT` is absent**, sends never throw — a push outage cannot
  fail the match confirmation that triggered it. Retired tokens are pruned on FCM's
  `registration-token-not-registered`, the only reliable signal one is dead.
  Mobile registers on the shared post-auth path (so every route in is covered),
  deregisters on logout, and handles foreground / background / **terminated**.
  The deep-link map is now shared, so a push tap and an in-app tap cannot disagree.
  *Two bugs caught by the new tests rather than by users:* logout awaited
  deregistration unguarded, which would have trapped someone in a session they
  asked to leave; and `firebase-admin@14` has no `admin.*` namespace, which the
  unit suite happily mocked and only `tsc` caught.
  *Verified:* backend `tsc` clean · **43 suites / 535 tests** · mobile analyze clean
  · **561 tests**. *Remaining:* Firebase console work — `docs/PUSH_NOTIFICATIONS_PLAN.md` §6.

## Phase 7 — Payments ⚪

- [ ] **7.1 — Wire a payments provider**
  Schema and services are provider-neutral and admin plans are seeded, but no money
  can move. *Condition:* only if the launch tier is paid.

---

## Parallel — decision, lawyer or purchase

- [ ] **P.1 — Terms & Privacy Policy**
  `legal_screen.dart:13,22` reads *"This is placeholder copy pending a full legal
  review."* *Owner:* legal
  **Constrained by P.3 as of 2026-09-03.** This is no longer open-ended copy — it must
  now *describe shipped behaviour*: the **30-day** window before erasure, that
  anonymisation is **terminal**, which records are deliberately kept and why
  (Art. 17(3) — erasure would prejudice other players' rights), and that nightly
  backups retain pre-erasure data for up to **14 days** until they age out. A policy
  that contradicts the code is worse than no policy.
  *Reference:* `docs/GDPR_ERASURE_PLAN.md` §5
- [ ] **P.2 — Minors / age-gating policy**
  No age gate. A tennis product attracts under-18s → COPPA / GDPR-K, guardian consent,
  and whether minors appear in discovery. *Owner:* product + legal
- [x] **P.3 — GDPR erasure**
  **The premise was half wrong, and finding that out shrank the job.** A real
  anonymisation already existed for admin-fulfilled `DELETION` requests; what was
  missing was reach and a user-facing route. It touched **5 of `User`'s 58
  relations**. Now one `ErasureService` defines erasure once and both paths call it —
  defining it twice is how a field gets added to one and forgotten in the other.
  **Newly covered:** social identities and device tokens (deleted outright — either
  would have left an "erased" account still signable-into, or still receiving push),
  coach public contact details, padel free text, message bodies, match reflections,
  support tickets, reports the person authored, and their notification and
  behavioural history. **Both gaps that mattered most were self-inflicted on
  2026-09-02** by Phase 4 and Phase 6.
  **Correction to `PUSH_NOTIFICATIONS_PLAN.md`:** `onDelete: Cascade` does *nothing*
  here — erasure is an `UPDATE`, so the row is kept and no cascade fires. Anything
  that must go has to be listed explicitly.
  **Owner decisions:** deleting in-app now files a `DELETION` request carried out by
  a daily job after **30 days** (P.3a) — recoverable by staff, since login already
  refuses a `DELETED` account; message bodies redacted with rows kept so the other
  participant's thread survives (P.3b); anonymisation is **terminal** (P.3c), because
  a hard delete would corrupt the history of players who never asked to be erased.
  The app's delete screen said data was kept unless you contacted support — untrue
  now, so the copy was rewritten.
  *Verified:* `tsc` clean · **46 suites / 559 tests** (was 43/535) · mobile **561** ·
  platform-admin/auth/onboarding e2e green. The test that matters most walks `User`'s
  relations straight from `schema.prisma` and **fails when a new PII-bearing table
  appears with no decision recorded** — proven to bite by removing `DeviceToken` and
  watching it name the omission. *Reference:* `docs/GDPR_ERASURE_PLAN.md`
- [ ] **P.4 — Support mailbox**
  Help and Contact are placeholder with no monitored address behind them.
  **Raised in importance by P.3.** It is the **only inbound route** for an Article 17
  request, and the only way to reach the 30-day recovery window — `login` refuses a
  `DELETED` account, so someone inside the window cannot ask from within the app.
  Until this exists, an erasure request has no channel to arrive through.
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
