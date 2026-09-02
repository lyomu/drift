# Phase 6 — Push Notifications: Implementation Plan

Status: **built and verified 2026-09-02. Owner-blocked on the Firebase console
work in §6** · Companion: `LAUNCH_PLAN.md` Phase 6, `LAUNCH_TRACKER.md` 6.1

Three things below changed during implementation; each is corrected in place
and called out where it applies.

The in-app Notification Centre works and 16 call sites already write to it.
Nothing reaches a person who does not have the app open, which removes the core
loop of a match-making product: challenge received, result awaiting
confirmation, round deadline. This plan closes that gap.

---

## 0. What makes this cheaper than it looks

`NotificationsService.create()` is already documented as *"the one entry point
every other module calls"*, and it already checks the recipient's category
preference before writing. Verified: **16 call sites** across matches,
messaging, connections, competitions, ladders, clubs and announcements, all
going through it.

So push delivery hooks into **exactly one function**. No call site changes, and
notification preferences are respected for free — `create()` returns early when
someone has opted out, so an opted-out category can't be pushed either.

The mobile side has a matching piece of luck: `notification_center_screen.dart`
already maps `relatedEntityType`/`relatedEntityId` to a route in `_deepLinkFor`.
Tapping a push should land in the same place as tapping the in-app row, so that
function moves out to be shared rather than reimplemented.

---

## 1. Decisions — settled 2026-09-02

| # | Decision | Outcome |
|---|---|---|
| 6.1a | Firebase project | **Reuse the existing GCP project** — the one holding `GOOGLE_PLACES_API_KEY` and the new OAuth clients. Firebase attaches to an existing project; one project, one bill, one console. |
| 6.1b | APNs auth key (`.p8`) | Owner-side, from the same Apple Developer account as 4.5 — the reason to sequence 6.1 here rather than later. |
| 6.1c | Rollout | **Android first.** Nothing forces these together the way Guideline 4.8 forces Google and Apple sign-in. iOS follows when the APNs key is uploaded. |
| 6.1d | Scope before credentials | **Build backend and mobile together against stubs**, as Phase 4 did — so the day credentials land, it is config only. |

**FCM covers both platforms.** Firebase Cloud Messaging proxies to APNs, so this
is one integration, not two — the only Apple-specific artefact is the `.p8` key
uploaded to the Firebase console.

---

## 2. Backend

### 2.1 Schema — one new model

```prisma
model DeviceToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  platform  DevicePlatform
  createdAt DateTime @default(now())
  lastSeenAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("device_tokens")
}

enum DevicePlatform { ANDROID IOS }
```

`token` is unique rather than `(userId, token)`: a device token belongs to one
installation, and if a second person signs in on that handset the row must
**move**, not duplicate. An upsert on `token` does that in one statement.

### 2.2 `PushService` — modelled on `MailerService`

Deliberately the same shape as `backend/src/mail/mailer.service.ts`, because
that idiom has already proven itself once this month:

- Built from env at construction; **disabled when `FIREBASE_SERVICE_ACCOUNT` is
  absent**, every send a silent no-op. Pre-config behaviour is exactly today's
  behaviour, so this is fail-safe by construction.
- **Sends never throw.** A push outage must not fail the notification write, let
  alone the match confirmation that triggered it. Failures are logged.
- Dependency: `firebase-admin@14` — CommonJS, so no repeat of the `jose`
  problem. **But v14 dropped the legacy `admin.*` namespace** for modular entry
  points: `firebase-admin/app` (`initializeApp`, `cert`, `App`) and
  `firebase-admin/messaging` (`getMessaging`). Worth recording how that was
  caught — the first cut used `admin.credential.cert` and
  `admin.messaging(...)`, the unit suite mocked that same shape and passed
  green, and only `tsc` flagged that the API does not exist. **A mock is only
  as honest as the shape it copies**, which is exactly why the typecheck runs
  alongside the tests rather than after them.

**Dead-token pruning.** FCM answers
`messaging/registration-token-not-registered` for a token that has been
uninstalled or rotated. That response is the only reliable signal a token is
dead, so the service deletes those rows on receipt. Without this the table grows
forever and every send burns quota on addresses that can never receive.

### 2.3 The single integration point

In `NotificationsService.create()`, after the row is written:

```ts
void this.push.sendToUser(userId, title, body, {
  relatedEntityType, relatedEntityId, category,
});
```

Deliberately not awaited: the caller is finishing a match confirmation or a
message send, and neither should wait on Google. Because `PushService` never
throws, the floating promise cannot produce an unhandled rejection.

`relatedEntityType`/`relatedEntityId` travel in FCM's **`data`** payload, which
is what the app reads on tap to route.

### 2.4 Endpoints

Under `JwtAuthGuard`, on the existing notifications controller:

- `POST /notifications/devices` `{ token, platform }` — upsert on `token`,
  claiming it for the calling user.
- `DELETE /notifications/devices/:token` — **called on logout**.

> **Logout must delete the token, and this is the one genuine hazard in the
> feature.** Leave it behind and the next person to sign in on that handset
> receives the previous user's notifications on the lock screen. Treated as a
> correctness requirement, with a test, not as cleanup.
>
> The test earned its place immediately: it caught that `_logout` awaited
> deregistration **unguarded**, so a Firebase or network failure would have
> trapped someone in a session they had asked to leave. Deregistration is now
> best-effort and sign-out proceeds regardless; a token left behind is
> reclaimed by the next sign-in on that device, or pruned when FCM reports it
> retired.

