# Owner actions — everything that cannot be done from this repository

Ordered by what blocks the Android launch. Each item names the command or console
step that closes it, and what "done" looks like, so nothing here closes on
somebody's impression that it probably works.

Companion: `LAUNCH_TRACKER.md` for the reasoning behind each.

---

## 0. Rotate the IntaSend keys — BEFORE the app is published

A live secret key and its publishable key were pasted into a session transcript
on 2026-09-03. Both are compromised.

**The owner decided on 2026-09-03 to keep using that live key for now and rotate
it before publishing the app.** That decision is recorded here rather than
argued with — but it is a debt with a deadline, and this is the deadline.

Until it is rotated, anyone with access to that conversation's logs can charge,
refund or move money on the IntaSend account.

1. IntaSend dashboard → API keys → revoke **both** the live secret and
   publishable keys, and re-issue.
2. Install the new secret key on the box:
   ```
   # /srv/drift/app/.env.production
   INTASEND_SECRET_KEY=ISSecretKey_live_…
   ```
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate api
   ```
3. Confirm the old key is dead:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" \
     -H "Authorization: Bearer <OLD KEY>" \
     https://payment.intasend.com/api/v1/subscriptions-plans/
   ```
   **401 means revoked. 200 means it still works and the debt is unpaid.**

**Done when:** the old key returns 401 and the API logs
`IntaSend configured against https://payment.intasend.com (LIVE key)` after the
restart.

A sandbox key (`ISSecretKey_test_…`) is still worth having for `backend/.env`
locally — the app refuses to boot with a live key under `NODE_ENV=test`, on
purpose, so tests cannot move real money.

---

## 0b. Configure Paddle — blocks USD club billing

Club billing now has two rails: IntaSend for KES (and five other African
currencies) and Paddle for USD, routed automatically by a plan's currency —
see `docs/PAYMENTS_PLAN.md`. The code is wired end to end; nothing charges
real money until this is done, because `PADDLE_API_KEY` unset means USD plans
have no provider to route to at all.

1. Sign up at paddle.com and, from the **Sandbox** dashboard, generate an API
   key (Developer Tools → Authentication) and a Notification Destination
   (Developer Tools → Notifications) scoped to at least
   `transaction.completed` and `transaction.payment_failed`. Note the
   destination's signing secret.
2. Point that Notification Destination's URL at
   `https://drift.einsbrand.com/api/payments/webhooks/paddle`.
3. Set, in `backend/.env` first:
   ```
   PADDLE_API_KEY=<sandbox key>
   PADDLE_WEBHOOK_SECRET=<notification destination secret>
   ```
   (`PADDLE_ENVIRONMENT` stays unset — sandbox is the default.)
4. In the Paddle dashboard under Checkout settings, set the **default payment
   link** / post-checkout destination to `https://drift.einsbrand.com/billing`.
   Unlike IntaSend, Paddle has no per-request return URL — this account-wide
   setting is the only place it's configured.
5. Run a club through the USD checkout end to end against
   `sandbox-api.paddle.com` and confirm the webhook marks the invoice PAID.
6. Only then repeat steps 1–2 against Paddle's **live** dashboard, and put
   those credentials plus `PADDLE_ENVIRONMENT=production` on the production
   box.

**Done when:** a club can subscribe to a USD plan in the sandbox, land back on
`/billing`, and see the plan go ACTIVE — then the same in production with a
live key.

## 0c. Replace the placeholder club plan prices — blocks real revenue

