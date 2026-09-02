# Social Sign-In — Provider Setup

Owner-side setup for tracker **4.4** and **4.5**. The code is built and tested;
none of it does anything real until the identifiers below exist. Until then the
backend answers `503` on the OAuth routes and the app shows *"Google sign-in
isn't configured in this build yet."* — which is the correct behaviour, not a bug.

Companion: `docs/SOCIAL_SIGNIN_PLAN.md` (design), `LAUNCH_TRACKER.md` 4.1–4.5.

---

## The values this project uses

Copy these exactly — a mismatch is the single most common cause of a sign-in
that opens, completes, and then fails on the server.

| What | Value | Where it comes from |
|---|---|---|
| Android package name | `com.drift.tennis.drift_tennis` | `android/app/build.gradle.kts:57` |
| iOS bundle ID | `com.drift.tennis.driftTennis` | `ios/Runner.xcodeproj/project.pbxproj` |
| Debug keystore SHA-1 | `3A:97:43:C1:1F:3E:16:69:32:21:DE:92:53:5A:8C:38:0A:35:29:90` | `~/.android/debug.keystore` |
| Preview keystore SHA-1 | `EC:3A:1F:1D:1F:F3:CD:D1:6C:75:EF:29:D2:97:CF:52:E5:27:2C:66` | `android/app/preview.keystore`, alias `preview` |
| Release keystore SHA-1 | **not yet known** | `android/app/release.keystore` — see the warning below |

SHA-256 equivalents, if a console asks for them:

- Debug — `B8:1B:6D:D4:E8:FD:25:CE:3B:CC:E4:CF:10:C4:CA:FD:4C:DB:22:FD:70:08:C6:C8:F5:20:FA:39:E2:F6:AE:7B`
- Preview — `B9:A5:BB:14:C9:6D:01:89:A1:CC:4B:92:57:FB:B5:0D:05:53:67:1E:2D:C7:06:76:39:A2:CC:4B:3B:7D:2E:53`

> **`release.keystore` does not open with the password in `android/key.properties`.**
> That file points at `preview.keystore`, and the release store uses a different
> password which is not in the repo. You need it before a Play release, and this
> is the same unresolved question as **tracker 5.1**: if `release.keystore` has
> ever signed a distributable build it must be rotated, and after the first Play
> submission the signing key can never be changed. Answer 5.1 before registering
> a release fingerprint, or you may register one you then have to abandon.

To re-derive any fingerprint yourself:

```bash
keytool -list -v -keystore android/app/preview.keystore -alias preview
keytool -list -v -keystore "$HOME/.android/debug.keystore" -alias androiddebugkey -storepass android
```

---

## 1. Google — OAuth client IDs

Use the **existing** Google Cloud project that already owns
`GOOGLE_PLACES_API_KEY`, so billing and ownership stay in one place. Create a
second project only if you want sign-in isolated from Places.

**APIs & Services → OAuth consent screen** first — nothing can be created until
it exists. External user type; app name *Drift Tennis*; a support email; the
`drift.einsbrand.com` domain. You can stay in "Testing" mode with your own
accounts as test users; **publishing is only required before public launch**,
and the basic email/profile scopes need no verification review.

Then **Credentials → Create credentials → OAuth client ID**, three times:

**a. Web application** — this is the one that matters most, and the one people
skip. Name it something like *Drift Tennis (server)*. You need it even though
there is no web app: `google_sign_in` on Android only returns an **ID token**
— the only thing our backend can verify — when a server client ID is
configured. Without it, sign-in appears to succeed and hands back nothing usable.

**b. Android** — package name `com.drift.tennis.drift_tennis`, plus the SHA-1
of every keystore that will produce a build you sign in from. Add the **debug**
and **preview** fingerprints above now; add release once 5.1 is answered. A
missing fingerprint fails at the Google sheet with a bare `10:` error.

**c. iOS** — bundle ID `com.drift.tennis.driftTennis`. Download the
`GoogleService-Info.plist` it offers and place it at `ios/Runner/`.

### Where the IDs go

**Backend** — every client ID that may present a token, comma-separated, in
`.env.production` on the box (and your local `.env`):

```
GOOGLE_OAUTH_CLIENT_IDS=<web>.apps.googleusercontent.com,<android>.apps.googleusercontent.com,<ios>.apps.googleusercontent.com
```

