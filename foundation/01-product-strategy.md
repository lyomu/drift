# 01 — Product Strategy

**Drift Tennis — Phase 1 Foundation, Document 1 of 7**

---

## 1. Product Vision

Build a modern Tennis ecosystem that helps players **discover** where and who to play, **play** more Tennis, **compete** in structured formats, **improve** through a real development system, **connect** with a local Tennis community, and **follow** the sport they love — all inside one coherent product.

Drift Tennis exists to create a continuous, self-reinforcing player loop:

```
DISCOVER → PLAY → COMPETE → IMPROVE → CONNECT → PLAY AGAIN
```

Every feature must serve this loop. A feature that doesn't move a player closer to their next match, their next skill milestone, or their next community connection does not belong in the product.

## 2. Product Positioning

Drift Tennis is a **Tennis-first platform**. Tennis is the primary identity, the primary experience, the primary market positioning, and the primary product focus.

- **PRIMARY: Tennis.** All onboarding, product language, competition modelling, content, and MVP priority centre on Tennis.
- **SECONDARY: Padel.** Padel is a real, supported capability and a genuine growth vector — not a token gesture — but it is never given equal visual or navigational prominence by default. It is opt-in, additive, and contextual (`Profile → My Sports → + Add Padel`).

We do **not** position Drift as a generic "racket sports" or "multi-sport" platform. A prospective user's first five seconds in the product should say *Tennis*, unambiguously.

The technical architecture is nonetheless built to extend cleanly to Padel (and, longer-term, to other racket sports) without a rebuild. See [`06-domain-technical-architecture.md`](./06-domain-technical-architecture.md) for the domain model that makes this possible (`User → Tennis Profile → optional Padel Profile`).

### Positioning statement

> For Tennis players of every level — from someone who's never picked up a racket to a club competitor chasing a national ranking — Drift Tennis is the app that turns "I should play more Tennis" into an actual match, an actual improvement plan, and an actual community. Unlike generic sports-social apps or fragmented tools (a booking app here, a WhatsApp group there, a spreadsheet ladder somewhere else), Drift unifies discovery, play, competition, development, and community in one Tennis-native product.

## 3. Reference Product — Scala Sports

Scala Sports has been studied as a competitive UX/product reference for concepts including: onboarding, player level estimation, player profiles, ratings, player discovery, connections, messaging, match history, leagues, seasons, rounds, fixtures, results, standings, league rules, registration, waitlists, achievements, notifications, match scheduling, and competition management.

**Explicit rule:** Drift Tennis does not clone Scala's UI, branding, proprietary wording, or screen layouts, and does not assume every Scala interaction pattern is optimal. Scala screenshots inform *what problems a mature competition/discovery product must solve* — the underlying user need — not *how the screen should look*. Every journey and screen in this foundation is designed originally against that underlying need, and several places explicitly improve on patterns Scala left ambiguous (see the Product Opportunities in the source BRD, e.g. structured scheduling actions instead of relying on freeform chat, explicit competition/match state models, and separating competitive rating from skill development).

## 4. Target Audiences

| Segment | Who they are | What blocks them today |
|---|---|---|
| **Beginner player** | New or near-new to Tennis, unsure of their level, intimidated by "real" players and competitive apps | No idea where to start, no beginner-safe way to find similarly-leveled players, no structured way to learn |
| **Developing player** | Plays casually/socially, knows the basics, wants to get better and play more often | No way to measure improvement, no structured practice, hard to find compatible opponents |
| **Competitive player** | Plays leagues/ladders/tournaments, tracks results and ranking seriously | Fragmented tools (WhatsApp + spreadsheets + separate booking sites), no unified rating/stats, poor dispute handling |
| **Coach** | Independent or club-affiliated coach offering lessons | No digital visibility, no simple way to manage learners, drills, and feedback in one place |
| **Club / community admin** | Runs a club, academy, or informal Tennis community; manages courts, members, events | No lightweight tool for competitions, member communication, or court/venue visibility |
| **Platform admin / operations** | Internal Drift team: support, content, compliance, growth | Needs safe, auditable control over users, content, venues, and moderation as the platform scales |

## 5. Personas

### Persona 1 — "Amara," the Beginner
- 27, picked up a racket for the first time eight months ago at a friend's invitation.
- Plays maybe once a month because she doesn't know who else is "bad enough" to play with her.
- Goal: **learn the game without embarrassment**, meet people at her level, understand if she's actually improving.
- Fear: joining a league or app full of intimidating "serious" players.
- Needs from Drift: an onboarding that meets her where she is, a level estimate she can trust, beginner-safe player discovery, bite-sized learning content.

