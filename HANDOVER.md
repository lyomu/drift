# Handover — Home Rebuild & Polish, Wave 7 (Testing)

Waves 1-6 are code-complete. Nothing has been run. The prompt below is written to be pasted into a fresh session, or handed to another engineer, with no memory of this work.

Full reasoning for every decision lives in [HOME-AND-POLISH-PLAN.md](HOME-AND-POLISH-PLAN.md).

---

```
You are picking up the Drift Tennis "Home rebuild + polish" work at the
testing stage. All the CODE is written across six waves. NOTHING has been
run — no build, no lint, no tests, no migration applied. That was deliberate
(the repo owner works code-first, test-last). Your job is Wave 7: make it all
actually pass, then report honestly on what broke.

READ FIRST:
- HOME-AND-POLISH-PLAN.md (repo root) — the full plan, every wave checked
  off, and the reasoning behind each decision. Wave 7 is what's outstanding.
- PROGRESS.md — project history and the standing "Open Dependencies" list.
- foundation/04-screen-inventory.md section A.3 — the Home Dashboard spec
  this rebuild implements.

WORKING TREE — ALREADY CLEANED UP FOR YOU:
Unrelated in-flight work that predated this pass has been committed as
`0f6f557 chore: checkpoint in-flight work before Home rebuild`. So
`git status` now shows ~50 files, and all of them are this work — you can
review the whole thing with `git diff` plus the untracked files.

Two caveats on that checkpoint commit:
  - It is UNVERIFIED. It is a snapshot of work as found, never built or
    tested. If something fails in a file this work never touched, suspect
    that commit, not this pass.
  - Three files in it (backend/src/achievements/achievements.module.ts,
    mobile achievements + search providers) also carry a one-line edit from
    this pass — an `exports:` addition and two `.autoDispose` conversions.
    They were included because excluding them would have left the commit
    missing a module file whose controller and service were in it.

Files this work created or modified (i.e. everything still uncommitted):

BACKEND (backend/)
  src/home/home-card.ts                                (new: card contract)
  src/home/contributors/                               (new: 12 contributors
                                                        + 3 spec files)
  src/home/home.service.ts                             (rewritten)
  src/home/home.service.spec.ts                        (rewritten)
  src/home/home.module.ts                              (rewritten)
  src/home/home.controller.ts                          (rewritten)
  src/home/dto/dismiss-card.dto.ts                     (new)
  prisma/schema.prisma                                 (+DismissedHomeCard,
                                                        +User back-relation)
  prisma/migrations/20260826120000_add_home_card_dismissals/   (new)
  src/players/players.module.ts                        (exports service)
  src/achievements/achievements.module.ts              (exports service)
  src/players/players.service.ts                       (CANDIDATE_LIMIT)
  src/config/http-security.ts                          (forbidNonWhitelisted)
  src/auth/auth.controller.ts                          (+2 @Throttle)
  src/platform-admin/platform-admin.controller.ts      (+1 @Throttle)
  src/app.module.ts                                    (-AnalyticsModule)
  src/analytics/                                       (DELETED entirely)
  src/payments/payments.service.spec.ts                (new)
  src/payments/sandbox-payment.provider.spec.ts        (new)

MOBILE (mobile/)
  lib/features/home/data/home_repository.dart          (rewritten)
  lib/features/home/application/home_feed_provider.dart (rewritten)
  lib/features/home/presentation/home_screen.dart      (rewritten)
  lib/features/home/presentation/home_header.dart      (new)
  lib/features/home/presentation/cards/                (new: 2 files)
  lib/features/matches/application/matches_providers.dart
  lib/features/players/application/players_providers.dart
  lib/features/connections/application/connections_providers.dart
  lib/features/messaging/application/messaging_providers.dart
  lib/features/achievements/application/achievements_providers.dart
  lib/features/search/application/global_search_providers.dart
  lib/features/matches/presentation/match_detail_screen.dart
  lib/features/matches/presentation/play_hub_screen.dart
  lib/features/notifications/presentation/notification_center_screen.dart
  lib/shared/widgets/drift_error_retry.dart            (new)
  lib/shared/widgets/drift_filter_chip.dart
  lib/shared/widgets/drift_player_card.dart
  test/support/fixtures.dart
  test/features/home/presentation/home_screen_test.dart

ADMIN WEB
  club-admin/app/(dashboard)/announcements/page.tsx
  club-admin/lib/api-client.ts
  club-admin/lib/club-context.tsx
  club-admin/components/ui.tsx
  club-admin/components/StatusBadge.tsx
  club-admin/next.config.ts
  platform-admin/app/(dashboard)/users/page.tsx
  platform-admin/components/ui.tsx
  platform-admin/components/DataTable.tsx              (new)
  platform-admin/lib/api-client.ts
  platform-admin/next.config.ts

DO THESE IN ORDER:

1. MOBILE TOOLCHAIN FIRST — it blocks the most.
   `flutter pub get` and `flutter analyze` were reported hanging with no
   output BEFORE this work began (see PROGRESS.md "Verification Status").
   That is pre-existing, not caused by these changes. Diagnose it before
   anything mobile: `flutter doctor -v`, `flutter clean`, delete
   `.dart_tool/` and `pubspec.lock` then re-run pub get, and check for a
   stale Dart analysis server process. If you cannot unblock it, say so
   plainly and move on — do not fake a mobile verification.

2. BACKEND.
   cd backend
   npx prisma generate        # DismissedHomeCard won't type-check without this
   npx prisma migrate deploy  # applies 20260826120000_add_home_card_dismissals
   npm run build
   npx eslint src             # read-only, no --fix
   npm test
   npm run test:e2e           # needs local Postgres running

   Baseline before this work: 34 suites / 419 unit tests, 16 suites / 86 e2e,
   all green. Expect the unit count to RISE (5 new spec files) and one suite
   to disappear (the analytics module was deleted; it had no tests).

3. ADMIN WEB (both apps).
   `npm run build && npm run lint` in club-admin/ and in platform-admin/
   Note: both apps carry an AGENTS.md saying this Next.js (16.3.1) has
   breaking changes and that you should read node_modules/next/dist/docs/
   before writing config code. Honour that if you touch next.config.ts.

4. MOBILE (only if step 1 succeeded).
   cd mobile
   flutter analyze && dart format --set-exit-if-changed . && flutter test
   flutter build apk --debug

5. MANUAL PASS on the new Home. This is the one thing tests cannot cover —
   the entire point of the rebuild is how the screen FEELS on launch. Seed
   real activity (backend/prisma/seed.ts) so Tier 1 cards actually appear,
   then check: cards render by type with the right accent colour and icon;
   every card's action routes to a real screen; swipe-to-dismiss works and
   the card stays gone after a refresh; the header shows real level/rating.

KNOWN LANDMINES, most likely first:

a) `forbidNonWhitelisted: true` was added to the global ValidationPipe
   (src/config/http-security.ts). Requests carrying unexpected body fields
   now 400 instead of silently stripping them. This is intended — but if an
   e2e test or a client sends an extra field, this is what broke it. Fix the
   CALLER, don't revert the pipe, unless the extra field is legitimate.

b) ~35 files were written without ever running a compiler. Expect ordinary
   type errors, especially across the 12 new Home contributors.

c) The HomeService constructor now takes 13 contributors positionally.
   home.service.spec.ts has a `createService` helper that pads the list to
   13 — if you add or remove a contributor, update that padding too.

d) Two `statusTone` conflicts were resolved by CHANGING platform-admin's
   existing behaviour: DISPUTED went error->warning, DRAFT went
   warning->neutral. If a Playwright snapshot asserts those colours, the
   snapshot is what needs updating, not the mapping.

RULES:
- Fix forward. Do not undo the architecture to make a test pass. If a
  decision looks wrong, say so and ask — HOME-AND-POLISH-PLAN.md explains
  why each was made, and several look surprising until you read the
  reasoning. Two in particular:
    * HomeModule deliberately does NOT import MatchesModule or
      CompetitionsModule (it would drag the write-side graph into the app's
      hottest endpoint and risk circular imports). Contributors read via
      PrismaService and reuse the pure mappers instead.
    * The chat thread provider deliberately does NOT leave its socket room
      on dispose — the gateway auto-joins every conversation room on
      connect, so leaving would silently break inbox live updates.
- Report failures honestly, with real command output. Never describe
  something as verified that you did not actually run.
- Update HOME-AND-POLISH-PLAN.md's Wave 7 checkboxes as you go, and add a
  PROGRESS.md row when the pass completes.
```

---

## What was built, in one paragraph

Home was frozen at M4: five static cards built only from onboarding answers, none of them tappable, on a screen the spec defines as a dynamic priority feed answering *"What should I do next?"*. It now has 13 server-side card contributors across two priority tiers — six urgent (unconfirmed result, incoming challenge, league deadline, upcoming match, pending connection, unread messages) and seven discovery (suggested opponents, development recommendation, nearby courts, club announcements, achievement progress, news, padel) — each carrying an action, an accent and a typed payload the client renders by type. Identity data moved out of the feed into a header. Dismiss/snooze was built. Alongside that, the findings from a code review of the whole project were cleared: a `.autoDispose` regression across six mobile provider files (two of which were real leaks), an announcement form whose validation never fired, an unbounded player search, missing rate limits, a dead module, CSP headers, and `ui.tsx` drift between the two admin consoles.
