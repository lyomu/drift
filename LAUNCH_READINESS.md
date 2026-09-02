# Drift Tennis — Launch Readiness & Gap Report

**Date:** 2026-09-02 (updated same day — P0 #1 and #2 actioned)
**Scope:** everything between today's IP-only staging deployment and a public production launch.
**Method:** read of `SECURITY_REVIEW.md`, `PROGRESS.md`, `DEPLOY_HANDOFF_PROMPT.md`,
`docs/DEPLOYMENT.md` and `foundation/`, cross-checked against the running code and a
live inspection of the staging box (135.181.146.130).

Findings marked **[verified]** were confirmed against the running system during this
review. Findings marked **[doc]** are carried from existing documents and were not
independently re-tested.

---

## Verdict

The product is **functionally broad and materially complete** — the three surfaces
all work end to end, and staging now carries real data in every section. What stands
between here and launch is **not feature work**. It is, in order:

1. Six operational gaps that would cause an outage or data loss in production.
2. Five external provider decisions that are currently stubbed and block real users.
3. A legal/compliance set that cannot be resolved by engineering alone.

`SECURITY_REVIEW.md` records a **conditional NO-GO for public production launch**
(2026-08-25, updated 2026-08-29). That verdict still stands, and nothing in this
review overturns it.

**The single most important thing to understand:** the current deployment is a
staging preview on a bare IP with basic-auth in front of the consoles. It was never
intended to be public, and several of the gaps below exist *because* that was the
deliberate choice.

---

## P0 — Blockers. These cause outage or data loss.

### 1. Database backups — ~~absent~~ PARTIALLY FIXED 2026-09-02
**Was:** the only scheduled job was `/etc/cron.d/drift-disk-guard`. No `pg_dump`, no
snapshot, no restore procedure.

**Done:** `scripts/ops/drift-backup.sh`, installed to `/usr/local/sbin` and scheduled
by `/etc/cron.d/drift-backup` — nightly dump at 03:15 UTC, 14-day retention, plus a
weekly full restore rehearsal. Each dump is validated with `pg_restore --list` before
being kept, and written under a `.partial` name first so a truncated file can never
masquerade as a good backup.

**Rehearsed, not assumed:** a `VERIFY=1` run restored into a scratch database and
matched live exactly — **94 tables, 7 users** — then dropped the scratch DB. The live
database was never written to.

**STILL OPEN — offsite.** Backups sit in `/srv/drift/backups`, on the *same disk as
the database*, so they do not survive the disk failure they mainly exist for.
Finishing this needs a destination and credentials (Hetzner Storage Box or S3); both
candidate commands are written at the foot of the script. Until then this protects
against a bad migration, not against hardware loss.

### 2. TLS renewal reload hook — ~~missing~~ FIXED 2026-09-02
**[verified]** Subtle, and worth recording for the next person.

- The renewal timer **is** active: `snap.certbot.renew.timer`, last run 2026-09-01,
  next in ~9h.
- `certbot renew --dry-run` **passes**.
- But `/etc/letsencrypt/renewal/135.181.146.130.conf` contains **no `renew_hook` or
  `deploy_hook`**.

So on renewal the new cert lands on disk and nginx keeps serving the **old one from
memory** until something reloads it. The cert expires **2026-09-08** — six days.
Symptom for users: the mobile app fails TLS and shows a generic "something went
wrong", exactly the error class that cost hours of debugging this week.

`docs/DEPLOYMENT.md:101-102` already prescribed the fix; it had simply never been
applied. **Applied 2026-09-02**, and proven to fire rather than merely be present —
`certbot renew --dry-run --run-deploy-hooks` produced a real `Reloaded nginx.service`
in the journal at 09:07:06:

```bash
certbot reconfigure --cert-name 135.181.146.130 \
  --deploy-hook "systemctl reload nginx"
```

Note this is a **short-lived IP certificate** (~7-day validity, `preferred_profile =
shortlived`). The renewal path is exercised constantly, so a broken reload hook bites
within days, not months.

### 3. No production domain
**[doc]** `DEPLOY_HANDOFF_PROMPT.md` calls this "the one open blocker". Everything is
pinned to a bare IP: nginx vhosts, the mobile app's compiled `DRIFT_API_BASE_URL`,
`scripts/staging/*`, and the TLS cert. Without a domain there is no stable identity,
no normal certificate, no email deliverability (SPF/DKIM/DMARC need a domain), and
the mobile app must be rebuilt and redistributed on every address change.

### 4. Deployment is manual and unreproducible
**[verified]** `.github/workflows/ci.yml` builds and tests only — there is **no
deploy job**. Deployment is a human running `bash scripts/deploy.sh` over SSH as
`drift-deploy`, which builds images **on the production box**. Consequences: the
build competes with the live API for 3.7 GB of RAM, there is no artifact to roll back
to, and "what is running" is only knowable by SSH-ing in.

### 5. No monitoring or alerting on the application
**[verified]** `docs/DEPLOYMENT.md` has no monitoring section. Disk has a guard
(`drift-disk-guard` → Jenkins) but nothing watches API health, error rate, latency,
container restarts, or certificate expiry. Today, the first person to know the API is
down is a user.

### 6. Secrets management is filesystem-only
**[doc]** `SECURITY_REVIEW.md` A02/P0 requires production secrets in a secret manager
or root-only env files. Today `JWT_SECRET`, `DATABASE_URL` and friends live in
`/srv/drift/app/.env.production`. There is no rotation procedure and no audit trail
of who read them.

---

## P1 — Required before real users, not before staging

### 7. No email or SMS provider — the largest functional gap
**[verified]** No `nodemailer`, SendGrid, SES, or Twilio dependency exists. The API
returns `PENDING_PROVIDER` (`platform-admin.service.ts:271,348`,
`access-control.service.ts:284`). Everything below is therefore **broken for a real
user**:

| Flow | Current state |
|---|---|
| Signup email verification | dev-only code path; `devVerificationCode` is suppressed in production |
| Password reset | no delivery |
| Platform Admin 2FA | requires `scripts/staging/set-2fa-code.mjs` — a DB write by an operator |
| Club member invitations | `ClubMembershipStatus.INVITED` exists but nothing is sent |
| Support ticket replies | stored, never delivered |

This single dependency gates account recovery, staff login, and onboarding. It is the
first thing to resolve after the P0 list.

### 8. No push notifications
**[verified]** No Firebase/FCM/APNs dependency. The in-app Notification Centre works,
but nothing reaches a user who does not have the app open — which removes the core
loop of a match-making product (challenge received, result awaiting confirmation,
round deadline).

### 9. No payments provider
**[verified]** No Stripe/Paystack/Flutterwave/M-Pesa dependency. The schema and
service layer are deliberately provider-neutral, and Platform Admin now has plans,
promotions and sponsor placements seeded — but **no money can move**. If launch
includes any paid tier, this is a blocker; if launch is free, it is not.

### 10. Four high-severity dependency advisories
**[verified]** Current `npm audit --omit=dev` on `backend/`:

| Package | Advisory | Path |
|---|---|---|
| `deepmerge-ts <8.0.0` | GHSA-ggr8-5vv4-36mx — stack exhaustion | Prisma 7.9.1 → `@prisma/config` |
| `mysql2 <3.22.0` | GHSA-3f6p-5ww8-9rcr — auth downgrade leaks plaintext credentials | Prisma |

Both arrive through Prisma. **Do not run `npm audit fix --force`** — it downgrades to
Prisma 6.19.3, a breaking change. Note the review recorded *three* findings; there are
now **four**, so this is drifting rather than static. `mysql2` is not used by this
product (it is Postgres), which lowers real exposure, but it will still fail any
customer or investor security questionnaire.

### 11. Password policy is weak
**[verified]** `MinLength(8)` in `sign-up.dto.ts`, `reset-password.dto.ts`,
`change-password.dto.ts`. No complexity rule, no breached-password screening. Called
out as open under A07.

### 12. CI actions are not pinned to commit SHAs
**[verified]** `ci.yml` uses `actions/checkout@v6`, `actions/setup-node@v6`,
`subosito/flutter-action@v2`. A compromised or retagged action executes in a workflow
that has repository access. A08/P1.

### 13. Android release key rotation is unresolved
**[verified]** Two keystores exist: `preview.keystore` (currently referenced by
`key.properties`) and `release.keystore`. Both are correctly gitignored and untracked.
`SECURITY_REVIEW.md` P0 requires rotating the release key **if it ever protected a
distributable build**. That question is unanswered, and it is unanswerable later —
once a key signs a Play Store release it can never be changed.

### 14. Egress restriction for the news ingestion worker
**[doc]** A10 is mitigated thoroughly in application code (`src/news/feed-fetch.ts`
— DNS pinning, redirect revalidation, size/time bounds, private-range rejection). The
outstanding item is **infrastructure-layer egress control** as defence in depth.

### 15. No CSP on the deployed consoles
**[doc]** A05. The consoles set headers via `next.config.ts`, but the nginx layer must
not strip or contradict them, and CSP itself needs configuring. Not verified in this
review — worth an explicit header audit against the live sites.

---

## Legal and compliance — cannot be closed by engineering

### 16. Legal copy is placeholder text
**[verified]** `mobile/lib/features/settings/presentation/legal_screen.dart:13,22`
literally contains *"This is placeholder copy pending a full legal review"*. Terms of
Service and Privacy Policy must be real and reviewed before public launch.

### 17. Minors / age-gating policy undecided
**[doc]** No age gate exists. A tennis product will attract under-18s. This drives
COPPA/GDPR-K obligations, guardian consent, and whether under-18 accounts may appear
in player discovery at all. **Product/legal decision, not an engineering one.**

### 18. GDPR deletion is soft-delete only
**[doc]** `AccountStatus.DELETED` marks the row; it does not cascade-delete or
anonymise. A real erasure request cannot currently be honoured. Platform Admin can
raise an EXPORT privacy request today; DELETION is present in the schema but the
destructive path is unbuilt.

### 19. No support mailbox
**[doc]** Help/Contact content is placeholder and there is no monitored address behind
it — which also interacts with #7.

---

## Product gaps — known, scoped, non-blocking

From `PROGRESS.md` "Known deferred items", none of which are defects:

- **Club Admin learning-content authoring** — schema and API exist, frontend deferred.
- **Multi-club switcher and fine-grained roles** — COACH / CONTENT_MANAGER /
  COMPETITION_MANAGER / READ_ONLY are currently *functionally identical*. Worth
  flagging: the roles appear in the UI and imply access control that does not exist.
- **Coach scheduling and lesson management** — directory exists; booking does not.
- **Double-elimination brackets** — single-elimination shipped.
- **Events prize handling** — events exist, prizes unbuilt.
- **Match Reflection skill dimension** — needs a schema change to feed skill scores.
- **Achievement expansion** — first rule catalogue only.
- **Google Places enrichment** — blocked on a billed API key.
- **Load testing** — never performed. Explicitly deferred to pre-launch; the box is a
  single 3.7 GB host running Postgres, Redis, the API and two Next apps.

---

## Corrections to existing documents

Two entries in `PROGRESS.md` "Open Dependencies" are **stale** and should be struck,
or they will keep generating phantom work:

1. **Sharp Sans Display font licence** — listed as an unpurchased commercial
   dependency. **[verified]** The redesign dropped it. `mobile/pubspec.yaml` ships
   Outfit (5 weights) and Montserrat (3 weights), both open-licence. No purchase is
   required.
2. **"Space Grotesk is the shipped placeholder"** — also stale; neither font is in
   `mobile/assets/fonts/`.

---

## Recommended sequence

**This week — stop the bleeding.** These are hours of work, not weeks, and two of them
are already written down and simply unapplied.

1. ~~Apply the certbot `--deploy-hook` (#2).~~ **Done 2026-09-02 — hook verified firing.**
2. ~~Nightly `pg_dump` + a rehearsed restore (#1).~~ **Done 2026-09-02** — rehearsal
   passes. **Offsite copy still outstanding**, and it is the half that protects
   against disk loss.
3. Basic uptime and cert-expiry alerting (#5) — now the top unstarted P0.

**Next — unblock real users.**

4. Get the domain (#3), then reissue TLS against names, add SPF/DKIM/DMARC.
5. Choose and wire the email provider (#7). This unlocks verification, password
   reset, invites, and removes the 2FA operator stopgap.
6. Answer the Android key-rotation question (#13) **before** any store submission.

**Then — production hygiene.**

7. Move deployment off the box: build artifacts in CI, deploy by pulling an image
   (#4). Pin CI actions by SHA while in there (#12).
8. Secrets into a manager (#6); egress restriction for ingestion (#14).
9. Push notifications (#8), then payments if the launch tier is paid (#9).

**In parallel, not on the engineering critical path.**

10. Legal review of Terms/Privacy (#16), minors policy (#17), GDPR erasure (#18).
11. Load testing against a production-shaped host (#9 in product gaps).

---

## Honest summary

The engineering is in better shape than the operations. The application has real
depth — competitions, trust & safety, learning content, news ingestion with genuine
SSRF hardening, audit logging, admin MFA — and the security review shows a team that
found and fixed real problems rather than papering over them.

The risk sits almost entirely in **what happens after deploy**: no backups, a reload
hook that was documented but never applied, no alerting, and a manual deployment onto
a single small box. Those are cheap to fix and expensive to skip.

The second cluster — email, push, payments, legal — is not fixable by writing more
code. Each needs a decision and, in most cases, a purchase.
