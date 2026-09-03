# Google Play submission — what the store asks and what this repo answers

Companion: `LAUNCH_TRACKER.md` (5.1, P.1, P.2, P.3, P.7), `docs/SOCIAL_SIGNIN_SETUP.md`.

Android is the first platform to ship, by decision: Guideline 4.8 makes Sign in with
Apple mandatory on iOS the moment Google is offered, so iOS gates on Apple enrolment
while Android does not. This document covers everything Play asks for that can be
answered from the code, and names the three things that cannot.

---

## 1. Two Play requirements that are not on the tracker

Both are **hard submission blockers**, not launch polish. Neither is visible from the
tracker as it stands, because both were filed as legal or operational items rather than
store requirements.

### 1.1 A publicly hosted privacy policy URL — blocked by P.1

Play Console → App content → Privacy policy requires a **URL that is publicly
reachable, outside the app**. Drift Tennis today ships its policy only as an in-app
`LegalScreen`. That satisfies nothing here: the reviewer must be able to open it in a
browser without installing anything.

So **P.1 is not merely "waiting on a lawyer before launch" — it blocks submission.**
The policy has to be written, signed off, and hosted somewhere stable before the
listing can be completed.

### 1.2 A web URL for account-deletion requests — tracker P.7

Play's account-deletion policy asks for two routes when an app lets people create
accounts:

| Route | State |
|---|---|
| In-app deletion | **Done.** P.3 shipped it — deletion files a request carried out after 30 days, recoverable in the window. |
| A **web** URL where deletion can be requested without installing the app | **Missing.** |

The second exists so someone who has uninstalled can still ask. The mailbox behind it
is confirmed monitored — **P.4 closed 2026-09-03** — but a monitored address is not a
page, and Play wants the page. It matters most for the case P.3 created: `login`
refuses a `DELETED` account, so a person inside the 30-day recovery window cannot ask
from within the app at all.

A page at the same host as the privacy policy, naming `drift@einsbrand.com` and what
happens over the following 30 days, is enough; it does not need to be a form. Track it
as **P.7**, and do it together with §1.1 — same host, and the copy has to agree.

### 1.3 The 18+ posture needs to match the store listing

P.2 accepted **18+ at launch** as a product decision. That has to be stated
consistently in three places or the listing contradicts itself: the content rating
questionnaire, the target-audience section, and the privacy policy copy. Play also
treats a mismatch between a declared audience and observed behaviour as a policy
matter, so the in-app gate (`acceptedAgePolicy` on every account-creation path) is the
thing that keeps the declaration true.

---

## 2. Building the artifact

```bash
cd mobile
bash tool/build_release.sh          # app bundle for Play
bash tool/build_release.sh --apk    # plus a universal APK for sideload testing
```

The script exists because a store build has one unrecoverable failure mode. Play binds
an app to its signing key on the **first** upload and that binding can never be
changed — so an artifact signed with the wrong key either cannot be uploaded, or, far
worse, is accepted and permanently fixes the wrong key as the app's identity.

`android/key.properties` still points at the **preview** keystore on purpose, so
preview builds keep their own identity. `build.gradle.kts` therefore now refuses to
sign a release with alias `preview` unless `-Pdrift.allowPreviewSigning` is passed
explicitly, and prints the resolved keystore and alias on every release task. The
script selects `key.release.properties` via `DRIFT_ANDROID_KEY_PROPERTIES`.

**Verify the signer before uploading — do not trust the flags:**

```bash
keytool -printcert -jarfile build/app/outputs/bundle/release/app-release.aab
```

The SHA-1 must be
`B1:FF:6E:D1:BE:0F:19:1D:36:CA:18:D5:98:DD:86:5F:3C:46:CE:BF`
(`release-2026.keystore`, alias `drift-release`). Anything else — in particular the
retired `0B:B5:B3:E7:…` from the compromised key — means the artifact must not be
uploaded.

### Version numbers

`pubspec.yaml` carries `1.0.0+1`. The `+N` becomes Android's `versionCode`. Play
permanently refuses a code it has already accepted, **including one burned by an upload
that failed review**, so increment it on every artifact handed to the store and never
reuse or decrement it.

### Back up the keystore now

`android/app/release-2026.keystore` and the password in `android/key.release.properties`
are both gitignored and exist only on this machine. Once Play holds the signing key for
a published app, losing them means the app can never be updated again. This is the most
unrecoverable artefact in the project. Back up both, to somewhere that survives this
laptop.

---

## 3. Data safety form

Answers below are derived from the schema and the erasure audit in
`docs/GDPR_ERASURE_PLAN.md` §1, which enumerated what a user's 58 relations actually
hold. Where a row says *not collected*, that is a claim about the code as it stands and
will need re-checking if the data model grows.

### Collected, linked to the user

