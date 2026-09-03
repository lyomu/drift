# Load testing

Closes the repository half of tracker **P.5**. The scripts live in
`scripts/load/`; running them against live infrastructure is an owner action,
because it is deliberately trying to hurt a box that is also serving people.

## What is actually being tested

One Hetzner host, 3.7 GB of RAM, running **Postgres, Redis, the API and two
Next apps together**. `docker-compose.prod.yml` caps the API at 1 GB, Postgres
at 768 MB, Redis at 192 MB and each console at 512 MB — which adds up to close
to the whole machine before the OS gets a share, and is why a 4 GB swapfile
exists.

So the number worth having is not requests per second in the abstract. It is
**the concurrency at which p95 latency leaves the acceptable band**, because
that is what says whether the launch cohort fits on this box or needs another
one.

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) on the machine running the
  test, not on the server — the point is to load it from outside.
- An account that has **completed onboarding**. A half-onboarded account gets
  different, cheaper responses from the home feed and will flatter the results.

```bash
export DRIFT_BASE_URL=https://drift.einsbrand.com/api
export DRIFT_LOAD_EMAIL=…
export DRIFT_LOAD_PASSWORD=…
```

## Run the smoke first, always

```bash
k6 run scripts/load/smoke.js
```

One VU, five iterations, zero tolerance for errors. This is what distinguishes
"the ramp found the capacity ceiling" from "the ramp was hitting a broken
endpoint or a stale token for four minutes". If the smoke fails, the ramp's
numbers mean nothing.

## Then the ramp

```bash
k6 run scripts/load/ramp.js
```

Ramps 1 → 10 → 25 → 50 VUs over six minutes and fails the run if p95 exceeds
1.5 s or errors exceed 1%. k6 exits non-zero on a breach, so this is usable as a
gate rather than a report to squint at.

**Watch the box while it runs**, in another terminal — the interesting failure
is usually memory, not CPU:

```bash
docker stats --no-stream
free -m
docker compose -f docker-compose.prod.yml logs --tail 50 api
```

## Two things that will skew the result if you forget them

**The auth throttle.** `POST /auth/login` allows **10 requests per minute per
IP** (`AUTH_SENSITIVE`). Both scripts log in exactly once, in k6's `setup()`,
and share the token. A test where each VU logs in measures the rate limiter: it
looks like a total collapse at 11 VUs and says nothing about the API. If you
write a new script, copy this pattern.

**The global throttle.** Everything else is 300 requests per minute per IP
(`THROTTLE_LIMIT`). A single-machine ramp will reach that before it reaches the
server's real capacity, and `429`s will show up as `http_req_failed`. Either
raise the limit temporarily on the box, run from several source IPs, or read the
result knowing the ceiling you found may be the limiter's rather than the
machine's. **Say which, in whatever you record** — a capacity number that
silently measured a rate limiter is worse than no number.

## Recording the result

P.5 closes when a run has actually happened and its outcome is written down —
not when these scripts exist. Record: the date, the commit, the VU count where
p95 crossed 1.5 s, what `docker stats` showed at that point, and whether the
limiter was in play. A result nobody wrote down has to be produced again the
first time somebody asks how many users the box holds.

---

## Run 1 — 2026-09-03, against `drift.einsbrand.com`

k6 v2.2.0, from a single client IP, against the 3.7 GB Hetzner host.

### The smoke failed, and that was worth more than the ramp

Three of five endpoints returned **404 "Tennis profile not found"** for
`owner@drift.test`: `/home/feed`, `/home/summary` and `/players`. Only `/health`
and `/players/me` answered.

The cause is a defect in `scripts/staging/bootstrap-accounts.mjs`, not in the
test. Signup creates `tennisProfile: { create: {} }` (`auth.service.ts`), but the
bootstrap writes the `User` row directly and never created one. The account
therefore *looked* complete — `onboardingStep: COMPLETE` — while every
player-facing endpoint 404'd. It cannot be healed from outside the box either:
every onboarding endpoint `update`s that row rather than upserting it.

**Fixed in the script** (it now upserts the profile, so a re-run heals an account
already in this state), but the fix only takes effect when someone re-runs it on
the box. Until then **the home feed — the expensive fan-out endpoint, and the
one that actually matters for capacity — cannot be measured on staging.**

This is precisely why the smoke exists and why it runs first.

### The ramp measured the rate limiter, not the server

`ramp-core.js`, 1 → 10 → 25 → 50 VUs over 3m15s: **6,231 requests, 3,115
iterations, 80.59% failed.** Every failure was a `429` — the `not rate limited`
check failed on exactly the same requests as everything else.

Confirmed directly afterwards on `/health`:

```
X-RateLimit-Limit: 300
X-RateLimit-Reset: 60
```

300 requests per minute per IP, the documented `THROTTLE_LIMIT` default. About
**368 requests/min got through**; the rest were shed.

| Metric | Result |
|---|---|
| p95, all requests | **215.86 ms** |
| p95, `/health` (no database) | 214.58 ms |
| p95, `/players/me` (JWT + Postgres read) | 220.77 ms |
| Max observed | 556 ms |
| Failures that were `429` | 100% |

### What this does and does not tell us

**It does tell us two useful things.** The limiter works: a 50-VU flood from one
IP was shed without the application breaking a sweat, and **latency never
degraded at any point in the ramp** — p95 stayed flat at ~216 ms from 1 VU to 50.
And an authenticated database read costs only about **6 ms more than an endpoint
that touches no database**, so nearly all of that 216 ms is client-to-Hetzner
round trip, not server time. Postgres in 768 MB is not the bottleneck at this
level.

**It does not tell us the capacity.** The limiter shed the load before it reached
the application, so the box was never stressed and no p95 crossing exists to
report. Real users arrive from many IPs and are not bounded this way, so this run
sets no upper bound on what the host can serve.

### To actually answer the capacity question

Both steps need access to the box, which is why this is not finished:

1. Re-run the account bootstrap so a fully onboarded player exists and the home
   feed becomes measurable:
   ```bash
   docker exec -i drift-api node - < /srv/drift/app/scripts/bootstrap-accounts.mjs
   ```
2. Temporarily raise the limiter, re-run `ramp.js` (not `ramp-core.js`), then put
   it back:
   ```bash
   # in .env.production, temporarily:
   THROTTLE_LIMIT=100000
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d api
   ```

Then the number to record is the VU count at which p95 crosses 1.5 s, and what
`docker stats` showed at that moment. Running from several source IPs instead is
the alternative that needs no config change.
