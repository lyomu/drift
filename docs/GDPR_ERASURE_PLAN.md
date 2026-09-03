# P.3 — GDPR Erasure: Plan and outcome

Status: **shipped 2026-09-03** (commit `a995af7`) · Companion: `LAUNCH_TRACKER.md` P.3

The plan is kept below as written, because the reasoning is the point: researching
the problem first is what shrank it, and a plan edited to match its outcome cannot
show that. §3 records what was actually built; §5 records what erasure now obliges
of other items.

---

## 0. The readiness report was wrong about this, and it mattered

> **Since corrected.** `LAUNCH_READINESS.md` §18 now reads *"RESOLVED 2026-09-03"*
> and states the correction in place. The original text is quoted here so the
> record of what was believed, and why it was wrong, survives.

`LAUNCH_READINESS.md` §18 said *"`AccountStatus.DELETED` marks the row; it does not
cascade-delete or anonymise… the destructive path is unbuilt."*

Half of that is stale. There are **two** paths, and they do very different things:

| Path | What it actually does |
|---|---|
| **User-initiated** — `POST /users/me/delete` (`UsersService.deleteAccount`) | Sets `accountStatus = DELETED`, revokes refresh tokens. **No PII removal at all.** |
| **Admin-fulfilled** — `PrivacyRequest` type `DELETION` (`SupportAdminService.processPrivacyRequest`) | Real anonymisation: nulls email, phone, names, photo, bio; redacts `passwordHash`; clears tennis-profile location; deletes availability slots and verification codes; revokes tokens; stores an export snapshot; writes an audit entry. |

So the destructive path **is** built, and its design is deliberate — the audit
record it writes says `historicalRelationsPreserved: true`. That is the correct
shape for a multi-party product: erasing a player outright would corrupt the match
history, standings and conversations of people who did **not** ask to be erased.

This changes the job from "build erasure" to **"close the gaps in an erasure that
already exists, and give users a way to reach it."** Much smaller, and the plan
below is scoped accordingly.

---

## 1. What survives erasure today that should not

`User` has **58 relations**. The erasure transaction touches five. Auditing the
rest, these carry the erased person's own identifiers or their own free text:

| # | Where | What leaks | Severity |
|---|---|---|---|
| 1 | `SocialIdentity.email`, `.name`, `.providerAccountId` | Direct identifiers, and `providerAccountId` is a **stable Google/Apple subject** — it re-identifies the person forever | 🔴 |
| 2 | `DeviceToken.token` | A live push address. Not just privacy: **an erased account keeps receiving notifications** | 🔴 |
| 3 | `CoachProfile.publicEmail`, `.publicPhone`, `.bio`, `.availabilityNote` | Direct contact details, publicly visible | 🔴 |
| 4 | `SupportTicket.subject`, `.body` | Free text people routinely put contact details into | 🟠 |
| 5 | `MatchReflection.notes` | Free text the user authored | 🟠 |
| 6 | `PlayerReport.notes` (where they are the reporter) | Free text they authored | 🟠 |
| 7 | `PadelProfile.partnerPreference`, `.goals` | Free text; tennis profile is cleared but padel is not — an inconsistency, not a judgement | 🟠 |
| 8 | `savedStories`, `dismissedHomeCards`, `clubPostReactions` | Behavioural history tied to the identity | 🟡 |
| 9 | `notifications` (`title`, `body`) | Often embed the person's own name | 🟡 |

**Items 1 and 2 were introduced by this session's own work** (Phase 4 social
sign-in, Phase 6 push). Worth stating plainly rather than quietly fixing.

### The cascade assumption was wrong

`docs/PUSH_NOTIFICATIONS_PLAN.md` §5 claimed `onDelete: Cascade` on `DeviceToken`
"matters for the GDPR erasure item". It does not. **Erasure is an `UPDATE`, not a
`DELETE`** — the user row is anonymised in place and deliberately kept, so no
cascade ever fires. Cascade only helps a true row deletion, which this product
does not do. The plan doc will be corrected.

---

## 2. Decisions needed before implementation

| # | Decision | Recommendation |
|---|---|---|
| P.3a | Should `POST /users/me/delete` file a `DELETION` privacy request automatically? | **Yes, and data is kept for 30 days before erasure** (owner, 2026-09-03). The account deactivates immediately; the request is filed `PENDING`; a daily job erases once 30 days have elapsed. Staff may fulfil sooner from the console. The window is a real safety net — erasure is irreversible, and a mis-tap otherwise destroys an account instantly. |
| P.3b | Redact message bodies? | **Approved.** Redact `Message.body`, keep the row, so the other participant's conversation keeps its shape. |
| P.3c | Is anonymisation terminal? | **Approved — terminal.** A hard delete would break other users' match history. GDPR permits this where erasure would prejudice others' rights; recorded here so it is a written decision rather than an accident. |