`CLUB_PRO_USD` / `CLUB_PRO_KES` and `CLUB_ELITE_USD` / `CLUB_ELITE_KES` were
seeded with placeholder prices and entitlement copy so the hybrid billing flow
had something real to check out against (`docs/PAYMENTS_PLAN.md` → "Plan
data"). Nobody has priced these yet.

**Done when:** Platform Admin → Commercial → Plans shows real prices and
entitlement bullets for all four rows, and both currency variants of each
tier were repriced together — Platform Admin's "edit a plan's price" pushes
the change to whichever provider that row belongs to, but the USD and KES
rows are separate rows and each needs its own edit.

---

## 1. Host the privacy policy — blocks Play submission

Play Console will not accept a listing without a privacy policy at a **public
URL** a reviewer can open in a browser. The app ships the copy only on an in-app
screen, which does not count. This is tracker **P.1** and it is now the single
biggest thing standing between a finished Android build and the store.

**Done when:** a URL returns the policy to a logged-out browser, and its content
matches what the app actually does — 30-day recovery, terminal anonymisation,
records kept in redacted form because they also belong to other players, and
nightly backups holding pre-erasure data for up to 14 days.

## 2. Publish an account-deletion request page — blocks Play submission

Play requires a **web** route to request deletion, for people who have
uninstalled. In-app deletion alone is not sufficient. Tracker **P.7**.

The mailbox behind it is now confirmed (see below), but a monitored address is not
a page. Do this at the same time as §1 — same host, and the copy has to agree.

**Done when:** a public page names `drift@einsbrand.com`, explains the 30-day
window and what is kept in redacted form afterwards, and is linked from the Play
listing.

## 3. ~~Confirm the support mailbox is monitored~~ — tracker P.4, **done 2026-09-03**

Closed: the owner ran all three checks — the mailbox receives from outside the
domain into a box a person opens, a human is behind it, and that person knows an
emailed erasure or recovery request has to be filed into the queue by hand via
Platform Admin → Support → create ticket.

**Worth keeping in view rather than forgetting:** nothing automated watches this
mailbox, so the guarantee is a human one. It is also the reply-to for all six
transactional mail flows, so replies to verification and password-reset mail land
here too. If the support load grows, ingesting it into the ticket queue is the
follow-up — not a re-open of P.4.

---

## 4. Google Cloud — release OAuth client

```
Console → APIs & Services → Credentials → Create OAuth client ID → Android
  package    com.drift.tennis.drift_tennis
  SHA-1      B1:FF:6E:D1:BE:0F:19:1D:36:CA:18:D5:98:DD:86:5F:3C:46:CE:BF
```

Register the **new** fingerprint only. The retired `0B:B5:B3:E7:…` must never be
added anywhere. Then append the new client ID to `GOOGLE_OAUTH_CLIENT_IDS` in
`.env.production` and restart the API — the list is read once at construction.

Also move the OAuth consent screen from **Testing** to **Published**; the basic
email/profile scopes need no verification review.

**Done when:** a release-signed build completes Google sign-in and receives
tokens, rather than a bare `10:` error (missing fingerprint) or a 503 (client ID
missing from the server list).

## 5. Back up the release keystore — irreversible if skipped

`mobile/android/app/release-2026.keystore` and the password in
`mobile/android/key.release.properties` exist **only on this laptop**, and both
are gitignored. Once Play holds the signing key for a published app it can never
be changed: losing these means the app can never be updated again.

**Done when:** both are stored somewhere that survives this machine.

---

## 6. Publish the DMARC record — tracker 2.3

The record is written out in `docs/DEPLOYMENT.md` § DNS records for email
deliverability. Add to the `einsbrand.com` zone:

```
_dmarc  TXT  3600  v=DMARC1; p=none; rua=mailto:drift@einsbrand.com
```

**Done when:**

```bash
nslookup -type=TXT _dmarc.einsbrand.com 8.8.8.8
```

returns it. Then read two weeks of reports before raising to `p=quarantine`.

## 7. Offsite backup destination — tracker 1.1

Backups live on the same disk as the database, so they do not survive the disk
failure they exist for. The rsync step is already written and guarded at the foot
of `scripts/ops/drift-backup.sh`; a dedicated key exists at
`/root/.ssh/drift-storagebox`.

Create a Hetzner Storage Box (a *different product* from the Cloud Server), add
that public key, set `STORAGE_BOX_HOST`/`STORAGE_BOX_USER` in the cron entry.

**Done when:** a `VERIFY=1` run leaves a dump on the Storage Box.

## 8. Rebuild against the domain — closes the 5.5 CSP proof

The box's `.env.production` still carries `135.181.146.130` in its four URL
variables, and **both consoles bake that origin into their bundle and their CSP
`connect-src` at build time**. Nothing is broken today because nginx still serves
the IP vhost, but the shipped app should not depend on a fallback.

Move `PUBLIC_API_URL`, `PLATFORM_ADMIN_WEB_URL`, `CLUB_ADMIN_URL` and
`CORS_ALLOWED_ORIGINS` to `drift.einsbrand.com`, then rebuild. Afterwards:

```bash
curl -I -u drift-preview:<password> https://drift.einsbrand.com/platform/
```

**Done when:** that returns the app's `Content-Security-Policy` header naming
`https://drift.einsbrand.com/api` — an unauthenticated request returns nginx's
own 401 with no app headers, which is why the credentials are needed.

## 9. Run the load test — tracker P.5

`docs/LOAD_TESTING.md`. Smoke first, then the ramp, watching `docker stats`.

**Done when:** the VU count at which p95 crossed 1.5 s is written down, along
with whether the 300/min rate limiter was in play — a capacity number that
silently measured a limiter is worse than none.

---

## 10. Apple Developer Program — the whole iOS leg

$99/yr, days not minutes, and an organisation account needs a D-U-N-S number.
Steps once enrolled are in `docs/SOCIAL_SIGNIN_SETUP.md` §2: App ID with Sign in
with Apple, a Services ID, a key (the `.p8` downloads exactly once), and the
capability added to the Runner target in Xcode.

Android does not wait for this.