### Persona 2 — "Kevin," the Developing Social Player
- 34, played through school, picked it back up two years ago, plays weekly with a rotating group of friends.
- Wants to get more competitive without fully committing to a league yet, and wants to know objectively if his serve/backhand is actually getting better.
- Needs from Drift: flexible match scheduling beyond his existing group, a real development profile (not just a win/loss record), a nearby-court finder for spontaneous games.

### Persona 3 — "Njeri," the Competitive League Player
- 41, plays club Tennis 3-4 times a week, competes in local leagues and the occasional tournament, cares deeply about her rating.
- Currently manages this across a WhatsApp group, a shared spreadsheet, and a separate court-booking app — and disputes about scores are a recurring headache.
- Needs from Drift: trustworthy structured competitions (leagues/ladders/seasons), a rating that reflects verified results, low-friction match scheduling with a real opponent (not just chat), clean standings and match history.

### Persona 4 — "Coach Otieno," the Independent Coach
- Runs private and small-group lessons at two clubs; wants more visibility and an easier way to track learner progress across sessions.
- Needs from Drift: a discoverable coach profile, a lightweight way to see what a learner's development profile looks like, a booking/contact channel that doesn't require a separate tool.

### Persona 5 — "Grace," the Club Admin
- Manages a 150-member Tennis club: court schedules, a Tuesday ladder, a monthly social event, and constant WhatsApp-based announcements.
- Needs from Drift: a simple web dashboard to run competitions, manage members, post announcements, and keep the club's court/venue info accurate and visible — without needing platform-admin-level power.

### Persona 6 — "Platform Ops" (internal)
- Drift's internal support/content/compliance/growth team.
- Needs from Drift: visibility and control over users, clubs, venues, competitions, disputes, content moderation, and revenue — with full audit trails and least-privilege roles.

## 6. Jobs-to-be-Done

Framed as *"When [situation], I want to [motivation], so I can [outcome]."*

**Players:**
1. When I want to play Tennis this week, I want to find someone at my level nearby, so I can get a match on the calendar without a group chat back-and-forth.
2. When I'm new to Tennis, I want an honest, non-intimidating read on my level, so I can find opponents I won't be crushed by (or bore).
3. When I finish a match, I want to record the result in a way both players trust, so my rating and history stay accurate without an argument.
4. When I want to get better, I want to know specifically what part of my game is weakest, so I can practice with purpose instead of guessing.
5. When I'm free on a Saturday, I want to find a court near me and know how to book or contact it, so I don't waste time calling around.
6. When I want more structured competition, I want to join a league or ladder with clear rules and standings, so my results actually mean something.
7. When I want to stay in the loop, I want relevant Tennis news and club announcements, so I don't have to hunt across five different sources.

**Coaches:**
8. When someone is looking for lessons, I want to be discoverable with my specialisation and availability visible, so I can grow my client base.

**Club admins:**
9. When I run a club competition, I want to manage registration, fixtures, results, and disputes in one place, so I'm not stitching together spreadsheets and group chats.
10. When I need to reach my members, I want to separate official announcements from casual chat, so important information doesn't get lost.

**Platform operators:**
11. When the platform grows, I want visibility into venues, clubs, users, and disputes with clear audit trails, so I can operate safely and scale to new markets.

## 7. Product Pillars

| Pillar | What it delivers |
|---|---|
| **PLAY** | Find opponents, challenge players, arrange and schedule matches, select courts, play, record results. |
| **COMPETE** | Leagues, flex leagues, ladders, tournaments, seasons, rounds, fixtures, standings, rankings, results. |
| **DISCOVER** | Players, courts, clubs, coaches, events, competitions, and Tennis opportunities nearby. |
| **IMPROVE** | Initial assessment, skill development, lessons, drills, training, practice tracking, goals, progress. |
| **FOLLOW** | Tennis news, professional Tennis, players, tournaments, local Tennis, competition updates. |
| **CONNECT** | Connections, opponents, friends, clubs, communities, messaging, announcements. |

These six pillars are the organising logic behind the information architecture (Document 2), the navigation model, and the feature map below.

## 8. Complete Feature Map

