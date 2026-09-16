# Payments — the split, and why it is the way it is

Closes tracker **7.1** for clubs. Companion: `LAUNCH_TRACKER.md`, `backend/src/payments/`.

## The decision

Two audiences, two payment rails, for reasons that are not interchangeable:

| Who | Where they pay | Rail | When |
|---|---|---|---|
| **Clubs, billed in KES/GHS/NGN/UGX/TZS/XAF/XOF** | Club Admin, in a web browser | **IntaSend** (M-Pesa, card, bank) | Built now |
| **Clubs, billed in USD** | Club Admin, in a web browser | **Paddle** (card, global, merchant of record) | Built now |
| **App users** | Inside the mobile app | **Play Billing / StoreKit** | Free at launch, monetised later |

Two hosted rails, not one, because IntaSend's subscription product cannot bill
USD at all (below), and the platform is global from day one. Which one
handles a given plan is decided by the plan's **currency**, resolved per
checkout by `PaymentProviderResolver` — see "Two rails, routed by currency".

### Why clubs may use IntaSend and the app may not

Apple and Google both require their own in-app purchase system for **digital
content consumed inside the app**, and both take a cut. Neither rule reaches a
club paying a subscription in a web console on a laptop: that is a business
buying software outside the app, which both stores treat as out of scope.

So this is not a loophole being exercised — it is two genuinely different
transactions. The consequence to hold on to is the one that bites later: **when
mobile subscriptions arrive they cannot reuse any of this.** They will need Play
Billing and StoreKit, with their own receipt-verification path. Routing an
in-app subscription through IntaSend to avoid the store cut is the kind of thing
that gets an app removed.

## What was built

IntaSend and Paddle are both **hosted** providers: each owns the payment
interaction and the recurring cycle, we never see card details, and we learn
outcomes from a webhook rather than from a return value. The original seam
assumed the opposite — that we hold a token and charge it on our own schedule —
so `PaymentProvider` became a discriminated union rather than being bent into a
shape it does not have:

```
DirectPaymentProvider  { mode: 'direct' }  createPaymentMethod + charge
HostedPaymentProvider  { mode: 'hosted' }  createPlan + createCustomer
                                           + startSubscription + cancelSubscription
```

`PaymentsService` and `ProviderPlanService` branch on `mode` and the compiler
enforces that it does. `SandboxPaymentProvider` is unchanged in behaviour and
simply declares itself `direct`, so a deployment with no real keys at all —
every dev machine, and CI — runs the whole billing surface exactly as before.

### Two rails, routed by currency

`PaymentProviderResolver` (`payment-provider.resolver.ts`) is what decides
which provider handles a given plan, since a single env-var-picked provider
stopped being enough once two hosted providers could be configured at once:

```
KES, GHS, NGN, UGX, TZS, XAF, XOF  ->  IntaSend  (if INTASEND_SECRET_KEY is set)
USD                                ->  Paddle    (if PADDLE_API_KEY is set)
anything else                      ->  Sandbox, but only when *nothing* real
                                        is configured anywhere; otherwise
                                        refused outright
```

The last row is the fix for the bug that started this: a plan priced in a
currency neither provider bills (`XTS`, the ISO test currency, in
particular) used to reach IntaSend's API, get far enough to mint a plan and a
`setup_url`, and then 404 on IntaSend's own checkout page. `listPlans` now
calls the resolver before ever offering a plan, so an unroutable currency
simply isn't shown rather than dying at checkout.

`HostedPaymentProvider.updatePlan` returns the plan id to bill against going
forward, not `void`: IntaSend edits a plan's price in place and always hands
the same id back, but Paddle's price-update endpoint accepting an amount
change is not the same as Paddle's business logic honouring it once a price
has live subscribers — `PaddlePaymentProvider.updatePlan` tries the in-place
edit first and, only if that's refused, mints a new price and archives the
old one, returning whichever id the caller should store.

**Paddle's `startSubscription` ignores `returnUrl`.** IntaSend takes a
per-request redirect target; Paddle's transaction `checkout.url` field names
an *approved custom checkout domain* to render the payment page on, not where
to send the payer afterwards — there is no per-request return URL in Paddle's
Transactions API. Where a payer lands after paying through Paddle is an
account-wide dashboard setting (see `docs/OWNER_ACTIONS.md`), not something
this code controls per checkout.

### The flow

1. Club owner picks a paid plan and, if its tier has more than one currency
   variant, a currency — see "Plan data" below.
2. The resolver picks the provider for that plan's currency. We create the
   plan at that provider once (`ProviderPlan.providerPlanId`) and the customer
   once (`BillingAccount.providerCustomerId`), then open a `BillingInvoice`
   (OPEN) and a `PaymentTransaction` (PENDING) **before** leaving, because a
   fast payer's webhook can arrive before the request that started it has
   finished.
3. The provider returns a checkout URL (`setup_url` for IntaSend,
   `checkout.url` for Paddle); the console redirects there.
