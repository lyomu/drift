# Drift Tennis — Launch Tracker

Checklist form of `LAUNCH_PLAN.md`. IDs are stable and match the live tracker
artifact, so a commit or PR can close an item by referencing its ID
(e.g. `closes tracker 1.1`).

**Status key:** `[ ]` to do · `[~]` in progress · `[!]` blocked · `[x]` done

**29 items · 19 closed**

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

- [!] **1.1 — Offsite backup copy**
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
  parent zone's SPF.
  **2026-09-03:** the "draft provided when 3.1 closed" turned out to be the elided
  sketch above and nothing more — no record text, no `rua` address. Written out
  properly now, and `_dmarc.einsbrand.com` re-checked against 8.8.8.8: **NXDOMAIN,
  so no DMARC policy is in force at all.** The record to publish, decided with the
  owner 2026-09-03:

  ```
  _dmarc  TXT  3600  v=DMARC1; p=none; rua=mailto:drift@einsbrand.com
  ```

  `p=none` rather than the sketch's `p=quarantine` **by decision, not oversight**:
  DMARC passes on SPF *or* DKIM, SPF alignment holds (`MAIL_FROM` is
  `drift@einsbrand.com`, the org domain SPF covers), but DKIM signing on
  `mail.einsbrand.com` is unconfirmed — and an enforcing policy over an unverified
  setup silently spams signup-verification and password-reset mail, which is found
  out from users rather than logs. Publish `none`, read two weeks of reports, then
  raise to `quarantine`. One org-domain record also covers `drift.einsbrand.com`.
  **Remaining:** owner publishes the record in the DNS panel, then
  `nslookup -type=TXT _dmarc.einsbrand.com 8.8.8.8` confirms it. DKIM is a separate
  check — read a `DKIM-Signature:` header off any mail Drift has sent; the selector
  is in `s=`, and if the header is absent the server is not signing.
  *Full detail:* `docs/DEPLOYMENT.md` § DNS records for email deliverability.

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
- [!] **4.5 — Apple Guideline 4.8 constraint**
  Offering Google makes Sign in with Apple **mandatory** on iOS. They ship together or
  neither ships.
  **Rescoped 2026-09-03 by the owner's launch-sequence decision: Android first, iOS
  follows.** Android has no equivalent rule, and its Google client IDs already exist,
  so this **no longer blocks the launch — it blocks only the iOS leg.** That is the
  sequence `docs/SOCIAL_SIGNIN_SETUP.md` §3 already recommended, and taking it means
  Apple's enrolment queue stops holding a finished Android build hostage.
  *Blocked on:* Apple Developer Program enrolment (P.6) — $99/yr, days rather than
  minutes, and an organisation account needs a D-U-N-S number.

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
  **Addendum 2026-09-03 — rotating the key was not enough, and the gap was live.**
  `build.gradle.kts` hardcoded `rootProject.file("key.properties")`, and that file
  points at the **preview** keystore by design. So nothing could select
  `key.release.properties` short of setting all four `DRIFT_ANDROID_*` variables, and a
  plain `flutter build appbundle --release` would have signed with the *preview* key
  and, on upload, bound the app to it permanently — the same unrecoverable outcome
  this item was raised to prevent. Closed: the properties file is now selectable
  (`-Pdrift.signing=release`, or `DRIFT_ANDROID_KEY_PROPERTIES`), every release task
  prints the resolved keystore and alias (never the passwords), and a release signed
  with alias `preview` is **refused** unless `-Pdrift.allowPreviewSigning` is passed.
  *Verified three ways:* default → refuses with the explanation; `-Pdrift.signing=release`
  → `key.release.properties -> app/release-2026.keystore (alias drift-release)`;
  env-var path → the same. `mobile/tool/build_release.sh` uses the env-var path and
  also refuses to build with the `DRIFT_DEV_ACCESS`/`DRIFT_DEV_REFRESH` session-seeding
  defines set, which in a store build would be a shipped authentication bypass.