### 2.5 Tests

Unit: `PushService` disabled → no-op and no throw; enabled → one message per
token; FCM error → logged, not thrown; `not-registered` → row deleted.
`NotificationsService` → pushes after a write, and **does not push when the
category preference is off**. E2E: register a device, receive a notification,
delete on logout, with the FCM sender stubbed.

---

## 3. Mobile

**Deps:** `firebase_core`, `firebase_messaging`.

> **`flutter_local_notifications` was dropped.** It would only have covered the
> *foreground* case — Android and iOS both display FCM notifications themselves
> in background and terminated states. A heads-up banner over the app someone is
> already looking at is noise, so foreground messages instead invalidate the
> Notification Centre provider, keeping the bell count live. Fewer moving parts,
> no notification-channel or icon setup, and better behaviour.

- `PushService` — request permission, read the FCM token, register it with the
  backend, and listen to `onTokenRefresh` (tokens rotate; a stale one silently
  stops working).
- **Register after authentication, not at app start** — a token registered
  before login has no user to attach to. Hook into the same
  `_persistAndSetAuthenticated` that password and social sign-in already share,
  so it covers every route into the app.
- **Deregister on logout**, before the local session is cleared.
- **Permissions:** iOS requires an explicit prompt. Android 13+ needs the
  runtime `POST_NOTIFICATIONS` permission and a manifest entry — currently
  absent, so it must be added. Ask *after* the person is signed in and has seen
  what the app does, not on first launch.
- **Tap routing:** lift `_deepLinkFor` out of `notification_center_screen.dart`
  into a shared function and use it for both paths. One mapping, so a push tap
  and an in-app tap can never disagree.
- Handle all three states: foreground (show a local notification), background
  tap, and **terminated** (`getInitialMessage`) — the last is the one usually
  missed, and it is the case that matters most for a re-engagement feature.

**Tests:** repository registers and deregisters against a mocked client; the
shared deep-link mapping covers every `relatedEntityType`; a token refresh
re-registers.

---

## 4. Sequencing

1. Decisions in §1, Firebase project created, `google-services.json` added.
2. Backend schema + `PushService` + endpoints — fully testable with the sender
   stubbed, before any Firebase credential exists.
3. Mobile wiring, Android first — verifiable end to end on a real handset.
4. iOS once the APNs key is uploaded, alongside 4.5's Apple work.

**Estimated: ~2 engineering days** (backend ~1, mobile ~1), plus owner console
time.

**Out of scope:** notification grouping/summaries, quiet hours, per-device
preferences (preferences stay per-account), rich media payloads, and web push.

---

## 6. Owner setup — what turns this on

The code is built, tested and inert. These steps are all that stand between it
and real delivery.

**1. Add Firebase to the existing GCP project.** console.firebase.google.com →
Add project → pick the project that already holds `GOOGLE_PLACES_API_KEY`.
Firebase attaches to it rather than creating a second one.

**2. Register the Android app.** Package name `com.drift.tennis.drift_tennis`
(from `android/app/build.gradle.kts`). Download `google-services.json` to
`mobile/android/app/google-services.json`.

**3. Apply the Google Services Gradle plugin.** Deliberately *not* committed:
with the plugin applied and no `google-services.json` present, the Android
build fails outright. Adding both together keeps `master` buildable in the
meantime.

```kotlin
// android/settings.gradle.kts — plugins { }
id("com.google.gms.google-services") version "4.4.2" apply false

// android/app/build.gradle.kts — plugins { }
id("com.google.gms.google-services")
```

**4. Backend credential.** Firebase console → Project settings → Service
accounts → *Generate new private key*. Put the whole JSON on one line in
`.env.production`:

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...",...}
```

Restart the API — it is read once at construction. The log line
`[PushService] FCM configured` confirms it; absent that, push stays disabled.

**5. iOS, once the Apple Developer account exists (4.5).** Register the bundle
ID `com.drift.tennis.driftTennis`, download `GoogleService-Info.plist` into
`ios/Runner/`, and upload the **APNs auth key** (`.p8`, from Certificates →
Keys) under Firebase → Project settings → Cloud Messaging. Add the Push
Notifications capability in Xcode. FCM handles the rest — there is no separate
APNs integration.

### Verifying

Sign in on a device, then check `device_tokens` has a row. Trigger anything
that notifies — a connection request is easiest — and it should arrive with the
app closed. Tapping it should open the same screen the Notification Centre row
opens.

Until step 4 is done, `[push] Firebase not configured in this build` in the
app log and silence from the server are the **expected** states, not faults.

---

## 5. Risk

- The feature is invisible until credentials exist, exactly like 3.1 before SMTP
  — so "no pushes arriving" during development is the expected state, not a bug.
- FCM quota and delivery are best-effort by design. Push is a **re-engagement**
  path, never the only route to information: everything pushed is already in the
  Notification Centre, which stays the source of truth.
- A device token is personal data tied to a user, so `onDelete: Cascade` on the
  relation matters for the GDPR erasure item (P.3) that is still open.
