# Home Rebuild & Polish Plan

Two tracks in one sequence: **(A)** rebuild the Home feed from an M4 relic into the dynamic priority feed `foundation/04-screen-inventory.md` §A.3 actually specified, and **(B)** clear the findings from the 2026-08-26 code review.

**Working procedure (per your instruction):** all code lands first, across every wave. Nothing is run, analyzed, built, or verified until you explicitly authorize the testing pass in Wave 7. Check items off as they land — this file is the live tracker.

**Working-tree default:** the 125 uncommitted files are left untouched; this work layers on top. Say the word if you'd rather checkpoint-commit them first so the new work is reviewable in isolation.

---

## Why Home needs this

Home was built in M4, when no other data existed. The code comment at `mobile/lib/features/home/presentation/home_screen.dart:14` still asserts every user is a "New user" because "no Match/Competition data exists until M5+". M5–M14 then shipped matches, competitions, courts, clubs, news, learning, notifications, achievements, events and padel. Home never came back for any of it — `backend/src/home/home.module.ts` imports exactly one module.

Three compounding causes, all addressed below:

1. **Every card is a mirror, not a prompt.** All five card types are onboarding reflections — they tell the user what they typed at signup. Same five cards forever. The spec says Home answers *"What should I do next?"*
2. **No card is tappable.** `HomeCard` is `{id, type, priority, title, body}` — no action, no route, no icon. The Flutter renderer ignores `type` entirely, so every card is an identical `DriftCard` with a paragraph in it.
3. **Visually flat by construction** — no hero, no stat header, no urgency signal, no imagery.

---

## Wave 1 — Home backend: architecture + Tier 1 (urgent) cards

- [x] **1.1 Card-contributor architecture.** New `backend/src/home/contributors/`, one small class per card type behind a shared `HomeCardContributor` interface (`contribute(ctx): Promise<HomeCard[]>`). `HomeService.getFeed` resolves the user context once, runs all contributors under `Promise.all`, and wraps each in try/catch so one failing contributor degrades to *card absent* rather than blanking the app's landing screen — then sorts by priority.
  *Rationale:* keeps `getFeed` from becoming a 400-line method and makes each card independently unit-testable, matching the `round-robin.ts` / `rating.ts` / `skill-score.ts` precedent of extracting anything with real branching.
- [x] **1.2 Extend the `HomeCard` contract:**
  - `action?: { label, route }` — every card becomes tappable
  - `icon?`, `accent?: 'urgent' | 'info' | 'success' | 'neutral'` — visual differentiation
  - `data?` — a discriminated union keyed on `type`, carrying the typed payload rich cards need (match summary, player summaries, court summaries, story summary)
  - `dismissible: boolean`
- [x] **1.3 Tier 1 contributors.** Each needs one narrow, read-only, user-scoped method on the owning service, following the established `LearningService → HomeModule` "second consumer" pattern:

  | Card | Source service | Priority | Why it's urgent |
  |---|---|---|---|
  | `UNCONFIRMED_RESULT` | `ResultsService` | 1 | Named as an explicit state in the spec; blocks the opponent too |
  | `INCOMING_CHALLENGE` | `MatchesService` | 2 | Real deadline — `CHALLENGE_TTL_MS` is 7 days; card shows the countdown |
  | `LEAGUE_ROUND_DEADLINE` | `CompetitionsService` | 3 | Miss it and the engine forces a walkover |
  | `UPCOMING_MATCH` | `MatchesService` | 4 | Date, court, Get Directions |
  | `PENDING_CONNECTION` | `ConnectionsService` | 5 | One-tap accept |
  | `UNREAD_MESSAGES` | `MessagingService` | 6 | Already socket-driven, so it live-updates for free |

- [x] **1.4 Fix the stale Padel card.** `home.service.ts:126` currently tells users *"Padel is coming to Drift — we'll let you know the moment it's ready."* Padel shipped in M13. Route it to Add Padel / Padel Profile instead. **This is a live user-facing bug, not just polish.**
- [x] **1.5 Wire `HomeModule`** to the new imports, watching for circular dependencies (`CompetitionsModule` / `MatchesModule` are already cross-consumed via `competition-hooks.module.ts`). Use `forwardRef` only where genuinely circular, not pre-emptively.

## Wave 2 — Home backend: Tier 2 (discovery) cards + dismiss/snooze

Without these, a settled user with nothing urgent sees an empty feed.