- [~] **5.2 — Move deployment off the box**
  **Repo half complete 2026-09-03; closes on the workflow's first green run.**
  `.github/workflows/release.yml` builds all three images on a CI runner and pushes
  them to GHCR on any `v*` tag, tagged both with the release tag and an immutable
  `sha-<12>`. `docker-compose.prod.yml` now names an `image:` **and** a `build:` per
  app service, so one file serves both a box that builds for itself
  (`DRIFT_IMAGE_TAG` unset → `:local`, today's behaviour, unchanged) and one that
  pulls what CI already built. Rolling back becomes re-running with the previous
  `sha-` tag — the artifact the entry said did not exist.
  **No third-party actions were added**, keeping 5.3's promise: `docker login`,
  `buildx` and the `GITHUB_TOKEN` are all already on the runner, so the supply-chain
  surface stays at the four SHA-pinned actions 5.3 left it at.
  Also committed the production **`deploy/nginx/drift-name.conf`**, which had lived
  only on the box since 2026-09-02 — config on exactly one host is config nobody can
  review or restore. It is marked as reconstructed and must be diffed against the box.
  *Verified:* `docker compose config` parses · the workflow's shell logic was run
  locally for all three matrix entries and produces the intended `buildx` commands.
  *Not verified, and this is why the item is not closed:* **the workflow has never
  run.** Its first tag push is the proof.
  **Deploying is deliberately not automated.** A CI job holding an SSH key to
  production is a decision with its own blast radius and it is the owner's to make;
  the runbook it would automate is in `docs/DEPLOYMENT.md` § Deploying a published
  image.
- [x] **5.3 — Pin CI actions to commit SHAs**
  **Closed 2026-09-03.** All **8** `uses:` lines across the 4 jobs in
  `.github/workflows/ci.yml` now name an immutable commit instead of a moving tag.
  A major tag like `v6` is a *branch pointer the action's owner can move*; anyone
  who can retag — or who compromises that account — silently changes code running
  with this repository's checkout and a `GITHUB_TOKEN`. A SHA cannot be moved.
  | Action | Was | Pinned to | Release |
  |---|---|---|---|
  | `actions/checkout` (×4) | `@v6` | `d23441a48e516b6c34aea4fa41551a30e30af803` | v6.1.0 |
  | `actions/setup-node` (×3) | `@v6` | `249970729cb0ef3589644e2896645e5dc5ba9c38` | v6.5.0 |
  | `subosito/flutter-action` (×1) | `@v2` | `1a449444c387b1966244ae4d4f8c696479add0b2` | v2.23.0 |
  Each SHA was resolved from the tag through the GitHub API and then **mapped back
  to a precise release tag**, which is why the trailing comment can say `v6.1.0`
  rather than `v6` — a pin nobody can read is a pin nobody will ever update.
  *Verified:* the workflow still parses and all 8 steps resolve to the intended SHAs.
  **The trade this makes, stated plainly:** pinning stops the actions updating *at
  all*, including security fixes, and nothing here will notice. A
  `.github/dependabot.yml` for the `github-actions` ecosystem is the standard
  counterweight — it raises PRs that bump both the SHA and the comment together.
  **Not added**, since it introduces automated PRs and that is the owner's call.
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
- [x] **5.6 — `onboarding.e2e-spec` depends on ambient users** ✨ *closed 2026-09-03*
  **Found by CI once CI could actually run.** The spec asserts the home feed opens
  with `SUGGESTED_OPPONENTS, DEVELOPMENT_RECOMMENDATION, NEWS_HIGHLIGHT`, and its own
  comment claims the first two are *"always reachable for a fully-onboarded user."*
  That is false. `SuggestedOpponentsContributor` returns `[]` when the player search
  finds nobody, and **`prisma/seed.ts` seeds no users at all** — courts, clubs,
  stories and learning content, but zero players. On a clean database the test's own
  account is the only one in the system, so there is no one to suggest.
  **It was passing locally by accident**, on the seven accumulated users in the dev
  database. This is precisely the class of thing a per-run clean database exists to
  catch, and it surfaced the moment one existed.
  **Fixed:** the spec now signs up and completes a second player in `beforeAll`, then
  removes both accounts in `afterAll`. That makes the `SUGGESTED_OPPONENTS` assertion
  true by construction on a clean CI database without perturbing global seed data or
  weakening the home-card coverage. *Verified:* isolated onboarding e2e green, full
  backend e2e **17 suites / 94 tests**, backend unit **47 suites / 579 tests**, and
  `npx tsc -p tsconfig.build.json --noEmit` clean.
- [!] **5.5 — Password policy · egress · CSP**
  **Password policy code complete 2026-09-03.** One shared
  `PasswordPolicyService` now enforces the owner-approved set/change policy everywhere
  a password is hashed: minimum length stays **8** by explicit decision, no
  composition rules, HIBP breached-password screening via k-anonymity, fail-open on
  timeout/network/non-200, disabled under `NODE_ENV=test` and via
  `PASSWORD_BREACH_CHECK_DISABLED` for offline dev. All set/change DTOs cap new
  passwords at **72 bytes/chars** before bcrypt can silently truncate; existing
  passwords keep working until changed. Verified: `npx tsc -p tsconfig.build.json
  --noEmit`, targeted policy/auth specs, and full backend unit suite
  **47 suites / 579 tests**.
  **CSP proven live 2026-09-03 — this half is closed.** The blocker was never the
  headers, it was reaching them: nginx answers an unauthenticated request with its
  own 401 and no app headers at all. Curling the consoles *from inside the box*
  goes straight to the Next servers on `127.0.0.1:3010` and `:3011` and skips the
  auth wall entirely, so no basic-auth password was needed after all. Both consoles
  return the full policy:
  `default-src 'self'` · `script-src 'self' 'unsafe-inline'` (no `unsafe-eval` in
  production) · `frame-ancestors 'none'` · `base-uri 'self'` · `form-action 'self'`
  · `object-src 'none'`, plus `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options: DENY` and `Permissions-Policy`.
  Critically, `connect-src` now reads **`'self' https://drift.einsbrand.com/api`**
  rather than the bare IP. That value is baked in at *image build* time, so proving
  it also required the domain migration: all four URL variables in
  `.env.production` were moved off `135.181.146.130` and both consoles rebuilt.
  A restart alone would not have changed it.
  **Still blocked:** the ingestion **egress restriction** only. `NEWS_FEED_ALLOWED_HOSTS`
  pins the application-level allowlist, but nothing constrains outbound traffic at
  the host, so a compromised dependency could still reach anywhere. That is
  firewall work on the box, not repository work.

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

## Phase 7 — Payments 🟠

- [!] **7.1 — Wire a payments provider**
  **Built 2026-09-03 for clubs; blocked on sandbox credentials.** The launch model was
  decided by the owner: **app users are free at launch** (any later mobile subscription
  must go through Play Billing / StoreKit, because in-app digital goods leave no
  choice), while **clubs pay via IntaSend** in the web console — a business buying
  software outside the app, which neither store's rules reach. Two rails, and they are
  not interchangeable; `docs/PAYMENTS_PLAN.md` records why.
  **The existing seam did not fit and was reshaped rather than bent.** IntaSend is
  *hosted*: it owns the payment interaction and the recurring cycle, we never see card
  details, and outcomes arrive by webhook, not as a return value. The old
  `PaymentProvider` assumed the opposite — that we hold a token and charge it on our
  own schedule — so it became a discriminated union of `DirectPaymentProvider`
  (`mode: 'direct'`, the unchanged sandbox) and `HostedPaymentProvider`
  (`mode: 'hosted'`), with `PaymentsService` branching on `mode` and the compiler
  enforcing that it does. A deployment with no IntaSend key — every dev machine, and
  CI — runs the whole billing surface exactly as before.
  **The subscription is not activated on the redirect**, only when the webhook
  confirms payment. A redirect the payer can abandon is not a payment, and granting
  entitlements on one is how a product gives itself away.
  **Two safety rails, both deliberate:** the API host is *derived from the key prefix*
  (`_test_` → sandbox, `_live_` → live) rather than configured beside it, because two
  settings that must agree is how a test key ends up pointed at the live gateway; and
  the app **refuses to boot with a live key under `NODE_ENV=test`**, because a suite
  that can move real money is not worth the convenience.
  **Stated plainly:** IntaSend authenticates webhooks with a shared `challenge` string
  in the POST body, not a signature over the payload. That is weaker than an HMAC and
  it is the ceiling of what the provider offers. It is compared in constant time,
  never logged, and production refuses to start without it whenever a key is present.
  **Both consoles connected 2026-09-03.** Platform Admin previously had no provider dependency at all, which made three of its actions quietly untrue once real money moved: creating and repricing a plan never reached the provider, "Record refund" only marked our row, and overriding a subscription to CANCELLED left the mandate billing. All three now go through the same `ProviderPlanService` seam Club Admin uses. **Promotions are real and are discounted plans** — a hosted provider bills a fixed amount against a mandate, so a percentage cannot be applied per cycle; applying a promo resolves a second provider plan at the discounted price, mapped once per (plan, promotion) in `provider_plans`. Discounts round down so rounding never favours us over the payer, and a fixed-amount promo in another currency is refused rather than subtracted.
  *Caught by the compiler:* the first cut made `provider_plans` unique on a nullable `promotionId` — Postgres treats NULLs in a unique index as distinct, so it would not have stopped the undiscounted plan being minted twice. A non-null discriminator replaced it.
  *Verified:* backend unit **50 suites / 623 tests** (was 47/579) · e2e **17/95** ·
  `tsc` clean · club-admin builds · `prisma migrate diff` reports **"No difference
  detected"** for migration `20260903200000_intasend_provider_ids`.
  *Caught by its own test:* the provider logged upstream error text verbatim, so a
  gateway echoing the request would have written the secret key into the application
  log. Now redacted, with a test that fails if it regresses.
  **Blocked on:** the live keys pasted into a session transcript on 2026-09-03 must be
  **rotated**, and a *sandbox* key supplied. Closes when one payment completes end to
  end against `sandbox.intasend.com`. No real payment has been made yet.

---

## Parallel — decision, lawyer or purchase

- [!] **P.1 — Terms & Privacy Policy**
  **Code copy updated 2026-09-03; blocked on legal sign-off.** The app no longer ships
  "placeholder copy pending review" as its public legal screen. The launch notice now
  describes shipped behaviour from P.3: the **30-day** recovery window, terminal
  anonymisation, the records deliberately kept in redacted form because they also
  belong to other players or platform integrity, and nightly backups retaining
  pre-erasure data for up to **14 days** until they age out. Still not a lawyer's
  final policy. **Also in scope:** the 18+ posture closed under P.2 was a product
  decision with no legal review behind it — this review is where it gets one.
  **2026-09-03 — this is not only a launch item, it is a Play submission blocker.**
  Play Console → App content requires a privacy policy at a **publicly reachable URL,
  outside the app**, that a reviewer can open in a browser without installing
  anything. Drift ships its policy only as an in-app `LegalScreen`, which satisfies
  none of that. So P.1 has to produce not just reviewed copy but *hosted* copy, and
  until it does the Android listing cannot be completed at all. That moves it from
  "before launch" onto the critical path the Android-first decision just created.
  *Owner:* legal. *Reference:* `docs/GDPR_ERASURE_PLAN.md` §5,
  `docs/AGE_POLICY_DECISION.md`, `docs/PLAY_SUBMISSION.md` §1.1
- [x] **P.2 — Minors / age-gating policy**
  **Accepted 18+ at launch 2026-09-03 — product decision by the owner. No legal
  review was obtained, and none is claimed.** Drift Tennis is treated as
  **18+ at launch** until a reviewed guardian-consent flow
  exists. Password signup requires `acceptedAgePolicy: true`; fresh Google/Apple
  account creation requires the same before a `User` row is created;
  returning/social-link users are not locked out. The database stores
  `agePolicyAcceptedAt`, not date of birth, so the gate avoids collecting extra
  PII. Under-18s therefore should not appear in discovery because they cannot
  create launch accounts through supported account-creation paths. Migration
  `20260903180000_add_age_policy_acceptance` records the consent timestamp on the
  `users` table (column `agePolicyAcceptedAt`); fixed table name from `"User"` to
  `"users"` to match `@@map("users")`, failed local migration resolved, deployed
  clean — 42 migrations, schema up to date. *Owner:* product.
  *Legal basis consulted in-house (background reading, not advice and not a
  sign-off):* FTC COPPA rule for under-13 child data collection; GDPR Article 8
  child-consent rules for information-society services. A lawyer's review of this
  posture belongs in P.1's scope, and this item is closed as a product decision
  without waiting for it. *Decision record:* `docs/AGE_POLICY_DECISION.md`.
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
- [x] **P.4 — Support mailbox** ✨ *closed 2026-09-03*
  **App route wired and mailbox proven 2026-09-03 — closed.** Contact Support
  now uses `DRIFT_SUPPORT_EMAIL`, defaulting to `drift@einsbrand.com`, and the Help /
  Legal copy names it as the route for account recovery, privacy requests, billing,
  safety, and technical issues. **Raised in importance by P.3:** this is still the
  only inbound route for an Article 17 request, and the only way to reach the 30-day
  recovery window — `login` refuses a `DELETED` account, so someone inside the
  window cannot ask from within the app. The remaining proof is operational: owner
  must confirm the mailbox exists and is monitored or forwarded to whoever works the
  platform-admin support queue.
  **2026-09-03 — the mailbox does more than the entry said.** `MAIL_FROM` is
  `Drift Tennis <drift@einsbrand.com>` (`docs/DEPLOYMENT.md`), the same address Help
  and Contact name. So this is not only the inbound support route: it is the
  **reply-to for all six transactional flows** — signup verification, password
  reset, Platform Admin 2FA, staff reset, staff invitations, club setup. Anyone who
  hits reply on a verification mail writes here. Unmonitored, those replies are lost
  in silence, on top of the Article 17 problem.
  **What "confirmed" has to mean** — three checks, not one:
  1. *It receives.* Send a mail from an address outside the domain to
     `drift@einsbrand.com`; confirm it lands in a mailbox a person opens (not a
     discard alias, not an unread catch-all).
  2. *A human is behind it.* Name who reads it and how often. "It forwards
     somewhere" is not an answer unless the somewhere is monitored.
  3. *It reaches the queue.* That person knows an emailed erasure or recovery
     request becomes a ticket via Platform Admin → Support → create ticket
     (`SupportAdminService.createTicket`), which is the only path from an email
     into the tracked queue. Nothing ingests this mailbox automatically.
  **Closed 2026-09-03 — owner ran all three checks and confirmed.** The mailbox
  receives from outside the domain into a box a person opens, a human is behind it,
  and that person knows an emailed erasure or recovery request has to be filed into
  the queue by hand. That was the whole of what this item was blocked on: the code
  side shipped earlier the same day, and no test could ever have proven the
  operational half. *What is deliberately not claimed:* nothing automated watches
  this mailbox, so the guarantee is a human one and it is only as good as that
  person's attention — if the support load grows, ingesting the mailbox into the
  ticket queue is the follow-up, not a re-open of this item.
  **Split out 2026-09-03:** a fourth requirement was recorded here earlier the same
  day — Play also wants a *web* page where deletion can be requested. That is a real
  and still-open Play blocker, and leaving it inside a closed item would hide it
  behind a green tick, so it now stands on its own as **P.7**.
- [!] **P.5 — Load testing**
  **Harness written 2026-09-03; closes when a run is recorded.** `scripts/load/` holds
  a k6 smoke profile (1 VU, zero error tolerance — run it first, so a ramp failure is
  known to be about capacity rather than a broken endpoint) and a ramp to 50 VUs whose
  thresholds are a pass/fail statement rather than decoration: p95 < 1.5 s, errors
  < 1%, non-zero exit on breach.
  **The measurement that matters is not requests per second** but the concurrency at
  which p95 leaves the band, because that is what says whether the launch cohort fits
  on one 3.7 GB host running Postgres, Redis, the API and two Next apps together.
  **Two throttles will skew the result and both are handled or written down.** Login is
  **10/min per IP** (`AUTH_SENSITIVE`), so both scripts log in exactly once in k6's
  `setup()` and share the token — a per-VU login measures the rate limiter and looks
  like total collapse at 11 VUs. Everything else is 300/min per IP, which a
  single-machine ramp reaches before the server's real ceiling; `docs/LOAD_TESTING.md`
  says to either raise it, run from several IPs, or record which limit was actually
  found. A capacity number that silently measured a limiter is worse than none.
  **Run 1 performed 2026-09-03 against `drift.einsbrand.com`** — k6 v2.2.0, one
  client IP. The "never performed" half of this entry is answered; the capacity
  question is not, and the run is what proved why.
  **The smoke failed, and was worth more than the ramp.** Three of five endpoints
  returned **404 "Tennis profile not found"** for `owner@drift.test`: `/home/feed`,
  `/home/summary`, `/players`. The cause is a defect in
  `scripts/staging/bootstrap-accounts.mjs`, not in the test — signup creates
  `tennisProfile: { create: {} }`, but the bootstrap writes the `User` row directly
  and never created one, so the account read as `onboardingStep: COMPLETE` while
  every player-facing endpoint 404'd. It cannot be healed from outside the box:
  every onboarding endpoint `update`s that row rather than upserting it. **Fixed in
  the script** (now an upsert, so a re-run heals an account already in that state),
  but only a re-run on the box makes it true there. *This is exactly the class of
  thing a smoke profile exists to catch, and it ran first by design.*
  **The ramp measured the limiter, not the server.** 1 → 10 → 25 → 50 VUs over
  3m15s: 6,231 requests, **80.59% failed and every failure was a `429`**. Confirmed
  directly: `X-RateLimit-Limit: 300`, 60-second window — the documented
  `THROTTLE_LIMIT` default. About 368 req/min got through; the rest were shed.
  **What it does prove:** the limiter works — a 50-VU flood from one IP was shed
  without the app breaking a sweat, and **latency never degraded at any point**,
  p95 flat at ~216 ms from 1 VU to 50. An authenticated Postgres read costs only
  **~6 ms more** than an endpoint touching no database (`/players/me` p95 220.77 ms
  vs `/health` 214.58 ms), so nearly all of that 216 ms is client-to-Hetzner round
  trip, not server time. Postgres in 768 MB is not the bottleneck at this level.
  **What it does not prove — and why this stays open:** the limiter shed the load
  before it reached the application, so the box was never stressed, **no p95
  crossing exists to report**, and this entry's own closing criterion cannot be
  met. Real users arrive from many IPs and are not bounded this way. Worse, the
  home feed — the expensive fan-out endpoint, and the one capacity actually turns
  on — was never exercised at all, because staging has no onboarded player.
  *Blocked on, both needing the box:* re-run the account bootstrap so the feed
  becomes measurable, and temporarily raise `THROTTLE_LIMIT` (or run from several
  source IPs) and re-run `ramp.js` rather than `ramp-core.js`. Exact commands in
  `docs/LOAD_TESTING.md` § Run 1.
- [~] **P.6 — Apple & Google developer accounts**
  Prerequisites for Phases 4 and 6. Long lead time — start the paperwork early.
  **Google side is largely done:** four OAuth clients exist in project `921637855690`
  (web/server, Android debug, Android preview, iOS) — IDs recorded in
  `docs/SOCIAL_SIGNIN_SETUP.md`. **Still needed for Android launch:** a fifth client
  for the *release* keystore SHA-1 `B1:FF:6E:D1:BE:0F:19:1D:36:CA:18:D5:98:DD:86:5F:3C:46:CE:BF`
  added to `GOOGLE_OAUTH_CLIENT_IDS`, the consent screen moved from Testing to
  Published, and a Play Console developer account.
  **Apple side is untouched** and is the whole of the iOS lead time.
  *Blocks:* the Android release client blocks Google sign-in in a store build;
  Apple enrolment blocks 4.5 and therefore all of iOS.
- [ ] **P.7 — Web account-deletion request page** 🔴 *Play submission blocker*
  **Split out of P.4 on 2026-09-03, when P.4 closed.** Play's account-deletion policy
  asks for **two** routes once an app lets people create accounts: in-app deletion,
  which P.3 shipped, and a **web URL where deletion can be requested without
  installing the app**. Only the first exists.
  It is not paperwork. It is the route for exactly the people who cannot use the
  in-app one: someone who has already uninstalled, and — the case P.3 created —
  someone inside the 30-day recovery window, because `login` refuses a `DELETED`
  account and they therefore cannot ask from inside the app at all.
  **What closes it:** a public page, sensibly at the same host as the P.1 privacy
  policy, naming `drift@einsbrand.com`, saying what happens over the following 30
  days and what is kept in redacted form afterwards, and linked from the Play
  listing. It does not need to be a form — an address and an accurate description of
  the process is enough.
  *Cannot be built from this repository:* it needs hosting, and its copy should match
  whatever P.1's legal review settles on, so the two are best done together.
  *Reference:* `docs/PLAY_SUBMISSION.md` §1.2 · *Owner:* legal + hosting

---

## Critical path

Rewritten 2026-09-03, when the owner chose **Android first, iOS follows**. The old
path routed everything through Apple; it no longer does.

**Android (the launch):**
`P.1 hosted privacy policy` + `P.7 web deletion-request page` → Play listing
→ release-keystore OAuth client → `tool/build_release.sh` → submission

Everything engineering-side for Android is done. **The binding constraint is now
legal and hosting, not code** — Play will not accept a listing without a publicly
reachable privacy policy (P.1) and a web route to request account deletion (P.7),
and neither can be produced from this repository. Both want the same host and their
copy has to agree, so they are one errand rather than two.

**iOS (after):**
`P.6 Apple enrolment` → `4.5 Sign in with Apple` → App Store submission

**Most likely to be underestimated:** P.1 — it reads like paperwork, but it is the
single item standing between a finished Android build and the store. Second, the
IntaSend keys for **7.1**, which have to be rotated before anything can be tested.
