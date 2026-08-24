# Drift Tennis — Handover

Last updated: 2026-08-24. Written for the next agent picking up this project.

---

## Part 1 — The handover prompt

> Copy everything in this block into a fresh session as your first message.

```
You are picking up the Drift Tennis project, mid-way through a six-wave
implementation plan that takes it from demo to beta.

Read HANDOVER.md at the repo root first — it is the full context document.
Then read PROGRESS.md, which is the running engineering log (one row per
milestone, plus a long "open gaps" tail that is deliberately honest about
what is unbuilt).

Your immediate task, in this order:

1. FIRST, before anything else: `cd mobile && flutter analyze`.
   test/support/fixtures.dart was expanded in the last session and never
   compiled. It is the one file in the tree that may not build. Fix whatever
   it reports before starting new work.

2. Then continue Wave 3, Layer 3a — the screen state matrix. 6 of 85 screens
   are covered. HANDOVER.md §6 has the full screen inventory, the provider
   each one watches, and the exact family-provider call signatures.

Working agreements that the project owner has confirmed and expects:
- Write a plan and get it approved BEFORE multi-file edits. Picking the task
  is not approving the approach.
- Build the whole feature first, then do all testing in one pass at the end.
- Update PROGRESS.md at every phase boundary, not just at session end.
- Do not commit unless asked.

Report honestly. If something is blocked, say so and finish everything else.
```

---

## Part 2 — The context

### 1. What this is

A tennis (and Padel) social/competition platform. Three surfaces:

| Surface | Stack | Location |
|---|---|---|
| Backend API | NestJS + Prisma + PostgreSQL 16 | `backend/` |
| Mobile app | Flutter — Riverpod, go_router, dio | `mobile/` |
| Club Admin | Next.js 15 App Router | `club-admin/` |

Postgres runs in Docker on **port 5434**. The emulator reaches the host API at
`10.0.2.2`; the app accepts `--dart-define=DRIFT_API_BASE_URL=...`.

The product spec lives in `starter docs/` (3 documents) and `foundation/`
(7 documents, also published as artifacts — see `MEMORY.md`).

### 2. The plan being executed

A six-wave plan to beta, published here:
https://claude.ai/code/artifact/be203580-2244-4fb6-b4ab-d9e4aa4e7e22

The current wave's detailed plan is at
`C:\Users\gmnyo\.claude\plans\create-a-plan-first-velvety-swing.md` (Wave 3).

### 3. Status by wave

| Wave | State | Notes |
|---|---|---|
| 1.1 Password reset | **Done** | 2 endpoints, 2 screens, 11 tests. Non-enumerating. |
| 1.2 Email provider | **Blocked on owner** | No provider chosen. Verification codes are logged, not sent. |
| 1.3 Push (FCM/APNs) | **Blocked on owner** | Needs a Firebase project + credentials. |
| 1.4 Notification triggers | **Done** | Was 1 of 13 Play-loop events notifying; now 15. |
| 2 Community | **Done** | Club join/approval, `CLUBS` category, announcements fanout, Club Feed. |
| 3 Quality gate | **Partial** | Layers 0–2 done. Layer 3a is 6/85 screens. See §6. |
| 3.2 Device pass | **Partial** | Priority flows verified on an AVD. Club Feed + match loop not yet. |
| 3.3 Club Admin click-through | **Blocked** | No browser automation in this environment. Human task. |
| 4 Court data ingestion | **Blocked on owner** | Needs an ingestion route + cost decision (Google Places or similar). |
| 5.2 Redis socket adapter | **Done** | Best-effort; falls back cleanly when `REDIS_URL` is absent. |

### 4. Verified numbers

From the last full run:

| Check | Value |
|---|---|
| Backend unit | 394 tests / 30 suites |
| Backend e2e | 75 tests / 14 suites |
| Flutter tests | 231 (was 1) |
| Mapper coverage | 70 of 70 |
| `flutter analyze` | clean **at that point** — see the warning below |

### 5. State of the working tree — read this

**Nothing is committed.** `git log` shows only two pre-existing commits.
`backend/`, `mobile/`, `club-admin/`, `PROGRESS.md` and everything else are
untracked. Three waves of work exist only in the working tree. The owner has
not asked for a commit; do not make one unprompted, but do raise it.

**`mobile/test/support/fixtures.dart` is unverified.** It was rewritten in the
last session — expanded from 6 fixtures to roughly 40, covering every domain
type the screen matrix needs — and the session ended before `flutter analyze`
ran on it. Compile it first. Likely failure points are enum member names
(`SeasonState`, `SeasonRegistrationStatus`, `FieldVisibility`, `OnboardingStep`)
and `const` correctness on the nested fixtures.

Three migrations were added and applied:
- `20260822101500_add_password_reset_purpose`
- `20260822213210_add_club_join_and_clubs_notifications`
- `20260822213833_add_club_feed`

### 6. Wave 3 Layer 3a — the remaining work, mapped

**85 screen files** in `mobile/lib/**/presentation/*_screen.dart`. They split
cleanly into two groups.

**Group A — screens that watch an async provider (~45).** These get the
four-state matrix: loading, data, empty, error, in both brightnesses. Override
the *provider*, not the repository — `overrideWith` returning a value, an empty
value, a never-completing future, and a throwing future.

**Group B — static and form screens (~40).** No `ref.watch`. One
"renders without throwing" test each, both brightnesses. Cheaper, and still
catches theme-extension breakage.

