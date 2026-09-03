# Age Policy — Launch Decision Record

**Status:** Accepted as a product decision by the repo owner
**Effective:** 2026-09-03 (launch)
**Owner:** product
**Legal review:** **not obtained.** No lawyer has reviewed this posture or the
copy that states it. See *Legal basis consulted* below for what that section is
and is not.
**Closes:** tracker P.2

## Decision

Drift Tennis launches as **18+ only**. No account may be created by a person
under 18 until a reviewed guardian-consent flow exists. This is the launch
posture, not a permanent one — it is the default that stands until a deliberate
review replaces it.

## What is in force

- Password signup (`POST /auth/signup`) requires `acceptedAgePolicy: true`.
- Fresh Google / Apple account creation requires the same before a `User` row
  is written.
- Returning social sign-in and social linking are **not** locked out — the gate
  applies to account creation only.
- The database stores `agePolicyAcceptedAt` (a consent timestamp). It does
  **not** store date of birth. The gate is therefore deliberately designed to
  avoid collecting extra PII.

## Legal basis consulted

**This is background reading, not legal advice and not a legal sign-off.** The
statutes below were read in-house to pick a defensible default; no qualified
adviser has confirmed that reading, and nothing here should be relied on as
though one had.

- **FTC COPPA** (Children's Online Privacy Protection Rule): parental consent
  is required for services directed to under-13s, or with actual knowledge of
  under-13 personal-data collection. Drift Tennis is not directed at under-13s.
- **GDPR Article 8**: child consent for information-society services defaults to
  16; member states may lower no further than 13. Drift Tennis does not target
  users below 18 at launch.

Choosing the launch floor at 18 avoids both regimes' consent machinery entirely
rather than guessing a jurisdiction-specific threshold without a legal review.

## What was rejected / deferred

The following were considered and deliberately **not** built for launch. Each
requires its own product + legal review before it can be added:

- Date-of-birth collection.
- Self-declared age field.
- Per-jurisdiction age branching.
- Guardian-consent flow.

## Review triggers

This decision should be revisited when:

- The legal review of the launch legal copy (tracker P.1) happens — this posture
  belongs in its scope, and that review is where the "not obtained" above gets
  closed out.
- A guardian-consent flow is proposed.
- The product targets or knowingly acquires users below 18.
- The applicable legal basis changes.

## Reference

- Implementation: `backend/src/auth/age-policy.ts`, `SignUpDto`, `OAuthDto`,
  `AuthService`.
- Migration: `backend/prisma/migrations/20260903180000_add_age_policy_acceptance`.
- Mobile gate: `mobile/lib/features/auth/presentation/widgets/auth_form_widgets.dart`
  (`AgePolicyAcceptance`), `sign_up_screen.dart`, `social_auth_buttons.dart`.