4. The webhook arrives at `POST /payments/webhooks/intasend` or
   `POST /payments/webhooks/paddle`; on a completed payment the invoice is
   marked PAID, the subscription becomes ACTIVE, and — new — the subscription
   records **which** provider confirmed it (`BillingSubscription.provider`),
   so a later cancellation or refund calls the provider that actually holds
   the mandate rather than whichever one the plan's current currency happens
   to route to.

**The subscription is not activated at step 3.** A redirect the payer can simply
abandon is not a payment, and granting entitlements on one is how a product
gives itself away.

### Webhook authentication: two very different doors

IntaSend authenticates webhooks with a **shared `challenge` string in the POST
body** — not a signature over the payload. That is weaker than an HMAC: anyone
who learns the challenge can forge a confirmation, and it is compared rather
than derived. What we do about it:

- constant-time comparison, and the challenge never reaches a log line;
- production refuses to boot when a secret key is set without a challenge, so
  the failure mode is a loud startup error rather than payments that are taken
  and never confirmed;
- the endpoint answers `401` for a bad challenge and `200` for anything
  authenticated, including events we do not act on — IntaSend deactivates an
  endpoint after repeated failures, and losing every future confirmation over
  one unrecognised event type is much worse than ignoring it.

Paddle authenticates with a **real HMAC-SHA256 signature** over the raw request
body (`Paddle-Signature: ts=...;h1=...`, verified as
`HMAC-SHA256("{ts}:{rawBody}", secret) == h1`), plus a 5-second timestamp
tolerance against replay — genuinely stronger than IntaSend's shared challenge.
It needs the untouched request bytes, not the parsed JSON, so `main.ts` boots
Nest with `rawBody: true` to make `req.rawBody` available to the webhook
controller. Same failure mode as IntaSend on a missing secret: production
refuses to boot with `PADDLE_API_KEY` set and `PADDLE_WEBHOOK_SECRET` absent.

This is the ceiling of what each provider offers, and it is recorded rather
than papered over.

### Safety rails around the keys

The API host is **derived from the key prefix** rather than configured beside
it: `ISSecretKey_test_…` goes to `sandbox.intasend.com`, `ISSecretKey_live_…` to
`payment.intasend.com`. Two settings that must agree is precisely how a test key
ends up pointed at the live gateway by an edit to only one of them.

`validateEnvironment` refuses to start with a **live key under `NODE_ENV=test`**.
A test suite that can move real money is not a risk worth carrying for the
convenience of one env file, and the mistake is a copy-paste away.

## Both consoles are connected, not just the club one

Platform Admin used to read and write only our own tables — it had no provider
dependency at all. That made three of its actions quietly untrue once real money
started moving. All three now go through the same `ProviderPlanService` seam that
Club Admin uses, because two copies of the wiring is how the consoles drift into
two different ideas of what is live.

| Platform Admin action | What it now does |
|---|---|
| Create a plan | Mints the provider plan immediately, so staff learn here whether the terms were accepted rather than a club discovering it mid-payment. A free plan never reaches the provider; a provider outage does not lose the saved plan, because `resolve` mints it on first use instead. |
| Edit a plan's price | Pushes the new terms to the provider — the base plan **and** every promotional variant. The audit entry records how many synced and how many failed. |
| Record refund | Calls the provider first, then marks our row. Money moves before the ledger says it did, because the reverse order leaves a refunded-looking row and an uncredited club with nothing to retry. |
| Override a subscription to CANCELLED | Stops the mandate at the provider. Previously the status changed while the club kept being charged every cycle. |

**Promotions are real, and they are discounted plans.** A hosted provider bills a
fixed amount against a mandate, so a percentage cannot be applied per cycle from
our side. Applying `SAVE20` to `CLUB_PRO` therefore resolves a *second* provider
plan at the discounted price and subscribes the club to that one — the discount
is exactly what the provider charges, every cycle. `provider_plans` maps each
(plan, promotion) pair to its provider plan so a variant is minted at most once.

The discount always **rounds down**, so rounding never favours us over the payer,
and a fixed-amount promotion in a different currency to the plan is refused
rather than subtracted — a KES discount against a USD price would change the bill
by two orders of magnitude, silently.

## IntaSend subscriptions can only be priced in African currencies

Verified 2026-09-03 against three IntaSend API references — plan list, plan
retrieve and plan update — which all give the same `PlanSer` enum:

```
"KES", "GHS", "NGN", "UGX", "TZS", "XAF", "XOF"
```

**No USD, EUR or GBP.** The prose "Create a Plan" page advertises
`KES, USD, EUR, GBP`, but that describes the checkout/collections product, not
subscription plans. This is a product constraint, not an implementation
detail — it's the reason USD club billing needed a second provider (Paddle)
rather than a currency added to IntaSend's list.

`SUPPORTED_CURRENCIES` (`backend/src/platform-admin/supported-currencies.ts`,
which drives the Platform Admin currency dropdown) has been trimmed to exactly
the currencies `PaymentProviderResolver` actually routes somewhere — this
same class of mistake put a **GBP 49.00** plan and two **XTS** plans into
production once already, all three unbillable, discovered only when checked
against a live key. Extending either rail to a new currency is a one-line
change in the resolver *and* here — the two must agree, or the dropdown offers
a plan that dies exactly the way `CLUB_GROWTH_SANDBOX` (XTS) did.

