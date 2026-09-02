# Drift Tennis — Launch Plan, in Priority Order

**Date:** 2026-09-02
**Companion to:** `LAUNCH_READINESS.md` (the gap analysis this plan sequences)

Ordered so that each phase unblocks the next. Within a phase, order matters less.
"Blocked on" names what has to exist before engineering can start — several items are
waiting on a decision or a purchase, not on effort.

**Legend** — 🔴 blocks launch · 🟠 blocks real users · 🟡 needed soon after · ⚪ deferred

---

## Phase 0 — Done 2026-09-02

| # | Item | Evidence |
|---|---|---|
| ✅ | **TLS renewal reload hook** | `renew_hook` added; `--run-deploy-hooks` produced a real `Reloaded nginx.service` at 09:07:06 |
| ✅ | **Nightly backups + rehearsed restore** | `scripts/ops/drift-backup.sh`; verify run matched live exactly (94 tables, 7 users) |

---

## Phase 1 — Stop the bleeding 🔴

Operational gaps that cause outage or data loss. Days of work, not weeks.

### 1.1 Offsite backup copy 🔴
Backups live on the same disk as the database, so they do not survive disk loss —
the failure they mainly exist for. Both candidate commands (Hetzner Storage Box
rsync, S3 sync) are already written at the foot of `scripts/ops/drift-backup.sh`.
**Blocked on:** a destination + credentials. **Effort:** ~30 min once provided.

### 1.2 Monitoring and alerting 🔴
Nothing watches API health, error rate, container restarts, or certificate expiry.
The first alert today is a user complaining. The box already reports the disk guard
to `ci.einsbrand.com`, so there is an existing Jenkins path to hang alerts off rather
than standing up new infrastructure.
**Minimum viable:** uptime check on `/api/health`, cert-expiry check, container-restart
alert, disk threshold (exists). **Effort:** 1 day.

### 1.3 Secrets off the filesystem 🔴
`JWT_SECRET`, `DATABASE_URL` and friends sit in `/srv/drift/app/.env.production` with
no rotation procedure and no audit of who read them. `SECURITY_REVIEW.md` A02/P0.
**Effort:** 1 day.

---

## Phase 2 — The domain, and everything gated behind it 🔴

### 2.1 Acquire and point the domain 🔴
`DEPLOY_HANDOFF_PROMPT.md` calls this *"the one open blocker"*. Everything is pinned
to a bare IP: nginx vhosts, the mobile app's compiled `DRIFT_API_BASE_URL`, the
staging scripts, and the TLS cert.
**Blocked on:** the owner providing the domain. **This is the highest-leverage single
action in the whole plan** — it unblocks 2.2, 2.3, all of Phase 3, and Phase 4.

### 2.2 Reissue TLS against real names 🔴
Replaces the ~7-day short-lived IP certificate with a normal 90-day cert. Depends on 2.1.

### 2.3 Email deliverability records 🔴
SPF, DKIM, DMARC. Without these, provider email lands in spam — which silently
undermines Phase 3 even after the provider is wired. Depends on 2.1.

---

## Phase 3 — Email provider: the largest functional gap 🟠

### 3.1 Choose and wire an email/SMS provider 🟠
No `nodemailer`, SendGrid, SES or Twilio dependency exists. The API returns
`PENDING_PROVIDER`. Everything below is **broken for a real user today**:

| Flow | Current state |
|---|---|
| Signup email verification | dev-only path; the code is suppressed in production |
| Password reset | no delivery — **accounts are unrecoverable** |
| Platform Admin 2FA | needs an operator to run `set-2fa-code.mjs` against the DB |
| Club member invitations | `INVITED` status exists, nothing is sent |
| Support ticket replies | stored, never delivered |

**This single dependency gates account recovery and staff login.** It is the first
thing to do after the domain.
**Blocked on:** provider decision + account. **Effort:** 2–3 days once chosen.

---

## Phase 4 — Google & Apple sign-in 🟠