This list is the **audience check** — it is what stops a token minted for
someone else's Google client from signing in here. List all three; the token's
`aud` is whichever client produced it.

**Mobile** — build-time, never committed:

```bash
flutter build apk --release \
  --dart-define=DRIFT_API_BASE_URL=https://drift.einsbrand.com/api \
  --dart-define=DRIFT_GOOGLE_SERVER_CLIENT_ID=<web>.apps.googleusercontent.com \
  --dart-define=DRIFT_GOOGLE_IOS_CLIENT_ID=<ios>.apps.googleusercontent.com
```

Android needs only the **server** (web) ID; iOS needs both. Restart the API
after editing `.env.production` — client IDs are read once at construction.

---

## 2. Apple — Developer Program, App ID, Services ID, key

**Start this before you need it.** Enrolment is $99/yr and takes days, not
minutes — an organisation account also needs a D-U-N-S number, which can take
longer than everything else here combined. This is the long pole in Phase 4.

Once enrolled, in **Certificates, Identifiers & Profiles**:

1. **App ID** — `com.drift.tennis.driftTennis`, with the **Sign in with Apple**
   capability enabled.
2. **Services ID** — a separate identifier (convention:
   `com.drift.tennis.driftTennis.service`). Only needed for web/Android flows;
   create it now so the backend audience list is complete.
3. **Key** — a new key with Sign in with Apple enabled, grouped under the App
   ID. **The `.p8` downloads exactly once.** Store it where a lost copy is
   recoverable, because a lost one means generating a new key.

In Xcode, add the **Sign in with Apple** capability to the Runner target.

Backend `.env.production`:

```
APPLE_BUNDLE_ID=com.drift.tennis.driftTennis
APPLE_SERVICES_ID=com.drift.tennis.driftTennis.service
```

Mobile: **iOS needs no build flag** — the flow is native once the capability is
on the target. **Android does**, because Apple has no native Android SDK and the
plugin falls back to a web flow:

```bash
--dart-define=DRIFT_APPLE_SERVICES_ID=com.drift.tennis.driftTennis.service \
--dart-define=DRIFT_APPLE_REDIRECT_URI=https://drift.einsbrand.com/api/auth/apple/callback
```

Without them the Apple button on Android reports *"Apple sign-in isn't
available on this device yet"* rather than throwing — which is the intended
state until the Developer account exists.

The backend verifies Apple tokens against Apple's public JWKS, so it needs no
key or secret — only these audiences. The `.p8` is for server-to-server
notifications, which this phase does not use.

### Two Apple behaviours that cannot be worked around

- **The name comes back only on the very first authorization.** Never again,
  for that Apple ID, even after uninstalling. The app forwards it and the
  backend persists it on the creating write — but if you delete a test user
  server-side and sign in again, the name will be gone. Expect that while testing.
- **Private relay.** People may choose *Hide My Email*, giving a
  `@privaterelay.appleid.com` address. That is a real, deliverable address, but
  it is not the one they use elsewhere, so it will not match an existing
  password account and they will land as a new user. This is correct, and worth
  knowing before it looks like a bug.

---

## 3. The App Store constraint — read before scheduling

**Guideline 4.8 makes Sign in with Apple mandatory on iOS for any app offering
another third-party sign-in such as Google.** Google and Apple are therefore not
independent items. Shipping Google alone on iOS means rejection.

Android has no such rule, so the honest sequence is:

1. Google client IDs → Android ships and is testable immediately.
2. Apple paperwork in parallel, starting now.
3. iOS ships only once both work.

---

## 4. Verifying it works

1. `GOOGLE_OAUTH_CLIENT_IDS` set and the API restarted.
2. Build with the dart-defines above and sign in from Welcome, Login, or Sign-up.
3. Expect: a brand-new Google user lands on **Basic Profile**, already verified,
   never on the verification screen.
4. To exercise the linking path deliberately, sign up with email/password,
   *don't* verify it, then sign in with Google using the same address — you
   should get the password prompt, and after it both methods work.

If sign-in returns 503, the backend has no client IDs. If the sheet opens and
then errors with `10:`, the Android fingerprint is missing. If it completes but
the app reports no identity token, the **server client ID** is missing from the
build.
