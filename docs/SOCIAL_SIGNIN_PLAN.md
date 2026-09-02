# Phase 4 — Google & Apple Sign-In: Implementation Plan

Status: **4.1–4.4 built and verified 2026-09-02. Only 4.5 remains, and it is
paperwork, not code** — see `docs/SOCIAL_SIGNIN_SETUP.md` for the owner-side
steps. Companion: `LAUNCH_PLAN.md` Phase 4, `LAUNCH_TRACKER.md` items 4.1–4.5.

Two things below were written before the packages were installed and turned out
differently in practice; both are corrected in the code and noted in §3.

This document is the written plan required for multi-edit approval before any code
is written. It exists because three screens currently render "Continue with
Google/Apple" buttons that call `_notYet()` — a shipped bug that advertises a
capability then fails on the same screens people must finish onboarding through.

---

## 0. Decisions required before implementation

| # | Decision | Who | Blocks |
|---|---|---|---|
| 4.2 | Account-linking policy when a Google/Apple email matches an existing password account | Product owner | Backend linking path |
| 4.2 · **decided 2026-09-02** | **Auto-link — but only when both sides are verified** (provider asserts `email_verified` **∧** the existing account has `emailVerifiedAt`). Fallback when the condition is unmet: **prompt-to-link** (the app asks for the existing password, then links). Owner rejected bare auto-link and bare reject. | — | — |
| — | Google Cloud OAuth client IDs (Android SHA-1/SHA-256 of *both* keystores, iOS, web) | Product owner (reuse the existing GCP project that owns `GOOGLE_PLACES_API_KEY`) | 4.3/4.4 Google wiring |
| — | Apple Developer Program membership ($99/yr) + App ID with "Sign in with Apple" + Services ID + key | Product owner, paperwork lead-time | 4.4/4.5 Apple |
| — | Apple private-relay note: Apple returns the name **only on the first authorization** | — | persist it on that first callback |

**4.2 is the only decision that changes backend behavior handed to users.** It cannot
be retrofitted safely after shipping. **Decided 2026-09-02: auto-link when both sides
are verified, with prompt-to-link as the fallback** (see §0).

---

## 1. 4.1 — Schema migration

`backend/prisma/schema.prisma`:

```prisma
enum AuthProvider {
  GOOGLE
  APPLE
}

model SocialIdentity {
  id                String      @id @default(cuid())
  provider          AuthProvider
  providerAccountId String
  userId            String
  email             String?
  name              String? // Apple returns this only on the very first auth
  createdAt         DateTime    @default(now())
  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}
```

`User`:
- `passwordHash String?` (was `String`)
- add `socialIdentities SocialIdentity[]`
- `emailVerifiedAt` already exists and is the "verified" flag the linking policy keys on.

**Read paths that assume a password exists — audited in the same change:**
- `AuthService.login` — `bcrypt.compare(..., user.passwordHash)` throws on `null`; guard → `UnauthorizedException` ("Use Google or Apple to sign in.").
- `AuthService.changePassword` — guard the same way (social-only users get a clear error; a later "set a password" flow is explicitly out of scope here).
- `AuthService.forgotPassword` / `resetPassword` — safe as written (they only *write* the hash); a reset on a social-only account yields a user with both a password and a social identity, which is correct.
- `users.service.ts` privacy redaction writes `passwordHash: 'privacy-request-redacted:…'` — still a string, unaffected.

Migration: new enum + table + `ALTER COLUMN "passwordHash" DROP NOT NULL`. `npx prisma migrate dev` locally, then `prisma migrate deploy` via the existing `deploy.sh` path.
---

## 2. 4.3 — Backend endpoints

**New dependencies:** `google-auth-library@11` (Google ID-token verification) and
**`jose@4`** (Apple JWKS via `createRemoteJWKSet` against
`https://appleid.apple.com/auth/keys`).

> **Do not upgrade `jose` past 4.x.** From 5.0 the package is `"type": "module"` —
> ESM-only — and ts-jest in this repo cannot load an ESM-only dependency. Because
> `oauth.service.ts` is imported by `auth.service.ts`, that failure would take out
> *every* auth spec, not just this module's. The `createRemoteJWKSet`/`jwtVerify`
> API used here is identical across those versions, so the upgrade buys nothing.

**New `backend/src/auth/oauth/` module:**
- `oauth.service.ts` — `verifyGoogleIdToken(idToken, nonce)` (signature, `aud` ∈
  allowed client-ID list, `iss`, expiry, nonce) and `verifyAppleIdentityToken(idToken,
  nonce)` (`iss=https://appleid.apple.com`, `aud` ∈ [Services ID, bundle ID], nonce).
  Never trust a client-supplied email/id.
- **Env:** `GOOGLE_OAUTH_CLIENT_IDS` (comma-separated — Android, iOS, Web each have
  their own), `APPLE_SERVICES_ID`, `APPLE_BUNDLE_ID` — added to `.env.production`
  and `.env.example`, never committed values.

**AuthService additions:**
- `socialSignIn(provider, verifiedClaims)`:
  1. find `SocialIdentity` by (provider, providerAccountId) → return the existing tokens.
  2. else find user by email.
     - none → **create** user `{ email, passwordHash: null, emailVerifiedAt: now,
       verificationStatus: VERIFIED, onboardingStep: BASIC_PROFILE, name from claims }`
       + identity row (persist the Apple name *now*) → issue tokens. New users skip the
       email-verification screen entirely.
     - exists → apply the **4.2 policy**:
       - provider `email_verified` **∧** `user.emailVerifiedAt` → **auto-link**: attach
         identity, issue tokens.
       - otherwise → `409` `{ code: 'EMAIL_LINK_REQUIRED' }` (the fallback); the app
         prompts for the existing password, then calls the link endpoint.
