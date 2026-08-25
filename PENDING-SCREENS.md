# Pending Screens — Gap vs. `foundation/04-screen-inventory.md`

Reviewed 2026-08-25 against the current state of `mobile/`, `club-admin/`, `platform-admin/`, and `backend/`. Full screen specs (Purpose · Entry Point · Primary Action · Secondary Actions · Data · States · Empty · Error · Connects To) for every row below already exist in [`foundation/04-screen-inventory.md`](foundation/04-screen-inventory.md) — this file only tracks what's built vs. not.

**Current tracked gap: 16 unchecked items — 7 Mobile, 0 Club Admin, and 9 Platform Admin.**

---

## Mobile (Flutter) — 7 pending out of 123

### Confirmed missing or incomplete
- [ ] Achievements List (§A.9) — explicitly deferred in code (`profile_home_screen.dart` comment: "no rules catalogue")
- [x] Coach Discovery / List (§A.6) — implemented end to end with club, specialisation, and player-level filters
- [x] Coach Profile (§A.6) — implemented with qualifications, experience, availability, club links, and explicit public contact handoff
- [x] Upgrade / Plan Selection (§A.11) — sandbox plan comparison and select-to-pay flow backed by the shared payments module
- [x] Payment Method (§A.11) — tokenized card/mobile-money metadata, remove action, specific decline reason, and retry
- [x] Billing History (§A.11) — invoice list, receipt detail, and receipt download
- [x] Subscription / Plan settings screen (§A.10) — current plan, state, renewal period, entitlements, upgrade/downgrade, methods, and history links
- [ ] Global Search (§A.3) — no search bar/FAB on Home
- [ ] Quick Actions Sheet / FAB (§A.3)
- [ ] Video Lesson Player (§A.7) — `content_detail_screen.dart` only launches an external URL; it has no in-app buffering, playing, completed, or playback-error states
- [ ] Assessment Progress interstitial (§A.2) — the assessment question screen has a linear progress indicator but no branch-dependent interstitial or Continue action
- [ ] Connection Request Sent confirmation (§A.4) — Player Profile re-renders a "Request sent" badge, but the consolidated state lacks the specified Done and Cancel Request actions
- [ ] System Message Detail (§A.9) — match-linked system pills navigate directly to Match Detail, but there is no expandable detail behavior or competition-linked handling

---

## Club / Community Admin (Next.js) — 0 pending out of 44

Sidebar and mobile navigation expose the complete Club Admin surface with role-aware access to owner/admin and content-management sections.

### Entire categories missing
- [x] Coach List
- [x] Add / Edit Coach
- [x] Events Calendar
- [x] Create / Edit Event
- [x] Attendees & Registrations
- [x] Ladder Management