```
DRIFT TENNIS
│
├── IDENTITY & PROFILE
│   ├── Authentication (register/login/verify/password reset)
│   ├── Tennis Profile (rating, singles/doubles rating, stats, achievements)
│   ├── Skill Development Profile (Serve/Forehand/Backhand/Return/Net/Movement/Match Play)
│   ├── Preferences (format, style, availability, location, club/courts)
│   ├── My Sports (Tennis default; + Add Padel)
│   └── Settings (privacy, notifications, subscription, account)
│
├── PLAY
│   ├── Player Discovery (search, filters, profiles)
│   ├── Connections (connect/accept/decline/block/report)
│   ├── Match Challenge (challenge, propose time, suggest court, counter-propose)
│   ├── Match Scheduling (confirm, reschedule, cancel, book court)
│   ├── Match Play & Results (score entry, confirmation, dispute)
│   └── Match History & Statistics (recent form, win/loss, head-to-head)
│
├── COMPETE
│   ├── Leagues & Flex Leagues (discovery, registration, waitlist, rules)
│   ├── Seasons & Rounds (enrollment, opponents, fixtures)
│   ├── Ladders
│   ├── Tournaments (draws, brackets, events)
│   ├── Standings & Rankings
│   └── Disputes & Walkovers/Retirements
│
├── DISCOVER
│   ├── Court Finder (map/list, filters, court profile, directions, booking/contact)
│   ├── Club Discovery (club profile, membership)
│   ├── Coach Discovery (coach profiles, specialisations, booking/contact)
│   └── Event Discovery
│
├── IMPROVE
│   ├── Adaptive Assessment Engine (onboarding + re-assessment)
│   ├── Skill Development Profile & Skill Detail
│   ├── Learning Centre (lessons, drills, training plans by skill/level/goal)
│   ├── Practice Tracking (lightweight session log)
│   ├── Goals (skill-specific, milestone-based)
│   └── Progress History & Reports
│
├── FOLLOW
│   └── Tennis News (categorised feed, source-attributed, save/share/follow-topic)
│
├── CONNECT
│   ├── Messaging (direct messages, system/match messages)
│   ├── Community (club feed, groups, official announcements vs. conversation)
│   └── Achievements
│
├── PADEL (secondary, additive)
│   ├── Add Padel (Profile → My Sports)
│   ├── Padel Profile, Rating, Assessment
│   ├── Padel Match History & Statistics
│   └── Contextual Padel filters (Players/Courts/Compete/Learn)
│
├── CLUB / COMMUNITY ADMIN (Next.js — later phase)
│   ├── Dashboard, Members, Competitions, Fixtures/Results/Standings
│   ├── Courts & Court Bookings, Coaches
│   ├── Announcements & Community Moderation
│   └── Reports & Settings
│
└── PLATFORM ADMIN (Next.js — later phase)
    ├── Users, Organizations/Clubs, Venues, Competitions
    ├── News Sources & Moderation, Learning Content
    ├── Subscriptions & Payments
    └── Analytics, Configuration, Roles, Audit Logs, Platform Health
```

## 9. Tennis-First Product Architecture

### Ecosystem overview

Drift Tennis is one product delivered as four coordinated parts:

| Part | Tech | Primary users | Status |
|---|---|---|---|
| **Player Mobile App** | Flutter (iOS/Android) | Players, learners, coaches (as players), match participants | **Build first** |
| **Club / Community Admin Web App** | Next.js | Club owners, competition managers, coaches, content managers | Deferred — begins after mobile reaches a stable milestone |
| **Platform Admin Dashboard** | Next.js | Internal ops, support, finance, content, compliance, growth | Deferred — begins after Club Admin core operations are stable |
| **Backend / API** | NestJS | Powers all three front ends; auth, domain logic, integrations, jobs | Built incrementally, mobile-driven first |

All four share one design system (tokens defined once, mapped into Flutter and Next.js — see Document 5), one domain model (Document 6), and one product vocabulary (a "Fixture" means the same thing everywhere). This foundation documents all four parts so the ecosystem is coherent end-to-end, even though **implementation order is mobile-first** (see [`07-mvp-roadmap.md`](./07-mvp-roadmap.md)).

### Domain model summary

Full detail lives in [`06-domain-technical-architecture.md`](./06-domain-technical-architecture.md). The headline shape:

```
USER (identity, auth, contact prefs, connections, notifications, subscription)
 │
 ├── TENNIS PROFILE (primary, created at onboarding)
 │     rating · singles/doubles rating · assessment · skill development
 │     match history · statistics · preferences · goals · achievements
 │     competition history
 │
 └── PADEL PROFILE (optional, additive — Profile → My Sports → + Add Padel)
       padel rating · padel assessment · padel skills · padel match history
       padel statistics · padel preferences · padel goals · padel achievements
```

Supporting entities: **Court/Venue, Club/Community, Coach, Match, League/Season/Round/Fixture, Standing, NewsStory, LearningContent, PracticeSession, Goal.** Each is defined in full in Document 6.

### Why this architecture holds up under Padel expansion

- Rating, assessment, and development are modelled **per sport profile**, not on the User — so Padel never has to borrow or overwrite Tennis data.
- Discovery, competitions, and courts are all **sport-scoped** at the query level (a court has sport-specific court types; a competition has a sport field) — extending to Padel means adding a value, not a new system.
- The UI enforces "Tennis is default" as a navigation/IA rule (Document 2), not a database rule — so the same backend can one day support equal-prominence multi-sport if the product strategy ever changes, without a schema rebuild.

---
*Next: [`02-information-architecture.md`](./02-information-architecture.md)*
