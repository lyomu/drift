# 06 — Domain Model & Technical Architecture

**Drift Tennis — Phase 1 Foundation, Document 6 of 7**

---

## 1. Core Domain Model

```
USER
 ├── id, identity, auth credentials, contact preferences
 ├── connections[]                       (→ other Users)
 ├── notification preferences
 ├── subscription/entitlement
 ├── account settings, roles[]           (platform/club roles — §3)
 │
 ├── TENNIS PROFILE  (1:1, created at onboarding — always present)
 │     ├── singlesRating, doublesRating, overallRating
 │     ├── systemSuggestedLevel, userSelectedLevel   (stored separately, never merged)
 │     ├── SkillDevelopmentProfile (Serve, Forehand, Backhand, Return, NetPlay, Movement, MatchPlay)
 │     ├── AssessmentHistory[]
 │     ├── preferences (format, style, times, hand)
 │     ├── goals[]
 │     ├── achievements[]
 │     └── competitionHistory[]
 │
 └── PADEL PROFILE  (0:1, optional — created only via + Add Padel)
       ├── rating
       ├── SkillDevelopmentProfile (Padel dimensions)
       ├── AssessmentHistory[]
       ├── preferences (side, partner)
       ├── goals[]
       ├── achievements[]
       └── competitionHistory[]

COURT / VENUE
 ├── id, name, address, coordinates, sport(s) supported
 ├── surface, indoor/outdoor, lighting, amenities[], openingHours
 ├── contact (phone, website), bookingInfo (external link | none | native-partner)
 ├── googlePlacesRef (optional enrichment, never fabricated if absent)
 ├── verificationStatus (Unverified | Pending | Verified)
 └── clubId (optional — a court may be independent or club-owned)

CLUB / COMMUNITY
 ├── id, name, profile (photos, amenities, hours, booking contacts)
 ├── members[] (→ User, with role)
 ├── courts[] (→ Court)
 ├── coaches[] (→ Coach)
 ├── competitions[] (→ League/Ladder/Tournament)
 ├── verificationStatus
 └── subscriptionStatus

COACH
 ├── id, User reference (a coach is a User with a Coach profile extension)
 ├── bio, qualifications, experience, specialisations[]
 ├── availability
 ├── clubAffiliations[]
 └── verificationStatus

MATCH
 ├── id, sport (Tennis | Padel), format (Singles | Doubles)
 ├── participants[] (→ User, 2 or 4)
 ├── proposedTimes[], confirmedTime
 ├── court (→ Court, optional until confirmed)
 ├── state: Proposed → Scheduling → Scheduled → (Rescheduled | Cancelled | Expired) → Completed | Walkover | Retired | Disputed
 ├── score (set-by-set)
 ├── competitionContext (optional → League/Season/Round/Fixture)
 ├── submittedBy, confirmedBy, disputeRecord (both submitted versions, resolution)
 └── reflection (optional, per participant)

LEAGUE / LADDER / TOURNAMENT  (Competition, sport-scoped)
 ├── id, sport, type (League | FlexLeague | Ladder | Tournament), name, rules, format
 ├── clubId (or platform-run)
 ├── state: Draft → RegistrationOpen → RegistrationClosed → Scheduled → Active → Completed | Cancelled
 ├── seasons[] (League/FlexLeague only)
 └── registrations[], waitlist[]

SEASON
 ├── id, leagueId, dates, roundCount
 ├── state (mirrors Competition state model)
 ├── rounds[]
 └── standings[]

ROUND
 ├── id, seasonId, index, deadline
 └── fixtures[] (→ Match, with Fixture-specific wrapper for walkover/no-show/bye)

STANDING
 ├── seasonId or ladderId, playerId, rank, points, W/L, movement

NEWS SOURCE / NEWS STORY
 ├── NewsSource: id, feedUrl/apiConfig, status (Active|Paused|Blocked)
 ├── NewsStory: id, sourceId, headline, publisher, image, highlight (platform-generated summary), publicationDate, category[], topics[], originalUrl, moderationStatus

LEARNING CONTENT
 ├── id, type (Lesson|Drill|TrainingPlan), sport, targetSkill, level, media, status (Draft|Published)

PRACTICE SESSION
 ├── id, userId, sportProfileId, date, duration, skillFocus, drillRef (optional), notes, perceivedPerformance

GOAL
 ├── id, sportProfileId, skill, baseline, target, deadline, milestones[], status (OnTrack|Behind|Achieved)
```