- `linkSocialIdentity(provider, claims, email, password)` — verify the password, attach
  the identity, revoke other sessions, return tokens.

**Controller** (all under the existing `AUTH_SENSITIVE` throttle):
- `POST /auth/oauth/google` `{ idToken, nonce }`
- `POST /auth/oauth/apple` `{ identityToken, nonce }`
- `POST /auth/oauth/link` `{ provider, idToken, nonce, email, password }`

**Tests:** unit — OAuthService with mocked verify + JWKS (valid/expired/wrong-audience/
wrong-iss/nonce-mismatch); AuthService matrix (new user, existing identity, duplicate
email → each policy, login + changePassword with null hash). e2e — stub the verifiers,
drive the full flow over HTTP.

---

## 3. 4.4 — Mobile wiring

**Deps:** `google_sign_in@7`, `sign_in_with_apple@7`, `crypto` (nonce).

> **Two corrections from the installed packages.** Both were assumptions in the
> draft above that the real APIs do not support:
>
> 1. **The Google nonce cannot rotate per attempt.** `google_sign_in@7` takes it
>    in `initialize()`, which its own docs say must be called *exactly once* per
>    process. One nonce is generated per app launch, which binds a token to the
>    launch rather than to a single tap. That is the API's ceiling; Apple's
>    per-request nonce is unaffected and remains the strong path.
> 2. **Apple embeds `sha256(nonce)`, not the raw value.** The client hands Apple
>    the hash and sends us the raw string, and `verifyAppleIdentityToken` hashes
>    before comparing. The plain string comparison in the first backend commit
>    would have rejected every real Apple sign-in.
>
> Also: `sign_in_with_apple` **requires** `webAuthenticationOptions` off Apple
> platforms, so Android needs `DRIFT_APPLE_SERVICES_ID` and
> `DRIFT_APPLE_REDIRECT_URI`, and reports "not available" without them rather
> than throwing.

**Structure note:** the three screens share one `SocialAuthButtons` widget that
owns the entire flow, rather than each screen wiring its own handlers as the
draft implied. Three copies of the cancel/link/route logic would have drifted.

- `auth_repository.dart` — `googleSignIn()` / `appleSignIn()` acquire the provider
  id-token (with a generated nonce) → `POST /auth/oauth/*` → `AuthTokens`; on
  `EMAIL_LINK_REQUIRED` surface the prompt; `linkSocialIdentity(...)`.
- `auth_controller.dart` — `googleSignIn()` / `appleSignIn()` persist tokens +
  `authenticated` (same `_persistAndSetAuthenticated` as today) and expose the
  link-required prompt; `linkWithPassword(...)` completes it.
- **Screens** — replace `_notYet()` on all six buttons:
  `welcome_screen.dart:63,69` · `login_screen.dart:137,143` · `sign_up_screen.dart:128,134`.
  After success: `usersRepositoryProvider.getMe()` then
  `goToOnboardingStep(context, user.onboardingStep)` — already handles a fresh social
  user (step = `BASIC_PROFILE`) landing in onboarding, not an empty home feed.

**Platform config (mostly owner-side):**
- Android: package debug + release key SHA-1/SHA-256 in the GCP OAuth client; the
  `google_sign_in` idToken is only returned when a **web** client ID is configured for
  server auth.
- iOS: `GoogleService-Info.plist`, Sign in with Apple capability + Services ID, bundle
  ID in `APPLE_BUNDLE_ID`.
- Router already routes unauthenticated → welcome; no shell change needed.

**Tests:** widget tests that the buttons invoke the controller; controller test with a
mocked repository covering new-user → `BASIC_PROFILE`, existing identity → straight in,
and link-required → prompt → link.

---

## 4. Sequencing & gates (4.5-aware)

1. **Decision gates now** (§0): 4.2 answer + Google OAuth client IDs + Apple Dev
   account kickoff. Apple paperwork has real lead time — start it the day this is approved.
2. **4.1 schema** → commit + migrate.
3. **4.3 backend Google-first** — fully testable without an Apple account (unit/e2e
   against stubbed verifiers). Commit + deploy.
4. **4.4 mobile Google** — wire the Google buttons; Apple buttons keep a stopgap
   snackbar ("coming soon") only until the Apple client exists.
5. **Apple backend + mobile once the account + client IDs exist** — all six buttons real.
6. **4.5 gate:** iOS ships Google and Apple together (App Store guideline 4.8). No
   iOS-only Google release.

**Estimated total: ~5–7 engineering days** (backend 2–3 d, mobile 2–3 d), plus calendar
time for the owner-side decision/paperwork.

**Out of scope here:** unlinking an identity later, "add a password to a social
account", provider-side session revocation handling, SMS sign-in.

---

## 5. Rollback & risk

- Schema change is additive + one nullable column; rollback = revert commit +
  `migrate deploy` the prior state (column stays nullable — Prisma has no destructive
  down-migration in this repo's flow; acceptable and documented).
- `google-auth-library`/`jose` are pinned deps; no interaction with the 5.4 advisory
  regime (Prisma-tagged findings are unaffected).
- The `409 EMAIL_LINK_REQUIRED` is a new error contract — the mobile client handles it,
  and any raw client receives a clear JSON body rather than a lie.