The harness already exists in `mobile/test/support/`:
- `pump.dart` — `pumpScreen`, `pumpRouted`, `pending<T>()`, `failing<T>()`.
  Supplying the real `AppTheme` is load-bearing: every screen reads
  `Theme.of(context).extension<DriftColors>()!` and throws on a bare
  `MaterialApp`.
- `fixtures.dart` — canned domain objects (see the warning in §5).
- `mocks.dart` — mocktail mocks. `mocktail` is a dev dependency; no codegen.

**Family-provider call signatures**, extracted from the screens — these are the
easy thing to get wrong:

```
clubAnnouncementsProvider(clubId)
clubFeedProvider(clubId)
clubDetailProvider(clubId)
leagueDetailProvider(leagueId)          // also used by LeagueRulesScreen
registeredPlayersProvider(seasonId)
roundProvider((seasonId: seasonId, roundId: roundId))
seasonDetailProvider(seasonId)
currentRoundProvider(seasonId)
standingsProvider(seasonId)
courtDetailProvider(courtId)
contentDetailProvider(contentId)        // also TrainingPlanDetailScreen(planId)
goalDetailProvider(goalId)
contentBrowseProvider((type: null, targetSkill: skill))
skillDetailProvider(skill)
matchDetailProvider(matchId)
matchListProvider(segment)              // MatchSegment enum
threadProvider(conversationId)          // AsyncNotifierProvider.family
storyDetailProvider(storyId)
playerProfileProvider(playerId)
```

Screens taking constructor objects rather than ids:
`DisputeDetailScreen(match:, viewerId:)`, `EnterScoreScreen(match:, viewerId:, mode:)`,
`ChallengeComposerScreen(opponent:)`, `SuggestedLevelReviewScreen(result:)`,
`AdjustLevelScreen(suggestedLevel:)`, `RatingsStatsScreen(title:, stats:)`,
`CourtPhotosGalleryScreen(photoUrls:)`.

**Layer 3b remainder** — behavioural tests still outstanding: the match loop
(propose time → counter → accept; enter score → confirm; enter score → dispute)
and the onboarding resume path.

### 7. Traps already hit — don't re-discover these

**Sharp Sans is a trial subset.** The files in `Sharp-Sans-Font-Family/` at the
repo root carry 64 glyphs — A–Z, a–z, 0–9. They are missing the em dash, curly
apostrophe, ellipsis and middot, which this app's copy uses in **802 places**.
Swapping them in renders tofu in every heading. `mobile/pubspec.yaml` carries a
comment saying so. Both the original audit and I called this "a one-hour win"
before checking. The licence is genuinely open; the files are not usable.

**Unknown enum values must degrade, not throw.** Adding `CLUBS` to the backend's
`NotificationCategory` crashed the entire mobile Notification Centre, because
`firstWhere` had no `orElse` — one unrecognised row failed the whole page parse.
`notifications_repository.dart` now has an `unknown('')` fallback. Apply the same
pattern to any new wire enum.

**`grep -P` does not work in this shell** ("supports only unibyte and UTF-8
locales"). Use Python for anything beyond basic patterns.

**Bash heredocs break on large Dart payloads.** Repeatedly, in two sessions.
Use the Write tool for Dart and long Markdown; keep heredocs for short scripts.

**Emulator ANR dialogs silently swallow taps.** Under host memory pressure
SystemUI and Pixel Launcher ANR, and the modal intercepts input so a broken tap
looks identical to a broken coordinate. Fix:
`am force-stop com.google.android.apps.nexuslauncher` and
`settings put global anr_show_background 0`.

**Emulator screenshot coordinates need scaling.** Displayed 896x2000 vs native
1280x2856 — factor 1.43. Verify raw input with `getevent`.

**Device pass needs ~2 GB free RAM.** Below that, `flutter build apk --debug`
OOMs during `llvm-strip` and silently emits a ~450 MB unstripped APK that won't
fit the AVD partition. The install error is usually truncated. The
`retailbooks-*` Docker containers belong to a **different project** — stopping
them frees the RAM, but ask first, and restart them afterwards.

### 8. Open bugs and gaps

Logged in `PROGRESS.md`, worth surfacing here:

- **Notification Centre shows stale empty data on re-entry.** Found on device.
  Only pull-to-refresh recovers it. The provider is `.autoDispose`, so a fresh
  push should refetch — worth investigating why it doesn't.
- **Silent waitlist promotion.** `CompetitionsService.withdraw()` promotes a
  WAITLISTED registration to ENROLLED and notifies nobody.
- **Player/message report triage has nowhere to go.** No platform role exists in
  the schema at all, so `PlayerReport`/`MessageReport` rows are written and never
  read. Only `CourtReport` is wired into Club Admin's Reports queue.

`PROGRESS.md` has a long tail of further known gaps, each with the reasoning for
why it was deferred. Read it rather than re-deriving.

### 9. Conventions the owner has confirmed

- **Plan before implementing.** Written plan, approved, before multi-file edits.
  Choosing the task is not approving the approach.
- **Build then test.** Build the whole feature, then one testing pass at the end.
- **Keep `PROGRESS.md` live.** Update at every phase boundary.
- **Typography is locked:** Outfit + Sharp Sans Display. Confirmed three times.
  (See §7 for why Sharp Sans is not yet actually installed.)
- **Don't commit unless asked.**
- **Don't close the owner's other applications** (Docker, WSL, IDEs, browser)
  without asking — that is their call, not the agent's.