## Plan data: two tiers, each priced in KES and USD

A club-facing tier is one *or two* `PaymentPlan` rows, sharing a `groupCode`
so Club Admin can offer one card with a currency choice instead of two
separate plans:

| code | groupCode | currency | provider |
|---|---|---|---|
| `CLUB_STARTER` | `CLUB_STARTER` | USD | — (free, no provider call) |
| `CLUB_PRO_USD` / `CLUB_PRO_KES` | `CLUB_PRO` | USD / KES | Paddle / IntaSend |
| `CLUB_ELITE_USD` / `CLUB_ELITE_KES` | `CLUB_ELITE` | USD / KES | Paddle / IntaSend |

Club Admin defaults the currency toggle to USD — the platform is global-first —
except when the club is already subscribed to the other currency's variant of
that tier, where it shows the currency they're actually on. **Prices and
entitlement copy are placeholders**, seeded so the flow is wired end-to-end;
see `docs/OWNER_ACTIONS.md` for replacing them before a real club sees them.
The old `CLUB_GROWTH_SANDBOX` (XTS) row is untouched — once currency-based
filtering is live, it stops being offered anywhere a real provider is
configured, while remaining usable in dev/CI's sandbox-covers-everything mode
exactly as before.

## What is still not built, and is not a gap

- **No stored payment methods for hosted providers.** `addMethod` returns a 400
  explaining that details are collected at checkout, and the console hides the
  form. There is nothing for us to store.
- **No proration.** Changing plans mid-period starts a new period. Fine for two
  or three club tiers; revisit if the plan matrix grows.
- **No dunning.** A failed renewal sets the subscription `PAST_DUE` and stops
  there. Nothing emails the club or retries on a schedule yet.
- **`maxRedemptions` is not enforced.** Nothing records a redemption anywhere, so
  any check would be a guess dressed as a rule. Enforcing it needs a redemptions
  table first — the field is accepted and stored, and ignored, deliberately.
- **Repricing does not touch live mandates.** Whether a subscription already
  authorised against a plan follows a price change is the provider's behaviour,
  not ours. The audit entry records what we pushed rather than asserting what
  happened to existing subscribers.
- **Paddle is wired for USD only.** Paddle itself bills many currencies;
  extending it to more is a one-line addition to `PaymentProviderResolver`
  (and to `SUPPORTED_CURRENCIES`) once there's a reason to, not a redesign.
- **No per-request Paddle return URL.** See "Paddle's `startSubscription`
  ignores `returnUrl`" above — where the payer lands after paying through
  Paddle is configured once, account-wide, in Paddle's dashboard.

## Before it can take a real payment

**IntaSend:**
1. **Rotate the keys that were pasted into a chat transcript.** A pair of live
   keys was exposed on 2026-09-03 and must be treated as compromised.
2. Put a **sandbox** key in `backend/.env` and run the flow end to end against
   `sandbox.intasend.com`.
3. Create the webhook in the IntaSend dashboard pointing at
   `https://drift.einsbrand.com/api/payments/webhooks/intasend`, with a
   challenge, and put the same value in `INTASEND_WEBHOOK_CHALLENGE`.
4. Only then put a live key on the production box.

**Paddle:**
1. Sign up, and get a **sandbox** API key plus a Notification Destination
   (webhook) secret from the Paddle dashboard.
2. Point the Notification Destination at
   `https://drift.einsbrand.com/api/payments/webhooks/paddle` and put the
   secret in `PADDLE_WEBHOOK_SECRET`.
3. Set the account's default payment link / post-checkout redirect in
   Paddle's dashboard to `https://drift.einsbrand.com/billing` — there is no
   per-request equivalent in this integration (see above).
4. Run the flow end to end against `sandbox-api.paddle.com`
   (`PADDLE_ENVIRONMENT` unset or `sandbox`).
5. Only then get **production** API and webhook credentials, set
   `PADDLE_ENVIRONMENT=production`, and put them on the production box.

**Both:**
- Replace the placeholder prices and entitlement copy on `CLUB_PRO_*` and
  `CLUB_ELITE_*` with real ones via Platform Admin — see "Plan data" above.

## `billing_cycles` is not optional in the way it looks

Verified against the live API on 2026-09-03. A plan created **without**
`billing_cycles` comes back with **`billing_cycles: 11`** — not "renew until
cancelled". A club would simply have stopped being billed after eleven months,
with no error raised anywhere, discovered in a revenue report a year later.

It is now sent explicitly as **240** (twenty years of monthly cycles) on both
create *and* update. It goes on the update too because that endpoint is a `PUT`:
omitting the field would let the provider re-apply its own default, quietly
capping a live plan's remaining cycles every time staff edited its price.

**One repair this does not do for you.** `resolve()` only pushes an update when
the amount or currency has moved, so a plan minted before this fix keeps its old
cycle count. Either edit the plan once in Platform Admin — `syncPlan` calls
update unconditionally — or `PUT` the plan directly. The one plan that existed
(`EYRJJ09`, CLUB_PRO_MONTHLY) was repaired by hand on 2026-09-03.