**The UI already exists and is lying to users.** "Continue with Google" and "Continue
with Apple" buttons are rendered on three screens — `login_screen.dart:137,143`,
`sign_up_screen.dart:128,134`, `welcome_screen.dart:63,69` — and every one calls
`_notYet()`, which shows a snackbar reading *"Google sign-in isn't available yet."*
That is worse than having no buttons: it advertises a capability, then fails.

This is also the **single highest-impact conversion fix in the plan**. Social sign-in
typically lifts signup completion materially, and it sidesteps the entire
email-verification round trip that Phase 3 is needed for.

### 4.1 Schema: make password optional and add an identity table 🟠
Two blocking facts in the current model:

- **`passwordHash String` is non-nullable** (`schema.prisma`). A Google-only user has
  no password, so this must become `String?`. Every read path that assumes a password
  exists needs auditing — particularly login, password reset, and change-password.
- **There is no social identity table.** No `Account`, `OAuth`, or `Identity` model
  exists. One is needed to store `(provider, providerAccountId, userId)` with a unique
  constraint on `(provider, providerAccountId)`, so a person can attach both Google
  and Apple to one account rather than creating duplicates.

**Effort:** ~1 day including the migration.

### 4.2 Decide the account-linking policy 🟠 — decision, not code
`User.email` is `@unique`. So when someone signs in with Google using an email that
already has a password account, one of three things must happen:

1. **Auto-link** — convenient, but an attacker who controls an unverified email at the
   provider could take over the account. Only safe when the provider asserts a
   verified email *and* the existing account's email is itself verified.
2. **Reject with guidance** — "this email already has an account, sign in with your
   password" — safest, most friction.
3. **Prompt to link** after re-authenticating with the password — best balance.

**Recommendation: option 3, with option 1 permitted only when both sides are
verified.** This must be decided before implementation; it is not a detail that can be
retrofitted safely.

**Apple has a wrinkle:** Apple's private relay (`@privaterelay.appleid.com`) means the
email may not match the person's real address, and **Apple returns the name only on
the very first authorization** — never again. If it is not persisted on that first
callback it is gone permanently.

### 4.3 Backend: token verification endpoints 🟠
Add `POST /auth/oauth/google` and `POST /auth/oauth/apple`, each accepting an identity
token from the client, verifying it server-side, and returning the same access/refresh
pair the password path issues.

- **Google:** verify the ID token signature, `aud` (your client IDs — note iOS,
  Android and Web each have their own), `iss`, and expiry. Library: `google-auth-library`.
- **Apple:** verify against Apple's JWKS, check `aud` (your Services ID / bundle ID)
  and `iss`. Library: `jose`.

**Never trust a client-supplied user id or email** — only what the verified token
asserts. Reuse the existing refresh-token rotation rather than inventing a second
session mechanism.
**Effort:** 2–3 days including tests.

### 4.4 Mobile: wire the existing buttons 🟠
Add `google_sign_in` and `sign_in_with_apple` to `mobile/pubspec.yaml`, replace
`_notYet()` on all three screens, and route new social users into the existing
onboarding flow — a Google user still has no tennis profile, so they must land at
`OnboardingStep.BASIC_PROFILE`, not a broken empty home feed.

**Platform config required:** Google needs OAuth client IDs per platform plus the
Android SHA-1/SHA-256 fingerprints of *both* the debug and release keystores. Apple
needs an Apple Developer account, a Services ID, and a key.
**Effort:** 2–3 days. **Blocked on:** Apple Developer account (see 4.5).

### 4.5 App Store constraint — read before scheduling 🟠
**Apple App Store Guideline 4.8 makes Sign in with Apple mandatory** for any app that
offers third-party sign-in such as Google. So Google and Apple are **not independent
items** — shipping Google alone on iOS means rejection. They ship together, or
neither ships on iOS.

This also pulls the **Apple Developer Program membership ($99/yr)** onto the critical
path, and it interacts with the Android key question in Phase 5.

---

## Phase 5 — Production hygiene 🟡

### 5.1 Android release key — answer before any store submission 🟡
Two keystores exist: `preview.keystore` (currently referenced by `key.properties`) and
`release.keystore`. Both are correctly gitignored. `SECURITY_REVIEW.md` P0 requires
rotating the release key **if it has ever protected a distributable build**. That
question is still unanswered — and it becomes **unanswerable** once a key signs a Play
Store release, because the signing key can never be changed afterwards.

