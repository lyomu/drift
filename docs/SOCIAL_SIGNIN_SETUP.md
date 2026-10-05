# Social Sign-In — Provider Setup

Owner-side setup for tracker **4.4** and **4.5**. The code is built and tested.
**Google is fully wired and live** as of 2026-10-02: consent screen published,
all five OAuth clients (including the release keystore) registered, backend
`GOOGLE_OAUTH_CLIENT_IDS` set. **Apple is not** — until its identifiers exist
the backend answers `503` on the Apple OAuth routes and the app's Apple button
shows *"Apple sign-in isn't ready yet"* — which is the correct behaviour, not
a bug.

Companion: `docs/SOCIAL_SIGNIN_PLAN.md` (design), `LAUNCH_TRACKER.md` 4.1–4.5.

---

## The values this project uses

Copy these exactly — a mismatch is the single most common cause of a sign-in
that opens, completes, and then fails on the server.

| What | Value | Where it comes from |
|---|---|---|
| Android package name | `app.driftsports.drift` | `android/app/build.gradle.kts:102` |
| iOS bundle ID | `com.drift.tennis.driftTennis` | `ios/Runner.xcodeproj/project.pbxproj` |
| Debug keystore SHA-1 | `3A:97:43:C1:1F:3E:16:69:32:21:DE:92:53:5A:8C:38:0A:35:29:90` | `~/.android/debug.keystore` |
| Preview keystore SHA-1 | `EC:3A:1F:1D:1F:F3:CD:D1:6C:75:EF:29:D2:97:CF:52:E5:27:2C:66` | `android/app/preview.keystore`, alias `preview` |
| Release keystore SHA-1 (Play **upload** key) | `B1:FF:6E:D1:BE:0F:19:1D:36:CA:18:D5:98:DD:86:5F:3C:46:CE:BF` | `android/app/release-2026.keystore`, alias `drift-release` (rotated 2026-09-03) |
| Play **app signing** key SHA-1 | `35:A1:90:B7:…` (full value: Play Console) | Play Console → Protected with Play → Manage Play app signing → App signing key → SHA-1. OAuth client "Drift Tennis Android Play Signing", added 2026-10-05 |

> **Builds installed from Google Play are re-signed by Play**, not by our
> release key. Google sign-in on a Play install only works if the **app
> signing** key's SHA-1 is registered. Without it, the account picker opens
> and then nothing happens (the failure comes back as a cancel). Every
> Android OAuth client holds one fingerprint, so this is its own client.

SHA-256 equivalents, if a console asks for them:

- Debug — `B8:1B:6D:D4:E8:FD:25:CE:3B:CC:E4:CF:10:C4:CA:FD:4C:DB:22:FD:70:08:C6:C8:F5:20:FA:39:E2:F6:AE:7B`
- Preview — `B9:A5:BB:14:C9:6D:01:89:A1:CC:4B:92:57:FB:B5:0D:05:53:67:1E:2D:C7:06:76:39:A2:CC:4B:3B:7D:2E:53`
- Release — `23:A2:6F:59:0D:19:1C:22:84:83:08:BC:02:B3:DC:8A:0E:A5:60:07:4B:BB:43:C4:05:65:42:9D:8B:81:AD:AF`

> **The original `release.keystore` was retired on 2026-09-03 — tracker 5.1.**
> It had signed a real distributable build (`drift-tennis-release.apk`), and its
> password was hardcoded into `build.gradle.kts` in commit `378780f`, which is
> pushed to GitHub. The file itself was never committed, but a published and
> trivially guessable password (`drifttennis`, the same as the alias) cannot be
> relied on. It now sits as `RETIRED-release-compromised-20260818.keystore` so it
> cannot be picked by accident. **Do not register its fingerprint anywhere.**
>
> The replacement is `app/release-2026.keystore` — RSA 4096, SHA384withRSA, valid
> to 2054, alias `drift-release`, 32-character random password. Credentials live in
> `android/key.release.properties` (gitignored, mode 600).
>
> **Back up that keystore and its password now.** Once Google holds the signing
> key for a published app it can never be changed, so losing both means the app
> can never be updated again. This is the single most unrecoverable artefact in
> the project.
>
> Note `key.properties` still points at **preview**, deliberately — preview builds
> keep their existing identity. Switch to `key.release.properties` (or the
> `DRIFT_ANDROID_*` env vars) only for an actual store build.

To re-derive any fingerprint yourself:

```bash
keytool -list -v -keystore android/app/preview.keystore -alias preview
keytool -list -v -keystore android/app/release-2026.keystore -alias drift-release
keytool -list -v -keystore "$HOME/.android/debug.keystore" -alias androiddebugkey -storepass android
```

On a memory-constrained machine add `-J-Xmx96m -J-XX:+UseSerialGC`; the JVM
otherwise fails to start rather than reporting anything useful.

---

## 1. Google — OAuth client IDs

Use the **existing** Google Cloud project that already owns
`GOOGLE_PLACES_API_KEY`, so billing and ownership stay in one place. Create a
second project only if you want sign-in isolated from Places.

**APIs & Services → OAuth consent screen** first — nothing can be created until
it exists. External user type; app name *Drift Tennis*; a support email; the
`drift.einsbrand.com` domain. **Published 2026-10-02** — the consent screen
moved out of Testing, so sign-in no longer requires each account to be added
as a test user first. **There is no user cap and no verification to do.**