| Play category | Data type | Where it lives | Why | Optional? |
|---|---|---|---|---|
| Personal info | Name | `User.firstName`, `.lastName` | App functionality — shown to opponents | Required |
| Personal info | Email address | `User.email` | Account management, verification, password reset | Required (unless social-only) |
| Personal info | Phone number | `User.phone` | Account management | Optional |
| Personal info | User IDs | `User.id`, `SocialIdentity.providerAccountId` | Account management | Required |
| Photos | Photos | `User.photoUrl` | App functionality — profile | Optional |
| Location | Approximate location | `TennisProfile` location, court search | App functionality — finding courts and nearby opponents | Optional |
| Messages | Other in-app messages | `Message.body` | App functionality — player-to-player messaging | Optional |
| App activity | App interactions | `savedStories`, `dismissedHomeCards`, `clubPostReactions`, `notifications` | App functionality, personalisation | Required |
| App info | Other | `MatchReflection.notes`, `PadelProfile.goals`, free-text profile fields | App functionality | Optional |
| Financial info | Purchase history | `BillingInvoice`, `PaymentTransaction` | App functionality — **club billing only, in the web console** | N/A for app users |
| Device IDs | Device or other IDs | `DeviceToken.token` | Push notifications | Optional (notification permission) |

### Not collected

Precise advertising ID, health and fitness data as Play defines it, contacts, calendar,
SMS, call logs, installed apps, audio, files. **No advertising or analytics SDK is
present**, so nothing is shared with third parties for advertising, and the "Data
shared with third parties" section is *no* throughout.

Date of birth is **deliberately not collected** — P.2 stores only
`agePolicyAcceptedAt`, a consent timestamp, precisely to avoid taking extra PII to
operate the age gate.

### Security and deletion declarations

- **Encrypted in transit** — yes. TLS terminates at nginx; the app talks HTTPS only.
- **Users can request data deletion** — yes, in-app, plus the web route from §1.2 once
  it exists.
- **Data is deleted or anonymised on request** — anonymised. State this accurately:
  erasure is terminal anonymisation, not row deletion, because a hard delete would
  corrupt the match history and conversations of players who never asked to be erased
  (`docs/GDPR_ERASURE_PLAN.md`, decision P.3c).
- **Backup retention** — nightly dumps hold pre-erasure data for up to **14 days**
  until they age out. Already stated in the in-app copy; keep the hosted policy
  consistent with it.

---

## 4. Permissions, and the disclosure each one triggers

From `mobile/android/app/src/main/AndroidManifest.xml`:

| Permission | Why | Note |
|---|---|---|
| `INTERNET` | API and websocket traffic | No declaration needed |
| `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` | Court search and nearby opponents | **Foreground only.** Play requires a prominent in-app disclosure before the request, and asks you to justify fine location where coarse would do. If coarse is sufficient for court search, dropping fine removes a review question entirely — worth checking before submitting. |
| `POST_NOTIFICATIONS` | Push (Phase 6) | Runtime permission on Android 13+; already handled |

No background-location, no `QUERY_ALL_PACKAGES`, no sensitive permissions requiring a
declaration form.

---

## 5. Content rating and target audience

- **Target audience:** 18 and over, matching P.2. Do not select any child age band —
  doing so pulls in Families policy and a raft of additional requirements the product
  has deliberately not built for.
- **Content rating questionnaire:** the honest answers are *user-generated content*
  (profiles, messages, match reflections, club posts) and *user interaction* (players
  can contact one another). Both are true and both must be declared; UGC additionally
  requires a moderation story, which exists — reporting and blocking are built
  (`PlayerReport`, `Block`, the club-admin moderation surface).
- **No** gambling, no in-app purchases in the mobile app at launch (mobile is free;
  club billing happens in the web console, outside the app), no ads.

---

## 6. Pre-submission checklist

Repo side — done or doable here:

- [x] Release signing selectable and guarded against the preview key
- [x] Version policy recorded
- [x] Release build script with every required `--dart-define`
- [ ] Confirm the artifact's signer with `keytool -printcert` before each upload
- [ ] Decide whether `ACCESS_FINE_LOCATION` is actually needed (§4)

Owner side — nothing in this repo can close these:

- [ ] **Privacy policy hosted at a public URL** (P.1) — blocks submission
- [ ] **Web page for account-deletion requests** (§1.2, tracker P.7) — blocks submission
- [ ] Android OAuth client for the release SHA-1 `B1:FF:6E:…:CE:BF`, and that client ID
      added to `GOOGLE_OAUTH_CLIENT_IDS` on the server
- [ ] Google OAuth consent screen moved from Testing to Published
- [ ] Play Console developer account, listing copy, screenshots, feature graphic
- [ ] Keystore and password backed up off this machine
- [ ] The API rebuilt against `drift.einsbrand.com` rather than the bare IP, so the
      shipped app is not pointing at a URL that only works by fallback
      (`docs/DEPLOYMENT.md`, domain migration note)
