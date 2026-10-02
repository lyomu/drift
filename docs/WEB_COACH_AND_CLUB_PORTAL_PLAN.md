# Web Coach Web Portal Plan

## Decision

Clubs and club administration already exist. Before coach onboarding is added to
the mobile app, Drift Tennis should provide a web portal for coaches to apply,
maintain their public profile, and manage their relationship with existing
clubs. Platform administrators remain a separate operator experience.

## Interim user journey

### Coach

1. A coach creates a normal Drift account, or receives an invitation from a club.
2. The coach opens the web portal and signs in with the same Drift credentials.
3. If no coach profile exists, the portal presents **Apply as a coach**.
4. The coach submits:
   - Bio
   - Qualifications and certifications
   - Years of experience
   - Specialisations
   - Player levels coached
   - Location and availability
   - Public email, phone, or booking link
   - Optional supporting documents
5. The application enters **Pending review**.
6. After approval, the coach profile becomes visible in mobile Discover and on
   the public web profile.
7. The coach can request affiliation with a club or accept a club invitation.

Until mobile support exists, the web portal is the primary place for creating
and maintaining the coach profile.

Club staff already manage clubs in the existing Club Admin console. The coach
portal only needs to display club invitations, affiliation status, and requests.
The existing trusted club-admin shortcut remains available: a club owner/admin
can create a coach profile for an existing, active, fully onboarded Drift
account by email.

## Authentication and role routing

Use a coach login at the coach web portal origin. After authentication, the API
returns the coach context and any existing club affiliations:

```text
contexts:
  - type: COACH
    coachProfileId: ...
    verificationStatus: PENDING | VERIFIED | RESTRICTED
```

The frontend routes the user directly to the **Coach workspace**. Platform Admin
and Club Admin remain on their existing origins and login flows.

The client must never infer authorization from the selected workspace alone.
Every API request must enforce the authenticated user, context, tenant, role,
and permission on the server.

### Session requirements

- Reuse the existing access/refresh-token model.
- Keep platform-admin tokens and club/coach tokens in separate browser storage
  namespaces.
- Revoke all active sessions when an account is suspended or deleted.
- Require re-authentication for changing public contact details or uploading
  verification documents.
- Do not expose private account email or phone as public coach contact data
  unless the coach explicitly publishes it.

## Coach application states

| State | Meaning | Discover visibility |
| --- | --- | --- |
| `DRAFT` | Started but not submitted | Hidden |
| `PENDING_REVIEW` | Submitted to platform review | Hidden |
| `CHANGES_REQUESTED` | Reviewer needs more information | Hidden |
| `APPROVED` | Eligible for public coach discovery | Visible |
| `REJECTED` | Application declined | Hidden |
| `SUSPENDED` | Previously approved but temporarily unavailable | Hidden |

The current `CoachProfile.verificationStatus` can continue to control public
visibility during the transition. A dedicated `CoachApplication` record should
own submission state, reviewer, review timestamps, decision reason, and an
append-only review history.

## Web screens

### Shared

- Sign in
- Forgot/reset password
- Workspace selector
- Account and security settings
- Sign out from all devices

### Coach workspace

- Application status
- Coach profile editor
- Qualifications and supporting documents
- Availability and service area
- Public profile preview
- Club affiliations and affiliation requests
- Profile visibility/status

### Platform Admin additions

- Coach application review queue
- Application detail and document review
- Approve, reject, request changes, suspend
- Review history and audit trail
- Search users by `PLAYER`, `COACH`, and `CLUB_STAFF`

## Backend/API work

Add a coach-application module with:

- `POST /coach-applications`
- `GET /coach-applications/me`
- `PATCH /coach-applications/me`
- `POST /coach-applications/me/submit`
- `GET /platform-admin/coach-applications`
- `GET /platform-admin/coach-applications/:id`
- `POST /platform-admin/coach-applications/:id/decision`
- `GET /coach-invitations`
- `POST /coach-invitations/:token/accept`
- `POST /coach-affiliations/:clubId/request`

The existing routes should be retained and tightened:

- `GET /coaches` and `GET /coaches/:id` must return only approved, active
  profiles.
- `POST /clubs/:clubId/coaches` remains an owner/admin action, but should create
  an auditable invitation or affiliation event.
- Coach profile updates must be limited to the authenticated coach or authorized
  club/platform staff.

## Data model direction

Add:

- `CoachApplication`
  - `id`, `userId`, `status`
  - application fields and document references
  - `submittedAt`, `reviewedAt`, `reviewerId`
  - `decisionReason`, `createdAt`, `updatedAt`
- `CoachApplicationEvent`
  - application, actor, previous state, next state, note, timestamp
- `CoachInvitation`
  - club, inviter, invited user/email, token hash, status, expiry
- Optional `CoachAffiliationRequest`
  - coach, club, requester, status, decision metadata

Use existing `CoachProfile` for the public approved profile and existing
`CoachClubAffiliation`/`ClubMembership` relationships for club membership.
Do not duplicate the user identity or create a second password/account system.

## Recommended delivery order

1. Create the shared role-aware web shell and authentication context response.
2. Add coach application draft/save/submit flow.
3. Add Platform Admin review queue and audit events.
4. Add coach workspace and public profile preview.
5. Add coach views for club invitations and affiliation requests; club-side
   management remains in Club Admin.
6. Migrate the current Club Admin coach creation path to the same application
   and audit model.
7. Add the equivalent mobile onboarding screens and deep links later.

## Acceptance criteria for the interim release

- A new coach can apply entirely on the web without mobile access.
- A coach can accept an invitation or request affiliation with an existing club.
- A coach cannot see club data outside their authorized affiliation.
- An unapproved coach is not returned by public coach search.
- Platform Admin can review every application and see the complete decision
  history.
- Club staff and coaches use the same login entry point but receive different
  navigation and server-enforced permissions.
- The mobile app can later consume the same application/profile APIs without a
  migration to a second identity system.