The console shows a "limited to 100 sensitive scope logins until verified"
notice when a client is created. It is boilerplate, printed regardless of the
scopes an app uses, and it does **not** apply here. Google's 100-*user* cap
(distinct accounts that have ever consented, cumulative — not logins) attaches
only to **sensitive** and **restricted** scopes. This app requests
`openid email profile` and nothing else: `authenticate()` in
`social_auth_service.dart` passes no `scopes`, and the backend only verifies
the ID token and reads `sub`, `email`, `given_name`, `family_name` from it —
it never calls a Google API or holds an access token. Basic scopes need no
verification and carry no cap.

> **This changes the day a sensitive scope is added.** A feature like "add
> this match to my Google Calendar" would pull in a sensitive scope, and with
> it the verification requirement *and* the 100-user cap — which bites at 100
> accounts and does not reset. Restricted scopes (Gmail or Drive content) add
> an annual third-party security assessment on top. Neither is a small change;
> treat adding a scope as a launch-blocking decision, not a feature flag.

Then **Credentials → Create credentials → OAuth client ID**, three times:

**a. Web application** — this is the one that matters most, and the one people
skip. Name it something like *Drift Tennis (server)*. You need it even though
there is no web app: `google_sign_in` on Android only returns an **ID token**
— the only thing our backend can verify — when a server client ID is
configured. Without it, sign-in appears to succeed and hands back nothing usable.

**b. Android** — package name `app.driftsports.drift`, plus the SHA-1
of every keystore that will produce a build you sign in from — **debug**,
**preview** and now **release**, all three listed above. A missing fingerprint
fails at the Google sheet with a bare `10:` error, which tells you nothing.

**c. iOS** — bundle ID `com.drift.tennis.driftTennis`. Download the
`GoogleService-Info.plist` it offers and place it at `ios/Runner/`.

### The clients — created 2026-09-02, release client added 2026-10-02

All five exist in project `921637855690`. **Client IDs are public by design** —
they ship inside every build and can be read out of any APK — so they are
recorded here and committed. The Web client's *secret* is a different thing and
**is not used anywhere in this architecture**: tokens are verified against
Google's public JWKS, so there is no code exchange. Leave it in the console.

| Client | ID (prefix `921637855690-`) |
|---|---|
| Web (server) | `mpmeootgo8lnh4qh2k8eggfjfcr5q7ks` |
| Android — debug keystore | `0ljoaisejhja0bfdgkpu0d0sdegdu7sm` |
| Android — preview keystore | `3r6qk5bbvdcm2isoh9u22n8pdcea3vga` |
| Android — release keystore | `qelh0kbj201u5qgisql9vo0298d5a187` |
| iOS | `621pq70ca20pj5b7tafr3r1nequael5f` |

The release-keystore client is registered against SHA-1
`B1:FF:6E:D1:BE:0F:19:1D:36:CA:18:D5:98:DD:86:5F:3C:46:CE:BF` — the rotated key
from 5.1. Register the **new** fingerprint only; the retired key's must never
be added anywhere.

### Where the IDs go

**Backend** — every client that may present a token, comma-separated, in
`.env.production` on the box (and the local `.env`, already set):

```
GOOGLE_OAUTH_CLIENT_IDS=921637855690-mpmeootgo8lnh4qh2k8eggfjfcr5q7ks.apps.googleusercontent.com,921637855690-0ljoaisejhja0bfdgkpu0d0sdegdu7sm.apps.googleusercontent.com,921637855690-3r6qk5bbvdcm2isoh9u22n8pdcea3vga.apps.googleusercontent.com,921637855690-621pq70ca20pj5b7tafr3r1nequael5f.apps.googleusercontent.com,921637855690-qelh0kbj201u5qgisql9vo0298d5a187.apps.googleusercontent.com
```

This list is the **audience check** — what stops a token minted for someone
else's Google client from signing in here. Both Android IDs are listed because
a debug and a preview build present different ones. Restart the API after
editing; the list is read once at construction.

**Mobile** — build-time:

```bash
flutter build apk --release \
  --dart-define=DRIFT_API_BASE_URL=https://api.driftsports.app \
  --dart-define=DRIFT_GOOGLE_SERVER_CLIENT_ID=921637855690-mpmeootgo8lnh4qh2k8eggfjfcr5q7ks.apps.googleusercontent.com \
  --dart-define=DRIFT_GOOGLE_IOS_CLIENT_ID=921637855690-621pq70ca20pj5b7tafr3r1nequael5f.apps.googleusercontent.com
```

Android needs only the **server** (Web) ID — that is what makes Google return
an ID token at all. iOS needs both.

**iOS URL scheme** — already committed to `ios/Runner/Info.plist` as
`CFBundleURLTypes`. It is the iOS client's `REVERSED_CLIENT_ID`, and without it
the Google sheet completes but never returns to the app.

> **The `.plist` downloaded from an iOS *OAuth client* is not
> `GoogleService-Info.plist`.** It carries only `CLIENT_ID`,
> `REVERSED_CLIENT_ID`, `PLIST_VERSION` and `BUNDLE_ID`. The Firebase file adds
> `API_KEY`, `GCM_SENDER_ID`, `GOOGLE_APP_ID` and `PROJECT_ID`, and comes from
> the Firebase console instead. Renaming the OAuth one makes
> `Firebase.initializeApp()` fail on the missing keys, which reads like a code
> bug. Nothing needs the OAuth plist — its one useful value is already in
> `Info.plist` above.

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
--dart-define=DRIFT_APPLE_REDIRECT_URI=https://api.driftsports.app/auth/apple/callback
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