### Design rule carried from Document 1

Rating, assessment, skill development, match history, and competition history are attributes of the **sport profile** (Tennis or Padel), never of the User directly. This is what lets Padel exist without ever touching Tennis data, and what lets a future third sport be added by adding another optional profile type — not by modifying User or any existing profile.

## 2. Key Business Rules (referenced from Document 3 journeys)

- **Suggested vs. Selected Level:** `systemSuggestedLevel` is immutable once calculated for a given assessment run; `userSelectedLevel` is the value actually used for matchmaking/display, and can be re-adjusted any time from Profile without retaking the full assessment (a lightweight "Adjust Level" action).
- **Competitive Rating vs. Skill Development:** two independent fields, never derived from one another. Rating trends toward being driven by verified match results over time (result confirmation, opponent strength, competition level); Skill Development is driven by assessment + practice logs + match reflections + (future) coach feedback.
- **Unplayed matches at round/season close:** default rule = unplayed fixture becomes a `Walkover` in favour of neither player (both receive a neutral no-result) unless the league's configured rule (set by Club Admin, Document 4 → Rules & Scoring Config) specifies otherwise (e.g., "earliest proposer wins by default", "both forfeit").
- **Dispute resolution:** a disputed result is never silently auto-resolved. It requires either mutual re-confirmation or a Club Admin / Platform Admin ruling, and the resolution reason is always audit-logged.
- **Court data integrity:** availability and booking capability are never fabricated. A field with no verified source renders as "Unknown" / hidden, not a guessed value.
- **News republication:** Drift stores headline, publisher, image (where permitted), a platform-generated short highlight, and a link to the original — never the full third-party article body.

## 3. Roles & Permissions

### Player-facing roles (Mobile)
| Role | Scope |
|---|---|
| **Player** | Default role for every registered user; full access to their own Tennis/Padel profiles and all pillar features |
| **Coach** | A Player with a Coach profile extension; additionally discoverable in Coach listings and (P1) able to submit development feedback on a learner who has granted access |

### Club Admin roles (Next.js Club Admin)
| Role | Scope |
|---|---|
| **Owner** | Full control of the club record, billing, and all Admin/Competition Manager/Coach/Content Manager assignments |
| **Admin** | Full operational control (members, competitions, courts, coaches, announcements, reports) — no billing/ownership transfer |
| **Competition Manager** | Create/manage competitions, fixtures, results, disputes, standings only |
| **Coach** (club context) | Manage own coach profile/availability; view own learners only |
| **Content / Community Manager** | Announcements, community moderation queue, media library only |
| **Read-only** | View all club-admin screens, no write actions |

### Platform Admin roles (Next.js Platform Admin)
| Role | Scope |
|---|---|
| **Super Admin** | Full platform access including role management, feature flags, and financial actions |
| **Operations** | Users, organizations, venues, disputes — no financial or configuration actions |
| **Trust & Safety** | Reported content, moderation, suspensions — no financial or configuration actions |
| **Content** | News sources/moderation, learning content library — no user/financial actions |
| **Finance** | Commercial module (plans, invoices, payments, promotions) — no user moderation actions |
| **Read-only / Analyst** | Full read access to Overview/Analytics, no write actions anywhere |

**Least-privilege principle:** every Platform Admin action that changes state (suspension, refund, verification decision, config change, role change) is attributed to the acting Super Admin/Operations/etc. user and written to the Audit Log (Document 4, Platform Admin → Audit Logs) — never a silent system action.

## 4. Privacy Requirements

- **Never publicly exposed:** precise player location/coordinates, private contact information (phone/email), full availability calendar detail, sensitive account information (payment details, security settings).
- **What discovery uses instead:** general location/city-level proximity, a coarse distance band ("~3km away" not a pin), preferred courts/clubs, an availability *summary* ("usually free weekend mornings") rather than a live calendar.
- **User-controlled visibility:** players can restrict who sees match history, statistics, and development areas (e.g., visible to connections only vs. everyone) via Privacy Settings (Document 4, A.10).
- **Safety actions available everywhere a player is surfaced:** Block Player, Report Player, Report Message, Report Content, Manage Connection Requests.
- **Data subject rights:** account export and deletion are first-class flows (Document 4: Delete Account on mobile; Privacy Requests queue on Platform Admin) — deletion cascades player-identifying data while preserving anonymised aggregate stats needed for competition integrity (e.g., a completed season's historical standings retain the result, not the erased user's PII).
- **Minors / age-gating:** registration requires an age confirmation; the specific policy (parental consent flow, minimum age) is a P1 legal/compliance decision to finalise before launch, flagged here as an open dependency rather than assumed.