> **The 30-day window is staff-recoverable, not self-service.** `AuthService.login`
> already refuses a `DELETED` account, so the person cannot sign back in to cancel.
> Restoring within the window means staff clearing `accountStatus` and the pending
> request. A self-service "reactivate by signing in" flow is a reasonable follow-up
> but is deliberately **not** in this change.

---
## 3. Implementation — as built

**One shared `ErasureService`** (`backend/src/privacy/erasure.service.ts`), because
the redaction set must not be defined twice — that is exactly how a field gets added
to one path and forgotten in the other.

- `eraseUser(tx, userId, requestId)` — the complete redaction, run inside the
  caller's transaction.
- `SupportAdminService.processPrivacyRequest` calls it instead of its inline block.
- `UsersService.deleteAccount` files a `PENDING` `DELETION` request (P.3a) and keeps
  its immediate deactivation. Filing is **idempotent** — a second tap cannot restart
  the 30-day clock.
- `ErasureScheduler` (`erasure.scheduler.ts`) runs the window at **03:40 UTC daily**,
  after the 03:15 backup, so the night's dump still holds the pre-erasure state.
  Each request gets **its own transaction**: one failure must not roll back erasures
  that already succeeded, and a failed row stays `PENDING` so the next day retries it.
- `PrivacyModule` is `@Global()` and registered in `app.module.ts` alongside
  `ScheduleModule.forRoot()` — without the latter the cron is a decorator nobody runs.

**Coverage** — items 1–9 above, all shipped. Provider identities and device tokens
are **deleted outright** rather than nulled: a social login must stop working, and a
push address has no anonymised form. Everything else is nulled or replaced with a
stable marker, `privacy-request-redacted:<requestId>`, so a redacted row stays
distinguishable from one that was simply always empty, and row counts and relations
survive. `passwordHash` takes the marker rather than `null`, which also guarantees no
bcrypt compare can match.

**Reports about the person are deliberately untouched.** Only reports they *wrote*
are redacted; a report filed against them belongs to its author and to the safety
record, and is not the erased person's to remove.

**Tests** were the substance of this item, not an afterthought. The one that matters
most — `erasure-coverage.spec.ts` — reads `prisma/schema.prisma` **from disk**,
enumerates every model related to `User`, and fails when one appears in neither the
erased set nor the deliberately-kept map, where each kept entry carries a written
reason. It cannot judge whether the handling is *right*, only that somebody decided;
silence is the failure mode worth automating, not disagreement. It was **proven to
bite rather than assumed**: removing `DeviceToken` made it fail and name the omission.

Plus: erasure clears every field in the table above; another user's match history and
standings are untouched; the erased user cannot log in by password or by Google; no
device token survives; the operation is idempotent.

**Verified 2026-09-03:** `tsc` clean · backend **46 suites / 559 tests** (from 43/535)
· mobile **561 tests**, analyze clean · platform-admin, auth and onboarding e2e green.
Re-confirmed against `a995af7`: 46/559 passing.

---

## 4. Out of scope

Article 20 portability (`exportSnapshot` already exists and is a separate item),
retention schedules, backup expiry — the nightly dumps still contain pre-erasure
data until they age out at 14 days, which is a **documented limitation**, not
something code can fix. Erasure also cannot reach the support mailbox until P.4
exists, so today a request has no channel to arrive through.

**Estimated ~1 day including the guard test; that held.**

---

## 5. What erasure now obliges of other tracker items

Shipping this did not only close P.3. It turned three other items from open-ended
into constrained, and that is worth stating where a reader of the tracker will see it
rather than leaving it in this document's prose.

| Item | What erasure now requires of it |
|---|---|
| **P.1 — Terms & Privacy Policy** | The policy is no longer free text: it must **describe shipped behaviour**. Specifically the 30-day window, that anonymisation is **terminal**, and which records are deliberately kept and why (Art. 17(3) — erasure would prejudice other players' rights). A policy that contradicts the code is worse than no policy. |
| **P.4 — Support mailbox** | The **only inbound route** for an Art. 17 request, and the only way to reach the staff-recoverable window — `login` refuses a `DELETED` account, so a person inside the window cannot ask from within the app. Until P.4 exists, a request has no channel to arrive through. |
| **0.2 — Nightly backups** | The dumps retain **pre-erasure data for up to 14 days** until they age out. A documented limitation, not something code can fix; it belongs in the P.1 copy. |

**Deliberately not built:** self-service reactivation inside the window. It is a
reasonable follow-up, and it is an omission rather than an oversight — recorded so
the next reader does not treat it as a bug.