### 5.2 Move deployment off the box 🟡
CI builds and tests but has **no deploy job**; a human SSHes in and builds images on
the production host, competing with the live API for 3.7 GB of RAM, with no artifact
to roll back to. Build in CI, push an image, deploy by pulling it.

### 5.3 Pin CI actions to commit SHAs 🟡
`actions/checkout@v6`, `actions/setup-node@v6`, `subosito/flutter-action@v2`. A
retagged action executes with repository access. A08/P1.

### 5.4 Dependency advisories 🟡
Four high findings, all via Prisma: `deepmerge-ts` (stack exhaustion) and `mysql2`
(auth downgrade leaking plaintext credentials). **Do not run `npm audit fix --force`** —
it downgrades to Prisma 6.19.3, a breaking change. The review recorded three; there are
now four, so this is drifting. `mysql2` is unused here (Postgres), which lowers real
exposure but will not satisfy a security questionnaire.

### 5.5 Password policy 🟡
Bare `MinLength(8)`, no complexity rule, no breached-password screening. A07.
Note Phase 4 reduces how many users this applies to.

### 5.6 Ingestion egress restriction · CSP audit 🟡
A10's remaining infrastructure item, and confirming nginx does not strip or contradict
the consoles' own security headers.

---

## Phase 6 — Push notifications 🟡

No Firebase/FCM/APNs dependency. The in-app Notification Centre works, but nothing
reaches a user without the app open — which removes the core loop of a matchmaking
product: challenge received, result awaiting confirmation, round deadline passing.

Sequence this **after** Phase 4: both need the Apple Developer account and the Android
signing decision, so doing them adjacently avoids paying that setup cost twice.

---

## Phase 7 — Payments ⚪ *(only if launch has a paid tier)*

No Stripe/Paystack/Flutterwave/M-Pesa dependency. Schema and services are
deliberately provider-neutral, and Platform Admin now has plans, promotions and
sponsor placements seeded — but no money can move. **Blocker only if the launch tier
is paid.** If launch is free, defer this entirely.

---

## Runs in parallel — not on the engineering critical path

These need a decision, a lawyer, or a purchase. Start them now; they have long lead
times and none of them are blocked by the phases above.

| Item | Why it cannot wait |
|---|---|
| **Terms & Privacy Policy** | `legal_screen.dart:13,22` literally reads *"This is placeholder copy pending a full legal review."* |
| **Minors / age-gating policy** | No age gate exists. A tennis product attracts under-18s → COPPA / GDPR-K, guardian consent, and whether minors appear in player discovery at all |
| **GDPR erasure** | `AccountStatus.DELETED` is a soft delete; it does not cascade or anonymise, so a real erasure request cannot be honoured |
| **Support mailbox** | Help/Contact is placeholder with no monitored address behind it |
| **Load testing** | Never performed. One 3.7 GB host runs Postgres, Redis, the API and two Next apps |
| **Apple Developer + Google Cloud accounts** | Prerequisites for Phase 4 and Phase 6 — start the paperwork early |

---

## Known deferred product gaps ⚪

Not defects; explicitly scoped out in `PROGRESS.md`.

- **Fine-grained club roles** — COACH / CONTENT_MANAGER / COMPETITION_MANAGER /
  READ_ONLY are currently *functionally identical*. Worth flagging: the UI shows roles
  that imply access control which does not exist. Same class of problem as the social
  buttons — the interface promises more than the system does.
- Club Admin learning-content authoring (schema + API exist, frontend deferred)
- Coach scheduling & lesson booking (directory exists)
- Double-elimination brackets · events prize handling
- Match Reflection skill dimension (needs a schema change)
- Achievement expansion · Google Places enrichment (blocked on a billed key)

---

## The critical path, in one line

**Domain → email provider → Google/Apple sign-in → store submission.**

Everything else is either already done, parallelisable, or deferrable. The two items
most likely to be underestimated are the **Apple 4.8 constraint** (Google alone means
iOS rejection) and the **Android key rotation question** (unanswerable after first
release).
