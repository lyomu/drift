# Product / External Dependencies Guideline

_Last updated: 2026-08-25_

This guideline turns the remaining non-screen dependencies into owner decisions, implementation inputs, and acceptance criteria. These items should be treated as launch blockers or launch-readiness workstreams depending on the release scope. Do not hide missing providers behind optimistic UI: when a dependency is absent, the product should show a clear pending, unavailable, or failed state.

## Decision Principles

- Prefer provider-neutral interfaces in code so vendor changes do not require product rewrites.
- Separate secrets from configuration. Store API keys, tokens, and private credentials only in the approved runtime secret store.
- Keep sandbox/dev behavior explicit. Dev-only OTPs, sandbox payments, fake delivery, and `providerCall: false` audit metadata must never be mistaken for production readiness.
- Record user-impacting operations in durable audit logs where the feature affects accounts, money, moderation, privacy, or platform configuration.
- Do not fabricate operational data. Use real provider callbacks, delivery receipts, payment events, sync results, or documented fallback states.
- Confirm compliance before collecting or processing sensitive user data, especially minors, billing data, location data, and account deletion requests.

## Dependency Matrix

| Dependency | Why It Matters | Current State | Owner Decision Needed | Implementation Readiness Criteria |
| --- | --- | --- | --- | --- |
| Sharp Sans license | Brand typography for production UI. | Trial files exist but are not usable as production fonts. Space Grotesk is the placeholder. | Buy a full commercial Sharp Sans Display license or formally choose a substitute typeface. | Licensed full-glyph font files, usage rights documented, app typography smoke-checked for punctuation and fallback behavior. |
| Email/SMS provider | OTP delivery, password reset, account alerts, support workflows. | Dev-only delivery paths exist; production provider is not selected. | Choose provider by launch market, cost, deliverability, compliance, and sender ID needs. | Provider account, verified sender/domain, templates approved where required, retry/error handling, delivery webhooks, rate limits, and production secrets configured. |
| Push credentials | Real push notifications for mobile users. | In-app Notification Center works; FCM/APNs delivery is not wired for production. | Create Firebase/APNs project and choose operational ownership for certificates/keys. | FCM/APNs credentials, device-token registration, notification permission copy, delivery receipt/error monitoring, and opt-out behavior verified. |
| Payments provider | Real subscription/payment collection and refunds. | Schema and service are provider-neutral; sandbox provider exists. | Choose Stripe or another provider, supported currencies, refund policy, tax/VAT approach, and dispute handling owner. | Provider account, webhook signing, idempotency keys, live/test mode separation, currency-specific pricing, invoice/receipt rules, refund path, and reconciliation report. |
| Google Places API key | Venue enrichment, place sync, duplicate/quality workflows. | Sync workflow exists and records failed state when credentials are absent. | Approve billed Google Cloud project, API restrictions, budget alert, and data-use policy. | Places API enabled, key restricted by service/environment, quota and billing alerts configured, failure states tested, and provider-owned fields documented. |
| Legal/support content | Public trust, support routing, terms/privacy compliance. | Placeholder help/legal copy exists. | Approve legal text, support mailbox, escalation rules, and response-time expectations. | Terms, Privacy Policy, FAQ, Contact Support, deletion/export language, minors language, and support ownership reviewed and published. |
| Full GDPR deletion project | Compliance-grade account deletion/anonymization. | Soft delete and privacy request processing exist; full cascading/anonymization is separate. | Define legal deletion standard, retention exceptions, audit retention, and data export format. | Data inventory, deletion/anonymization map, retention policy, dry-run tooling, irreversible-confirmation flow, admin audit trail, and regression tests. |
| Richer achievement catalogue | Deeper retention and progression rewards. | First derived achievement catalogue exists. | Define seasonal, coach, event, Padel, streak, and club-specific badge rules. | Product rules, icon/name/copy set, anti-gaming constraints, backfill policy, notification policy, and real-data derivation for each badge. |
| Other non-screen scope items | Previously documented work that is outside the screen-gap closure. | Tracked in `PROGRESS.md` Open Dependencies and Known Deferred Items. | Triage into launch blocker, post-launch, or backlog. | Each item has an owner, priority, acceptance criteria, and target milestone. |

## Provider Selection Guidance

### Email / SMS

Choose based on launch geography first.

- Kenya/East Africa launch: shortlist Africa's Talking and Celcom Africa for local SMS economics, sender ID support, and M-Pesa-friendly billing.
- International launch: shortlist Twilio, Vonage, Infobip, Telnyx, or Plivo for broader reach and mature API tooling.
- Production requirement: OTP must use a provider-backed channel with retry, throttling, logging, and abuse controls. Console/dev codes are not production delivery.

Minimum acceptance criteria:

- Transactional sender identity approved.
- OTP/password-reset templates approved where carriers require it.
- Delivery callback endpoint configured.
- Failed delivery and rate-limit states visible to support/admins.
- Costs documented by destination country and message type.

### Push

Use FCM for Android and APNs for iOS, typically through Firebase Cloud Messaging unless there is a strong reason to operate separate APNs infrastructure.

Minimum acceptance criteria:

- Device token registration and token refresh handled.
- Notification preferences respected.
- Permission-denied state handled without blocking in-app notifications.
- Delivery failures logged by platform.

### Payments

Keep the existing provider-neutral boundary. Stripe is the default practical shortlist for cards/subscriptions unless local payment rails are more important for the first market.

Minimum acceptance criteria:

- Webhook signature verification.
- Idempotent charge/refund handling.
- Clear split between sandbox and live credentials.
- Amounts stored and reported by currency.
- Receipts, invoices, refunds, and failed payments visible to support/admins.

### Google Places

Use a restricted key, not an unrestricted server key.

Minimum acceptance criteria:

- API key scoped to required Places APIs.
- Environment-specific key separation.
- Quota and billing alerts.
- Sync failures preserve existing venue data and show actionable status.

## Launch Readiness Checklist

- [ ] Font license decision recorded and production font files available.
- [ ] Email/SMS provider selected, configured, and verified in staging.
- [ ] Push credentials configured for Android and iOS.
- [ ] Payments provider selected, webhook flow verified, and refund policy approved.
- [ ] Google Places API key configured with quota and restrictions.
- [ ] Legal/support copy reviewed and support mailbox live.
- [ ] GDPR deletion scope approved and implementation project planned.
- [ ] Achievement expansion product rules prioritized.
- [ ] Remaining non-screen items triaged with owners and milestones.

## Operating Rule

Until a dependency is complete, the app should preserve honest states: sandbox, pending setup, provider unavailable, failed sync, or manual review required. Avoid copy that implies delivery, payment, deletion, legal approval, or provider verification has happened when the system only recorded an internal placeholder.