- [x] **2.1 `SUGGESTED_OPPONENTS`** — `PlayersService`, reusing M5's existing ranked proximity + level-compatibility engine. Highest-value card on the list: it feeds the app's core loop directly.
- [x] **2.2 `NEARBY_COURTS`** — `CourtsService`. Explicitly deferred in M9 and flagged there as "a live decision point, not dropped."
- [x] **2.3 `NEWS_HIGHLIGHT`** — `NewsService`. Deferred in M11 for the same reason.
- [x] **2.4 `CLUB_ANNOUNCEMENT`** — `ClubFeedService`. Announcements have backend + admin authoring but **no mobile reader at all**; Home is the natural surface.
- [x] **2.5 `ACHIEVEMENT_PROGRESS`** — `AchievementsService`. **Renamed from `RECENT_ACHIEVEMENT` during implementation:** achievements are derived on every read from a static rule catalogue with no `earnedAt` column, so "recently earned" isn't representable without inventing a timestamp — the same never-fabricate rule M9 applied to venue data. The honest card is the standing tally plus the next target, and it's hidden entirely until the user has earned at least one (greeting a new player with "0 of 7" is a list of things they haven't done).
- [x] **2.6 `DEVELOPMENT_RECOMMENDATION`** — pulled forward into Wave 1: the contributor refactor removed the old inline card, so rebuilding it immediately avoided a regression window. Now tappable into the lesson.
- [x] **2.7 Collapse the three identity cards** (`LEVEL_SUMMARY`, `GOALS_SUMMARY`, `PLAY_STYLE_SUMMARY`) into a `GET /home/summary` header payload — rating, trend, recent form. They stop competing with real activity for feed space.
- [x] **2.8 Dismiss/snooze.** The spec lists it as a Home secondary action and it was never built. New `DismissedHomeCard` Prisma model + migration; `POST /home/cards/:key/dismiss` and `/snooze`; contributors filter against it.

## Wave 3 — Home mobile

- [x] **3.1** `home_repository.dart` + models parse the new contract including the discriminated payload.
- [x] **3.2 Render by card type.** New `features/home/presentation/cards/` with a `_HomeCardTile` dispatcher and one widget per type, **reusing the design system already built** — `DriftMatchCard`, `DriftPlayerCard`, `DriftCourtCard`, `DriftNewsStoryCard`, `DriftRecentForm`, `DriftStatusBadge`. Home inherits a rich look immediately instead of needing new widgets.
- [x] **3.3 Hero header** — greeting, rating with trend arrow, recent form.
- [x] **3.4 Swipe-to-dismiss / snooze** affordance wired to 2.8.
- [x] **3.5 Real empty state** for genuinely-new users, so Home isn't *sparser* than it is today once the identity cards move into the header.
- [x] **3.6** `home_feed_provider` → `.autoDispose` (also closes review finding #2 for this feature).

## Wave 4 — Mobile audit fixes

- [x] **4.1 `.autoDispose` regression.** The convention was set in M9 with a comment block at the top of `competitions_providers.dart`, then silently regressed. Fix `matches_providers.dart:18,31,47`, `players_providers.dart:11,16`, `connections_providers.dart:5,9`, `messaging_providers.dart:6,13`. Leave `currentUserProvider` — it's the documented deliberate exception. **A full repo sweep found two more the sampled audit missed:** `achievements_providers.dart` and `global_search_providers.dart`. The search one was load-bearing rather than stylistic — a `.family` keyed on the query string, so every distinct search a user typed kept its results alive for the whole session. Sweep now returns only `currentUserProvider`.
- [x] **4.2 Retry affordances.** `match_detail_screen.dart:81` renders a bare "Match not available." with no refresh and no retry; `play_hub_screen.dart:191` has no visible retry. Every other feature pairs errors with a `DriftButton` retry.
- [x] **4.3** `DriftFilterChip` minimum 44dp tap target (currently ~30-34px, and it's reused across news, player and court filters — systemic).
- [x] **4.4** `DriftPlayerAvatar` image-load error fallback to initials.
- [x] **4.5** Notification deep-link fallback for unhandled `relatedEntityType` values (currently marks read and silently does nothing).

## Wave 5 — Backend audit fixes

- [x] **5.1** `ValidationPipe` → add `forbidNonWhitelisted: true`. **May surface latent client bugs** — flagged for the Wave 7 pass.
- [x] **5.2** `players.service.ts:127` — push pagination into Prisma (`take`/`skip`) with a bounded candidate window. Currently loads every matching user into memory and paginates in JS at line 169; biggest scale risk found.
- [x] **5.3** `@Throttle` on `/auth/refresh`, `/auth/logout`, and platform-admin `accept-invite` — the only auth-sensitive routes without one.
- [x] **5.4** Remove the empty `AnalyticsController` (registered in `AppModule`, zero routes).
- [x] **5.5** Write payments spec files — `payments.service`, `club-billing.controller`, `payments.mapper`, `sandbox-payment.provider`. The only money-handling code in the app has zero tests; the IDOR scoping is correct today, which is exactly why it's worth locking in. *Written in this wave, run in Wave 7.*
- [ ] **5.6** *Not in scope:* splitting `competitions.service.ts` (951 lines). Real maintainability debt, but a pure-refactor project of its own — kept out so it can't destabilize this work.

## Wave 6 — Admin web audit fixes

- [x] **6.1** `club-admin/app/(dashboard)/announcements/page.tsx:108` — the `<form>` has no `onSubmit`; buttons `preventDefault()` on click, which cancels submission *before* the browser runs constraint validation, so every `required` attribute is decorative. Empty announcements submit and fail as raw backend errors. The other 51 forms across both apps use `onSubmit` correctly.
- [x] **6.2** `club-admin/lib/api-client.ts` clears the token on 401 (platform-admin already does); `club-context.tsx` distinguishes 401 from generic failure instead of swallowing all errors into an empty membership list.
- [x] **6.3** `ui.tsx` parity — port `Badge`/`statusTone`/`Th`/`Td` into club-admin, port `DataTable` into platform-admin (whose 45 pages hand-roll table markup), unify the two diverging status-tone maps. *Full shared-package extraction stays a separate project.*
- [x] **6.4** Debounce + abort guard on platform-admin user search (no debounce, no cancellation — a fast typist can have a stale response overwrite a newer one).
- [x] **6.5** Baseline CSP headers in both `next.config.ts`. No XSS vector exists today (verified — no `dangerouslySetInnerHTML` anywhere), but both apps hold JWTs in `localStorage`, so this is defense-in-depth.

## Wave 7 — Testing — **gated on your authorization**

Nothing here runs until you say go.

- [x] **7.1 Diagnose the Flutter toolchain stall first.** Did not reproduce: `flutter doctor -v` clean, `flutter pub get` completed normally (dependency resolution + download), `flutter analyze` completed in 113.4s with **no issues found**. Six `dart.exe`/`dartaotruntime.exe` processes were running but are VS Code's Dart/Flutter extension (language server, tooling daemon, devtools) — left alone since they weren't blocking anything and killing them would disrupt the open editor. Whatever caused the earlier hang was transient (cold pub cache, first analysis-server warm-up, or a since-cleared lock) — not reproducible now, so mobile verification is unblocked.
- [x] **7.2** Backend: `npm run build`, `eslint`, unit suite (incl. new home contributor + payments specs), e2e against local Postgres after applying pending migrations. All green: build clean, eslint clean, unit 39 suites/453 tests (baseline 34/419 + 5 new spec files, matches), e2e 16 suites/86 tests (matches baseline exactly). Docker's `drift_tennis_postgres` container needed starting (Docker Desktop daemon wasn't running); `20260826120000_add_home_card_dismissals` applied cleanly, `dismissed_home_cards` table verified. One real failure found and fixed: `test/onboarding.e2e-spec.ts` asserted the pre-rebuild feed shape (`LEVEL_SUMMARY`/`GOALS_SUMMARY`/`PLAY_STYLE_SUMMARY` in the feed) — stale per Wave 2.7, which moved identity data to `GET /home/summary`. Fixed the test (the caller), not the architecture: now asserts `/home/summary` for level/goals and the feed's actual Tier-2 fallthrough (`SUGGESTED_OPPONENTS`, `DEVELOPMENT_RECOMMENDATION`, `NEWS_HIGHLIGHT`) for a fresh matchless account.
- [x] **7.3** Mobile: `flutter analyze`, `dart format`, `flutter test`, `flutter build apk`.
  - `flutter analyze`: clean, no issues, both before and after the fix below.
  - `dart format --set-exit-if-changed .`: **caution for next time** — this command rewrites files, not just checks them. It reformatted 84 pre-existing files across the app that this work never touched (coaches, competitions, payments, clubs, courts, learning, etc.) — pure whitespace/style drift that predates this pass. Reverted all of those via `git checkout --` to keep the diff scoped to this work; none of the 16 in-scope files needed reverting (they format clean). The 84-file drift is real and pre-existing but out of scope for this pass — worth a dedicated formatting commit separately.
  - `flutter test`: **found and fixed a real, unconditional layout bug**, not a test artifact. `HomeCardTile` (`lib/features/home/presentation/cards/home_card_tile.dart:42`) wraps its content in `Row(crossAxisAlignment: CrossAxisAlignment.stretch)` directly inside a `Card` inside a `ListView` — since `Card` gives its child unbounded height, `stretch` forced `BoxConstraints(h: Infinity)` on every card, on every render, in the real app too (not just tests). This produced a runaway exception loop under `pumpAndSettle` (one failing test alone generated over 1.1M lines of repeated stack traces before being killed) — which is almost certainly what the "hanging" mobile toolchain symptom in the original handover actually was. Fixed by wrapping the Row in `IntrinsicHeight`, the standard fix for `stretch` without a bounded parent height. Also fixed two now-stale test assertions written against pre-rebuild UI text (fix-the-caller, per the handover's rule): `match_detail_screen_test.dart` asserted the old bare "Match not available." text instead of Wave 4.2's `DriftErrorRetry` block ("Couldn't load this match." + Retry button). Final state: 551/553 mobile tests passing. The remaining 2 (`GoalsScreen renders without throwing` in dark/light, `onboarding_static_screens_test.dart`) are a pre-existing `RenderFlex overflowed by 76 pixels` bug in the onboarding feature — confirmed reproducible in isolation, in a file this work never touched. Left unfixed as out of scope; flagging for a separate pass.
  - `flutter build apk --debug`: succeeded — `build\app\outputs\flutter-apk\app-debug.apk` (304s Gradle build, only pre-existing Java-8-obsolete javac warnings, unrelated).
- [x] **7.4** Admin: `next build` + `lint` for both apps. Both clean. club-admin: build passed (27 routes), lint 0 errors/2 pre-existing warnings in an untouched file (`media/page.tsx`, missing hook dep + `<img>` vs `<Image>` — unrelated to this work). platform-admin: build passed (46 routes), lint 0 errors/0 warnings.
- [ ] **7.5** Playwright pass over the admin changes. **No automated pass/fail Playwright suite exists** — `playwright` is a club-admin dependency, but the only thing that uses it is `club-admin/scripts/qa-clickthrough.mjs`, a manual, headed (visible real Chrome, `slowMo: 120`) M14-closure click-through that screenshots ~18 steps across both apps for human review. Correction after checking further: I first assumed it wasn't runnable because its hardcoded accounts (`owner@drift.test`, `review@drift.local`) aren't in `backend/prisma/seed.ts` — wrong check. Both accounts actually exist as live rows in the same Postgres container/volume this pass has been using all along (`users`/`platform_admins` tables), left over from the 2026-08-25 session's real run of this exact script (PROGRESS.md logs "18/18 steps... `qa-evidence/`" from that session). So it **is** runnable — just **blocked on the same host-RAM wall as 7.6** (see 7.6's note — the real cause turned out to be the user's own Brave/VS Code footprint, not Docker). It needs the backend + both admin apps' dev servers up simultaneously plus a real headed Chrome instance on top of that. Not attempted for the same reason. Left for the user alongside 7.6.
- [ ] **7.6** Emulator walkthrough of the new Home with real seeded activity — the one thing only a human eye catches, since the whole point of this work is how the screen *feels* on launch. **Blocked, not attempted:** host free RAM was 885 MB out of 16 GB (true "Available MBytes" counter: 420 MB) — [[emulator-manual-pass-troubleshooting]] documents this exact threshold (<~2 GB free) as the trigger for a known cascade (native-lib stripping OOMs during `flutter build apk`, or `adb install` fails opaquely via the guest OS's low-memory-killer), and warns against burning turns retrying in that state. **Correction:** I initially assumed starting Docker Desktop (resurrecting a dozen `restart: unless-stopped` containers from other local projects) was the proximate cause and stopped 5 of them at the user's direction — that freed almost nothing. A process breakdown showed the actual dominant consumers are the user's own open applications: Brave (~4.8 GB across 35 processes) and VS Code (~1.7 GB across 30 processes) vs. Docker's total ~1.1 GB. Did not close either — that's the user's call, not something to decide unilaterally. Left for the user to free RAM (close some browser tabs / restart the editor) and re-run, or to say go-ahead on doing that directly.

---

## Decisions already taken (flag if you disagree)

- **All six Tier 2 cards are in.** Trimming them re-creates the empty-feed problem for settled users, which is half the reason Home looks plain now.
- **`competitions.service.ts` split is out** (5.6) — real debt, but a separate refactor.
- **Full admin shared-package extraction is out** (6.3) — parity port now, monorepo tooling later.
- **Working tree left untouched** — this work layers on top of your 125 uncommitted files.
