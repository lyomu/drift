# Handoff — verify the 2026-10 mobile redesign in dark mode

You are picking up right after a dark-mode bug fix. The fix is written and
`flutter analyze` is clean, but **nobody has looked at it on a device yet**,
and it is **not committed**. That is this session's job: toggle the emulator
into dark mode, rebuild, walk the screens, fix anything that still looks
wrong, then commit and push.

Read this whole document before touching anything — the "known traps"
section at the bottom cost real time to find once already.

## What happened, in order

1. A 2026-10 redesign pass rebuilt onboarding (all 10 steps), Home, the
   competition cards (leagues/ladders/tournaments), and the shared filter
   sheet/pill-tabs/player-card widgets, porting a set of React/Figma mocks
   screen by screen. That work is **committed**: `2620ad7` on
   `feat/coach-web-dashboard`, already pushed.
2. Asked directly "is dark mode configured well?" The honest answer was no.
   The app has real dark-mode machinery —
   `mobile/lib/core/theme/app_theme.dart` builds both `AppTheme.light()` and
   `AppTheme.dark()`, `MaterialApp.router` wires `darkTheme:` with no
   explicit `themeMode` (so it follows the system), and
   `DriftColors.dark` is a fully specified palette — but the redesign work
   didn't use it. Every new widget had its text colour lifted straight from
   the React mocks as a literal hex (`Color(0xFF0F172A)` etc.), while the
   *backgrounds* around that text correctly used `colors.surface` /
   `colors.background`, which **do** flip to the dark palette. Net effect:
   near-black text on a near-black surface in system dark mode — `#0F172A`
   text sitting on `DriftColors.dark.surface` (`#111B2C`), which is
   illegible.
3. Fixed across 12 files (listed below), by threading
   `Theme.of(context).extension<DriftColors>()!` into every widget that
   needed it and replacing the hardcoded hex with `colors.textPrimary` /
   `colors.textSecondary` / `colors.border` / `colors.error` as appropriate.
   Dead `const _ink` / `_subdued` / `_muted` / `_checkBorder` /
   `onboardingInk` declarations were removed, not left orphaned.
   `flutter analyze` passed clean on the whole project after the fix.
4. **Nothing beyond `flutter analyze` has verified this.** No rebuild, no
   device check, no dark-mode toggle, no commit.

## The 12 files the fix touched (uncommitted, in your working tree now)

```
mobile/lib/features/home/presentation/sections/action_needed_rail.dart
mobile/lib/features/home/presentation/sections/courts_near_you_list.dart
mobile/lib/features/home/presentation/sections/players_near_you_rail.dart
mobile/lib/features/home/presentation/sections/tennis_news_rail.dart
mobile/lib/features/onboarding/presentation/padel_interest_screen.dart
mobile/lib/features/onboarding/presentation/playing_preferences_screen.dart
mobile/lib/features/onboarding/presentation/tennis_experience_screen.dart
mobile/lib/features/onboarding/presentation/widgets/onboarding_scaffold.dart
mobile/lib/shared/widgets/drift_competition_card.dart
mobile/lib/shared/widgets/drift_filter_sheet.dart
mobile/lib/shared/widgets/drift_pill_tabs.dart
mobile/lib/shared/widgets/drift_player_results.dart
```

Run `git status --short -- mobile/` first thing to confirm this list is
still accurate — it should show exactly these 12 as modified and nothing
else.

## What was deliberately left alone (don't "fix" these)

- **The intro carousel** (`intro_carousel_screen.dart`) — fixed navy
  (`_shellNavy`) and white text regardless of theme. Documented in the file
  itself as "a fixed dark composition" — intentional, not a bug.
- **Home's quick-action tiles and the gradient stat card** — always white
  text on a saturated gradient (blue/green/violet/orange or the brand
  blue→primaryDark gradient). Correct in either theme by construction; they
  have no theme-conditional text colour to get wrong.
- **Every per-option / per-category accent colour** — level-band colours,
  court-surface tints, news-category pills, the padel screen's grey "No,
  just tennis" icon (`Color(0xFF64748B)` at
  `padel_interest_screen.dart:~33`). These are deliberate brand decoration,
  not body text; they were checked and are correctly out of scope.
- **`core/shell/drift_app_drawer.dart`** has the identical hardcoded-ink
  pattern and was **not** touched — it's pre-existing, from before this
  redesign, not introduced by it. Out of scope for this fix, but worth
  knowing it's there (same bug, different owner) if dark mode still looks
  wrong somewhere after you've verified the 12 files above.

## Your job

### 1. Rebuild and install