## 5. Analytics & Event Taxonomy

Every event below must map to a specific product decision it informs — no event is tracked "just in case."

### Registration & Onboarding
`registration_started` · `registration_completed` · `assessment_started` · `assessment_question_answered` · `assessment_completed` · `level_confirmed` · `level_adjusted` · `onboarding_abandoned` (with last-completed-step, powers interruption-recovery UX and funnel drop-off analysis)

### Discovery & Connections
`player_viewed` · `player_filtered` · `connection_requested` · `connection_accepted` · `connection_declined` · `player_blocked` · `player_reported`

### Matches
`match_challenge_sent` · `match_time_proposed` · `match_court_suggested` · `match_confirmed` · `match_rescheduled` · `match_cancelled` · `match_completed` · `result_submitted` · `result_confirmed` · `result_disputed` · `dispute_resolved` · `match_reflection_submitted`

### Competitions
`league_viewed` · `league_joined` · `league_waitlisted` · `round_fixture_generated` · `standings_viewed` · `tournament_registered` · `event_registered`

### Discovery — Courts, Clubs, Coaches
`court_viewed` · `court_contacted` · `court_booking_clicked` · `court_info_reported` · `club_viewed` · `club_joined` · `coach_viewed` · `coach_contacted`

### Development
`lesson_started` · `lesson_completed` · `drill_completed` · `training_plan_started` · `goal_created` · `goal_achieved` · `practice_logged` · `skill_assessment_retaken`

### News & Community
`news_story_viewed` · `news_source_opened` · `news_story_saved` · `topic_followed` · `announcement_viewed` · `community_post_created`

### Padel
`padel_interest_recorded` (from onboarding prompt) · `padel_added` · `padel_assessment_completed`

### Platform health (informs Document 7 success metrics from the BRD)
`app_opened` · `session_duration` · `push_notification_delivered` · `push_notification_opened` · `subscription_upgraded` · `subscription_cancelled`

**Key funnels this taxonomy powers:** Registration → Onboarding completion; Assessment start → completion (identifies where the adaptive engine loses people); Player viewed → Connection → Match confirmed → Match completed (the core "does discovery lead to actual play" funnel); League viewed → joined → season completed (competition stickiness); Practice logged / Goal created → Goal achieved (does development feel real).

## 6. Technical Design-System Mapping (cross-reference)

Full mapping detail lives in Document 5 §11. Summary: platform-neutral semantic tokens (colour, type, spacing, radius, elevation, breakpoints) are defined once and consumed by Flutter via `ThemeData`/`ThemeExtension` and by Next.js via CSS custom properties + Tailwind config — identical token names across both, so the design system reads as one system regardless of which app you're in.

## 7. NestJS Backend — Capability Map (mobile-driven, per Document 1 build order)

| Module | Responsibilities |
|---|---|
| **Auth & Identity** | Registration, login, verification, password reset, session/JWT handling, role assignment |
| **Users & Profiles** | User record, Tennis Profile, Padel Profile, preferences, privacy settings |
| **Assessment Engine** | Adaptive question delivery, branching logic, level calculation |
| **Players & Connections** | Discovery search/filtering, connection requests, block/report |
| **Matches** | Challenge/scheduling state machine, score submission/confirmation, dispute handling |
| **Competitions** | League/Ladder/Tournament/Season/Round/Fixture/Standings logic |
| **Courts & Venues** | Court records, Google Places integration, verification status |
| **Clubs & Communities** | Club records, membership, announcements (read side for mobile; write side is Club Admin, later phase) |
| **Coaches** | Coach profiles, discovery |
| **Learning & Development** | Content catalogue, skill development calculation, practice logs, goals |
| **News** | Source ingestion jobs, summarisation, moderation queue, redirect handling |
| **Notifications** | Push (FCM)/email delivery, preference matrix, templates |
| **Payments** (P1) | Entitlements, subscriptions, provider-agnostic payment abstraction |
| **Analytics** | Event ingestion pipeline feeding the taxonomy in §5 |
| **Admin & Audit** (later phase) | Club Admin and Platform Admin API surface, audit logging |

---
*Previous: [`05-design-system.md`](./05-design-system.md) · Next: [`07-mvp-roadmap.md`](./07-mvp-roadmap.md)*
