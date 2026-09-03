# Payments — the split, and why it is the way it is

Closes tracker **7.1** for clubs. Companion: `LAUNCH_TRACKER.md`, `backend/src/payments/`.

## The decision

Two audiences, two payment rails, for reasons that are not interchangeable:

| Who | Where they pay | Rail | When |
|---|---|---|---|
| **Clubs** | Club Admin, in a web browser | **IntaSend** (M-Pesa, card, bank) | Built now |
| **App users** | Inside the mobile app | **Play Billing / StoreKit** | Free at launch, monetised later |

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

IntaSend is a **hosted** provider: it owns the payment interaction and the
recurring cycle, we never see card details, and we learn outcomes from a webhook
rather than from a return value. The existing seam assumed the opposite — that
we hold a token and charge it on our own schedule — so `PaymentProvider` became a
discriminated union rather than being bent into a shape it does not have:

```
DirectPaymentProvider  { mode: 'direct' }  createPaymentMethod + charge
HostedPaymentProvider  { mode: 'hosted' }  createPlan + createCustomer
                                           + startSubscription + cancelSubscription
```

`PaymentsService` branches on `mode` and the compiler enforces that it does.
`SandboxPaymentProvider` is unchanged in behaviour and simply declares itself
`direct`, so a deployment with no IntaSend key — every dev machine, and CI —
runs the whole billing surface exactly as before.

### The flow

1. Club owner picks a paid plan.
2. We create the plan at IntaSend once (`PaymentPlan.providerPlanId`) and the
   customer once (`BillingAccount.providerCustomerId`), then open a
   `BillingInvoice` (OPEN) and a `PaymentTransaction` (PENDING) **before**
   leaving, because a fast payer's webhook can arrive before the request that
   started it has finished.
3. IntaSend returns a `setup_url`; the console redirects there.
4. The webhook arrives at `POST /payments/webhooks/intasend`; on `COMPLETE` the
   invoice is marked PAID and the subscription becomes ACTIVE.

**The subscription is not activated at step 3.** A redirect the payer can simply
abandon is not a payment, and granting entitlements on one is how a product
gives itself away.

### Webhook authentication, stated honestly

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

This is the ceiling of what the provider offers, and it is recorded rather than
papered over.

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

## Subscription plans can only be priced in African currencies

Verified 2026-09-03 against three IntaSend API references — plan list, plan
retrieve and plan update — which all give the same `PlanSer` enum:

```
"KES", "GHS", "NGN", "UGX", "TZS", "XAF", "XOF"
```

**No USD, EUR or GBP.** The prose "Create a Plan" page advertises
`KES, USD, EUR, GBP`, but that describes the checkout/collections product, not
subscription plans. Club billing is built on subscriptions, so the schema binds
and the prose page is misleading.

This is a product constraint, not an implementation detail: it decides what a
club can be charged in. It surfaced when the seeded plans were checked against a
live key — `CLUB_PRO_MONTHLY` was **GBP 49.00**, which would have failed at plan
creation rather than at reprice, and two further plans carried **XTS**, the ISO
test currency, which IntaSend rejects outright.

Anything priced outside that enum needs either a different processor for those
regions or prices denominated in one of the seven.

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

## Before it can take a real payment

1. **Rotate the keys that were pasted into a chat transcript.** A pair of live
   keys was exposed on 2026-09-03 and must be treated as compromised.
2. Put a **sandbox** key in `backend/.env` and run the flow end to end against
   `sandbox.intasend.com`.
3. Create the webhook in the IntaSend dashboard pointing at
   `https://drift.einsbrand.com/api/payments/webhooks/intasend`, with a
   challenge, and put the same value in `INTASEND_WEBHOOK_CHALLENGE`.
4. Seed real club plans with real prices and a real currency. IntaSend supports
   KES, USD, EUR and GBP; the seeded sandbox plans use a test currency.
5. Only then put a live key on the production box.

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