Use the project's own script, not `flutter run` — a backgrounded `flutter
run` in this environment can't receive keystrokes for hot reload, and
leftover `flutter_tools` processes have served stale APKs before.

```bash
cd mobile
bash tool/dev_run.sh
```

Confirm the emulator is attached first (`adb devices` should show
`emulator-5554` as `device`, not `offline`). If nothing is attached, start
the AVD you'd normally use before running the script.

### 2. Put the emulator in dark mode

```bash
ADB="$HOME/AppData/Local/Android/Sdk/platform-tools/adb.exe"
"$ADB" -s emulator-5554 shell cmd uimode night yes
```

(`night no` to flip back.) This changes system `Brightness`, which is what
`MaterialApp.router`'s unset `themeMode` (defaults to `ThemeMode.system`)
reacts to — no in-app toggle exists for this.

### 3. Walk every screen the fix touched

Log in as `ana.demo@drift.test` / `DriftDemo123!` (see
"Known traps" below if login fails). For each, you're checking one thing:
**is every line of text clearly readable against its background?** Not
"technically has some contrast" — actually comfortable to read, the way it
is in light mode.

- **Onboarding, all 10 steps** (easiest way in: log out, or use
  `DRIFT_FORCE_HOME`/dev hooks in `splash_screen.dart` to skip around — see
  `mobile-figma-redesign` memory for the dev-only dart-define hooks).
  Tick-row header, titles, subtitles, option card labels, the padel/tennis
  experience check-dots' idle border, error text.
- **Home.** Action-needed cards, courts-near-you rows (name, distance,
  hours), players-near-you names, tennis-news cards (headline, publisher,
  timestamp).
- **Play → Find, Discover → Players.** Search bar text and hint, player
  result cards (name, meta row, location).
- **Compete → Leagues/Ladders/Tournaments.** Competition cards (title,
  badge separator, detail rows), the disabled "Full" action button state.
- **Any filter sheet** (Players, Courts, Coaches — tap the tune icon).
  Sheet title, "Clear all", section titles, pill/segment choice labels.
- **The pill-tab row** on Play/Compete/Discover — inactive tab label colour.

### 4. Fix anything still wrong, then verify again

If you find a spot that's still hardcoded or still illegible, the fix
pattern is consistent across all 12 files already done — copy it:

```dart
// at the top of build(), if not already there:
final colors = Theme.of(context).extension<DriftColors>()!;

// then swap the literal:
color: _ink,              →  color: colors.textPrimary,
color: _subdued,          →  color: colors.textSecondary,
color: _muted,             →  color: colors.textSecondary,
color: _checkBorder,       →  color: colors.border,
color: Color(0xFFEF4444),  →  color: colors.error,   // only for real error text
```

Re-run `flutter analyze` after any edit — it will flag an unused `final
colors` or a now-dead top-level `const _ink` etc. immediately, which is
useful: it means you haven't missed a usage site or left a dead constant
behind.

Also sanity-check **light mode still looks right** (`cmd uimode night no`,
rebuild not required, just reinstall or hot-restart) — the fix should be a
pure flip, `colors.textPrimary` in light mode resolves to the same
`#0F172A` the hardcoded literal was, so nothing should visibly change there.
If light mode regressed, something was mapped wrong.

### 5. Commit and push

Nothing from this fix is committed. Once verified:

```bash
cd "C:/Users/gmnyo/Desktop/Engineering projects/Drift Tennis"
git add mobile/lib/features/home/presentation/sections/action_needed_rail.dart \
        mobile/lib/features/home/presentation/sections/courts_near_you_list.dart \
        mobile/lib/features/home/presentation/sections/players_near_you_rail.dart \
        mobile/lib/features/home/presentation/sections/tennis_news_rail.dart \
        mobile/lib/features/onboarding/presentation/padel_interest_screen.dart \
        mobile/lib/features/onboarding/presentation/playing_preferences_screen.dart \
        mobile/lib/features/onboarding/presentation/tennis_experience_screen.dart \
        mobile/lib/features/onboarding/presentation/widgets/onboarding_scaffold.dart \
        mobile/lib/shared/widgets/drift_competition_card.dart \
        mobile/lib/shared/widgets/drift_filter_sheet.dart \
        mobile/lib/shared/widgets/drift_pill_tabs.dart \
        mobile/lib/shared/widgets/drift_player_results.dart
git status --short   # confirm nothing else crept in — see "stray files" below
git commit -m "fix(mobile): make the 2026-10 redesign theme-aware for dark mode

..."
git push origin feat/coach-web-dashboard
```

Stage explicitly, the same way the redesign commit did — **do not
`git add -A`**. The working tree on this branch has had unrelated
in-progress files sitting in it before (a coach-dashboard seed script, a
Pen landing-page preview, a stray 1.3GB `mobile.zip`, a CORS tweak in
`backend/src/config/http-security.ts`). None of those are yours to commit;
check `git status --short` for anything beyond the 12 files above before
staging, and ask rather than guess if the list doesn't match.

## Known traps (already paid for once — don't re-discover them)

- **`backend/.env`'s `DATABASE_URL` points at the wrong port.** It says
  `localhost:55433`; the real Postgres with the demo data is
  `drift_tennis_postgres` on `5434` (`docker ps` confirms). If you need the
  backend running (e.g. login fails, or you want to re-seed), start it with
  the port pinned explicitly rather than trusting `.env`:
  ```bash
  cd backend
  DATABASE_URL="postgresql://drift:drift@localhost:5434/drift_tennis" \
    nohup npm run start:dev > local-backend.out.log 2> local-backend.err.log &
  ```
  This is purely a dark-mode visual check, though — you almost certainly
  don't need the backend up at all for this task, since nothing here
  changes data shapes. Only start it if login/data genuinely isn't working
  from whatever's already running.
- **`npx jest` on this backend needs `--runInBand`.** The parallel workers
  OOM on the `src/competitions` suite and report as suite failures, not
  assertion failures. Not relevant unless you end up touching backend code.
- **Git on this repo treats LF as the working-tree default** and will warn
  "LF will be replaced by CRLF" on every file you touch — cosmetic, ignore
  it, it's not a conflict.

## Reference, if you need the broader picture

- `2620ad7` — the full redesign commit this fix patches up.
- `LEAGUE_LEVEL_BAND_SPEC.md` — unrelated to dark mode, but lives in the
  same commit; ignore unless asked about league level bands specifically.
