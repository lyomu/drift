# 02 — Information Architecture

**Drift Tennis — Phase 1 Foundation, Document 2 of 7**

---

## 1. Mobile App — Navigation Architecture

### 1.1 Top-level structure decision

Evaluated per the brief: **Home / Play / Compete / Discover / Profile** as five bottom-navigation destinations.

**Decision: adopt this five-tab structure**, with one refinement — a **Messaging entry point surfaces as a badge on Profile in v1** rather than claiming a sixth tab, and is promoted to a dedicated tab in a later phase once message volume justifies it. Rationale:

- Five tabs is the practical ceiling for a bottom nav before it feels cluttered on mid-range Android devices (a named non-functional requirement).
- Messaging in Drift is **structured-action-first** (Challenge → Propose Time → Confirm), not a standalone chat product — most message-entry happens *from* a match/challenge/connection context, not by browsing an inbox cold. It doesn't need tab-level prominence the way Play/Compete/Discover do.
- Community content (club feed, announcements) is similarly contextual — reached through the club/community you're already in, not through a global destination.
- Notifications (a candidate sixth destination) live behind a bell icon in the top bar on Home, consistent with the mobile screen inventory.

This will be revisited once real usage data exists (see Document 7, P1 scope) — if DMs become a primary daily behaviour, Messaging graduates to a tab and Discover/Compete absorb the one-tab budget adjustment.

### 1.2 Bottom navigation

```
[ HOME ]   [ PLAY ]   [ COMPETE ]   [ DISCOVER ]   [ PROFILE ]
```

| Tab | Purpose | Contains |
|---|---|---|
| **Home** | "What should I do next?" — personalised, dynamic | Upcoming match, unconfirmed results, league round actions, suggested opponents, nearby courts, development recommendation, progress snapshot, news/community updates, notification bell |
| **Play** | Everything about getting a match on the calendar and played | Find Players, Challenges (sent/received), Match Scheduling, Active Matches, Match History |
| **Compete** | Structured competition | Leagues, Flex Leagues, Ladders, Tournaments, Events, My Registrations, Standings |
| **Discover** | Finding people, places, and opportunities | Players, Courts, Clubs, Coaches, Events (cross-links from Play/Compete land here too) |
| **Profile** | Personal identity, development, and settings | Tennis Profile, Skill Development, Progress, Goals, Achievements, My Sports (+ Add Padel), Messaging, Notifications, Settings |

### 1.3 Full mobile information architecture

```
HOME
 ├── Personalised feed (priority-ordered cards — see Document 3, Home logic)
 ├── Notifications (bell → Notification Centre)
 └── Global search

PLAY
 ├── Find Players
 │    └── Player Profile → Connect / Challenge
 ├── Challenges (Sent / Received / Active)
 ├── Match Scheduling (Propose → Court → Confirm)
 ├── Active/Upcoming Matches
 ├── Result Entry & Confirmation
 └── Match History & Statistics

COMPETE
 ├── Leagues & Flex Leagues
 │    └── League Detail → Rules → Season → Registration/Waitlist → Rounds → Fixtures → Standings
 ├── Ladders
 ├── Tournaments
 │    └── Tournament Detail → Draw/Bracket → Registration
 ├── Events
 └── My Competitions (registrations, active seasons, standings)

DISCOVER
 ├── Players (shared with Play's Find Players — same underlying search)
 ├── Courts
 │    └── Court Map/List → Court Profile → Directions / Contact / Booking
 ├── Clubs
 │    └── Club Profile → Join / Follow → Club Feed
 ├── Coaches
 │    └── Coach Profile → Contact / Booking
 └── Events (shared with Compete's Events)

PROFILE
 ├── Tennis Profile (ratings, stats, match history, achievements)
 ├── Skill Development (Skill Profile → Skill Detail → Goals → Progress)
 ├── Learn (Learning Home → Skill Categories → Lessons/Drills → Training Plans → Saved)
 ├── Practice Log
 ├── My Sports
 │    ├── Tennis (primary, always present)
 │    └── + Add Padel  (if not added) / Padel summary card → Padel Profile (if added)
 ├── Connections (list, pending requests)
 ├── Messaging (Inbox → Chat Thread)
 ├── Community (clubs/communities I'm in → Club Feed, Announcements)
 ├── News (Tennis News feed — reachable from Home and Profile)
 ├── Notifications
 └── Settings
      ├── Edit Profile
      ├── Privacy
      ├── Notification Preferences
      ├── Blocked Users
      ├── Subscription/Plan
      ├── Help & Support
      ├── Terms/Privacy Policy
      └── Delete Account
```

### 1.4 Cross-cutting architecture notes