### Missing or incomplete individual screens
- [x] Media Library
- [x] Moderation Queue
- [x] Team Roles (admin team management, distinct from player role assignment already in Members)
- [x] Notification Settings
- [x] Billing / Subscription (club's own platform plan) — owner-only plan management, tokenized methods, and invoice history
- [x] Audit Log
- [x] Engagement Reports
- [x] Court Inquiry Reports
- [x] Event Reports
- [x] Member Export
- [x] Draw Management (bracket seeding) — manual seeding, draw generation, and live/completed bracket inspection are available from Tournament Admin
- [x] Season Archive / Awards — completed/cancelled history includes final standings and participant award issuance
- [x] Rules & Scoring Config — structured scoring format, walkover rules, unfinished-match policy, and additional rules are editable per league

---

## Platform Admin (Next.js) — 9 pending out of 52

Navigation is grouped by the inventory's top-level sections and filtered against each staff role's persisted permissions. Access & Control, Overview / Analytics, Venues, Organizations, Competitions, Content, and Commercial are complete; the categories below remain the live worklist.

### Access & Control
- [x] 2FA Verification (post-login step)
- [x] Role Management
- [x] Team Users
- [x] Permission Matrix

### Overview / Analytics
- [x] Market / City Dashboard
- [x] Growth Analytics
- [x] Revenue Dashboard
- [x] System Health

### Venues
- [x] Venue Database
- [x] Add / Edit Venue
- [x] Google Places Sync Status
- [x] Verification Workflow
- [x] Duplicate Merge

### Organizations
- [x] Club List
- [x] Club Detail
- [x] Admin Approvals
- [x] Subscription Status
- [x] Community Moderation

### Competitions
- [x] Global Competitions
- [x] Rulesets

### Content
- [x] Content Library
- [x] Create Lesson
- [x] Create Drill
- [x] Skill Category / Learning Path Builder

### Commercial
- [x] Plans
- [x] Invoices / Payments
- [x] Promotions
- [x] Sponsors / Ads

### Trust & Safety
- [ ] Reported Content Queue
- [ ] Block / Abuse Cases

### Platform config
- [ ] Countries / Cities
- [ ] Feature Flags
- [ ] Notification Templates
- [ ] System Settings
- [ ] API / Integration Settings

### Support
- [ ] Support Tickets
- [ ] Privacy Requests

---

## Implementation Prompt

The block below is written to be handed to a fresh Claude Code session with no memory of this conversation — paste it as-is to kick off implementation.

```
I need you to close the gap between foundation/04-screen-inventory.md (the
219-screen spec for Drift Tennis) and the current state of the codebase.
PENDING-SCREENS.md at the repo root lists every screen that's missing or
unverified, grouped by app (Mobile Flutter, Club Admin Next.js, Platform
Admin Next.js) with checkboxes. Treat that file as the source of truth for
scope and check items off as you land them — it doubles as the tracker.

Before writing any code, read:
- foundation/04-screen-inventory.md — for every screen you touch, read its
  full row (Purpose, Entry Point, Primary Action, Secondary Actions, Data,
  States, Empty, Error, Connects To) before implementing it. Don't guess at
  behavior the row already specifies.
- foundation/05-design-system.md — design tokens, component patterns.
- foundation/06-domain-technical-architecture.md — data model / API shape
  conventions for whatever backend module you're adding.
- PENDING-SCREENS.md — the actual worklist.

Match existing conventions exactly — don't introduce new patterns:

MOBILE (mobile/lib/):
- Feature-first folders: lib/features/<feature>/{application,data,presentation}/
  (application = riverpod providers/state, data = repository classes,
  presentation = screens/widgets). Look at lib/features/matches/ or
  lib/features/competitions/ as reference examples before adding a new
  feature folder.
- Routing: every screen gets registered in lib/core/router/app_router.dart
  as a GoRoute — follow the existing path-naming scheme (e.g.
  /discover/coaches, /discover/coaches/:id).
- State: flutter_riverpod. Theme/tokens: lib/core/theme/ (Outfit + Sharp
  Sans Display is the locked typeface pairing — don't touch font choices).
- Prefer consolidating related inventory rows into one state-driven screen
  where the existing codebase already does this (e.g. MatchDetailScreen
  handles the whole challenge/match lifecycle in one file) rather than
  creating a 1:1 screen-per-row — but only when the consolidated screen can
  still satisfy every state/empty/error case the spec rows require.

CLUB ADMIN (club-admin/):
- Next.js App Router: app/(dashboard)/<feature>/page.tsx, with
  app/(dashboard)/<feature>/[id]/page.tsx for detail views and
  app/(dashboard)/<feature>/new/page.tsx for create forms (see
  app/(dashboard)/courts/ for the pattern).
- Shared UI primitives live in components/ui.tsx (Button, Card, Field,
  Input, Select, Textarea, PageHeader, ErrorBanner, EmptyState, Badge,
  statusTone) plus components/DataTable.tsx and components/StatusBadge.tsx
  — reuse these, don't reinvent table/form chrome.
- Data fetching via lib/api-client.ts (api.get/post/patch/delete +
  ApiError), club-scoping via lib/club-context.tsx (useClub() gives
  clubId, role, canManage pattern — OWNER/ADMIN gate mutations).
- Every new top-level feature needs a link added to components/Sidebar.tsx.
  Note: tournaments/page.tsx already exists but is missing from the
  sidebar — add that link as your first, trivial fix.

PLATFORM ADMIN (platform-admin/):
- Same Next.js App Router conventions as Club Admin but thinner — check
  platform-admin/app/(dashboard)/users/ and .../news/ for the current
  reference pattern, and platform-admin/components/ui.tsx for available
  primitives (extend it if Club Admin's ui.tsx has something this one
  lacks — keep the two roughly in sync).
- Nav list lives in platform-admin/app/(dashboard)/layout.tsx — add new
  sections there. Given the volume of missing screens here, group nav
  items into the same top-level sections PENDING-SCREENS.md uses (Access &
  Control, Overview/Analytics, Venues, Organizations, Competitions,
  Content, Commercial, Trust & Safety, Platform config, Support) rather
  than one long flat list.

BACKEND (backend/src/):
- NestJS, one module folder per domain (controller/service/module +
  Prisma access). Existing modules: analytics, assessment, auth,
  club-admin, club-feed, clubs, coaches, competitions, connections,
  courts, home, learning, matches, messaging, news, notifications, padel,
  platform-admin, players, safety, users.
- The `coaches` module already exists but has no consuming frontend
  anywhere — wire Mobile Coach Discovery/Profile and Club Admin Coach
  List/Add-Edit to it before assuming you need new endpoints; check
  backend/src/coaches/ first.
- New backend modules needed: payments (mobile Payments screens + Club
  Admin Billing/Subscription + Platform Admin Commercial section all
  depend on this — build it once, shared), achievements, events (club-run
  events, distinct from the existing club-feed module), plus whatever
  Platform Admin's Access & Control / Venues / Platform config sections
  need (check backend/src/platform-admin/ for what's already stubbed vs.
  missing before adding new modules).
- Match backend/prisma/schema.prisma conventions already in use for new
  models (naming, relations, enums for state machines like the
  Draft/Registration Open/Active/Completed pattern used everywhere else).

Suggested phasing (adjust if you find a better dependency order once you're
in the code):
1. Verify the "needs a manual check" rows in PENDING-SCREENS.md first —
   some may already be satisfied by existing screens, which shrinks scope
   before you start building.
2. Coaches end-to-end (Mobile Discovery/Profile + Club Admin List/Add-Edit)
   — backend already exists, so this is the fastest real gap to close.
3. Payments backend module + Mobile Payments screens + Club Admin
   Billing/Subscription — build the payments module once, consume it from
   both.
4. Remaining Club Admin gaps (Events, Ladder Management, Media Library,
   Moderation Queue, Team Roles, Notification Settings, Audit Log, the
   missing Reports variants).
5. Platform Admin — this is the largest chunk (~45 screens). Go
   category-by-category in the order listed in PENDING-SCREENS.md; each
   category is largely independent so it's a good place to checkpoint
   progress.
6. Achievements (Mobile) + Global Search / Quick Actions Sheet (Mobile
   Home) last — smallest scope, least dependent on backend work above.

Process:
- Get a written plan approved before starting multi-file work on each phase
  above — don't jump straight to implementation across a whole phase
  without checking in first, especially for the Platform Admin phase given
  its size.
- Build a full feature (backend + frontend screens for that feature) before
  testing it, then do one testing pass at the end of that feature rather
  than testing after every file.
- Update PROGRESS.md at each phase boundary (not just at the end of a
  session) — follow the existing table format and level of detail already
  in that file.
- Check off items in PENDING-SCREENS.md as you complete them so the file
  stays an accurate live tracker.
```