- **Players, Courts, Events** are discoverable from *both* their natural home (Play/Compete) and Discover — Discover is the generalized "browse & filter" surface; Play/Compete surface the same data pre-filtered by current context (e.g., Play's Find Players defaults to "available now, near my level").
- **No global sport switcher** anywhere in this IA. Padel is reachable only via `Profile → My Sports → + Add Padel`, and — once added — via contextual filters inside Players / Courts / Compete / Learn (a "Padel" chip/filter, not a mode switch).
- **Onboarding is not part of the persistent IA** — it's a one-time linear flow (Document 3) that deposits the user onto Home with a completed Tennis Profile.

## 2. Club / Community Admin Web App — Navigation Architecture

*(Next.js — deferred phase; documented now for ecosystem coherence, per Document 1.)*

```
DASHBOARD
 └── Activity summary, upcoming events, member growth, court engagement, tasks/alerts

MEMBERS
 ├── Member List / Member Detail
 ├── Invitations
 ├── Roles & Permissions
 └── Approval Requests

COMPETITIONS
 ├── Leagues → Seasons → Rounds → Fixtures → Results → Standings
 ├── Ladders
 ├── Tournaments
 ├── Registrations & Waitlists
 └── Disputes

EVENTS
 ├── Events Calendar → Create/Edit Event
 └── Attendees

COURTS
 ├── Court List → Add/Edit Court
 ├── Court Availability / Maintenance Notices
 └── Court Bookings

COACHES
 ├── Coach List → Add/Edit Coach
 └── Coach Availability

COMMUNITY
 ├── Announcements (official — separate from conversational chat)
 ├── Moderation Queue
 └── Media Library

REPORTS
 ├── Engagement, Court Inquiry, Event Reports
 └── Member Export

SETTINGS
 ├── Club Profile (incl. Google profile link, photos, amenities, hours, verification request)
 ├── Notification Settings
 ├── Billing / Subscription
 ├── Team Roles
 └── Audit Log
```

**Navigation model:** left sidebar (persistent, desktop/laptop-first per Document 5's responsive rules), with a top bar for club switcher (an admin may run more than one club) and admin profile.

## 3. Platform Admin Dashboard — Navigation Architecture

*(Next.js — deferred phase; documented now for ecosystem coherence.)*

```
OVERVIEW
 ├── Platform KPI Dashboard
 ├── Market/City Dashboard
 ├── Growth Analytics
 ├── Revenue Dashboard
 └── System Health

USERS
 ├── User List / User Detail / Player Activity
 ├── Flags & Reports
 ├── Support Notes
 └── Suspend / Restore

ORGANIZATIONS
 ├── Clubs / Communities List
 ├── Admin Approvals
 ├── Subscription Status
 └── Community Moderation

VENUES
 ├── Venue Database → Add/Edit Venue
 ├── Google Places Sync Status
 ├── Verification Workflow
 └── Duplicate Merge

COMPETITIONS
 ├── Global Competitions
 ├── Rulesets
 └── Disputes / Escalations

CONTENT
 ├── News Sources → Ingestion Logs → Story Moderation → Topic Tagging
 ├── Learning Content Library → Lessons/Drills/Paths
 └── Media Assets

COMMERCIAL
 ├── Plans, Subscriptions, Payments
 ├── Commissions, Promotions
 └── Sponsors/Ads (if applicable)

TRUST & SAFETY
 ├── Reported Content Queue
 ├── Block/Abuse Cases
 └── Dispute Escalations

PLATFORM
 ├── Countries/Cities Configuration
 ├── Feature Flags
 ├── Notification Templates
 ├── Roles & Permission Matrix
 ├── Audit Logs
 ├── Support Tickets
 └── API / Integration Settings
```

**Navigation model:** left sidebar with module grouping shown above; least-privilege role gating determines which sections a given internal user even sees (full detail in [`06-domain-technical-architecture.md`](./06-domain-technical-architecture.md), Roles & Permissions).

## 4. Shared Cross-App Entities

The same entity means the same thing in all three IAs — this is what keeps the ecosystem coherent:

| Entity | Appears in Mobile as... | Appears in Club Admin as... | Appears in Platform Admin as... |
|---|---|---|---|
| Court/Venue | Discover → Courts | Courts | Venues |
| Competition (League/Ladder/Tournament) | Compete | Competitions | Competitions (global oversight) |
| Club/Community | Discover → Clubs, Profile → Community | (the club being administered) | Organizations |
| Coach | Discover → Coaches | Coaches | Coaches (via Organizations/Verification) |
| News | Follow → News | Content → Learning Resources (club-authored content only) | Content → News Sources/Moderation |
| Announcement | Profile → Community → Club Feed | Community → Announcements | (moderation only, not authored) |

---
*Previous: [`01-product-strategy.md`](./01-product-strategy.md) · Next: [`03-user-journeys.md`](./03-user-journeys.md)*
