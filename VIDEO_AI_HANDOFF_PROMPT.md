# Handover: Drift Tennis video AI (Swing Check + match video analysis)

You're picking up work on Drift Tennis's video AI features. The owner has **real clips from players in their
group** and wants these features **live as soon as possible**. They have no time to film anything themselves,
so these clips are the test and calibration footage for both features.

## Do this first

1. **Ask the owner where the clips are** (folder path), roughly how many, and whether every player in them
   agreed to their footage being used for development. Don't continue with any clip whose consent is unclear.
2. **Confirm the release goal.** On 2026-11-10 the owner said Swing Check is *not versioned and not going to
   production yet*. They now say it "needs to be up soonest". Before any version bump, migration on a non-local
   database, store build or deploy, ask what "up" means: internal test build, TestFlight / Play internal
   track, or production. Never assume.
3. Read, in this order: `docs/ml/SWING_METRICS_SPEC.md`, `AI_VIDEO_ANALYSIS_IMPLEMENTATION_PLAN.md`,
   `cv-service/PHASE0_FINDINGS.md`, the "Swing Check" section of `PROGRESS.md`, and `docs/ml/dataset-shortlist.md`.

## Rules that apply (from the owner)

- **Plan before implementing:** get a written plan approved before multi-file edits. Picking a task is not
  approving the approach.
- **Build, then test:** write the whole change first, and do all builds and tests in one pass at the end.
- **Translations:** every new user-facing string goes into EN/FR/ES in the same change (mobile ARB files,
  club-admin messages, backend `common/i18n`). Format dates and numbers with the active locale.
- **Never raise app install minimums.** The app stays installable on iOS 13+ and Android 7+. Features can be
  gated at runtime (Swing Check is Android 13+ / iOS 15+).
- Read and grep the repo yourself; don't spawn exploration subagents.
- **Privacy:** the clips show real people. Keep them out of git (put them under a gitignored folder) and don't
  upload them to third-party services (Roboflow, LLM APIs, cloud GPUs) without the owner's explicit OK.
- **Secrets:** the Roboflow key is read from the `ROBOFLOW_API_KEY` environment variable. Never ask for a key
  in chat or write one into a file.
- **Local dev:** the backend runs on **:3009** (port 3000 belongs to another project). Never run
  `npm run build` in `backend/` while `start:dev` is running. `npm run lint` there auto-fixes about 24
  unrelated files, so avoid it. For the phone, use `mobile/tool/dev_run.sh`, since `flutter run` can serve
  stale APKs. That script needs `--dart-define=DRIFT_SWING_CHECK=true` added to its build command to show
  Swing Check.

## Keep the tracker up to date

Plan and live tracker artifact: https://claude.ai/artifact/8PJycdbkGfPd1ibQtzNj1a

Its database has two collections:
- `tasks` (ids: prep1-6, prep8, s0a-c, s0x, m1a-e, m2a-d, m3a, m4a, opt1-4; fields: phase, order, status
  todo|doing|done|blocked, title, note)
- `changes` (ids c001…c015; next is c016; fields: date, text)

Update it with the `ArtifactData` tool whenever a task starts, finishes or gets blocked. Always pin
`if_version`. Also update `PROGRESS.md` at each phase boundary.

## Where things stand (2026-11-10)

### Swing Check: on-device swing metrics. Code complete, never run on a real phone.

- **What it does:** forehand and serve, filmed side-on. It measures contact height, arm extension, knee bend,
  contact in front, tempo, follow-through and trophy-to-contact, plus AI Coach tips.
- **Where the code lives:**
  - Mobile: `mobile/lib/features/swing_check/`. The `domain/` folder is pure Dart: detector, quality gate,
    metrics.
  - Backend: `backend/src/swing-sessions/`.
  - Migration: `20261110120000_swing_sessions`, applied to the **local DB only** (`localhost:5434/drift_tennis`).
- **Pose detection** goes through an in-app native bridge, not the google_mlkit plugin (that plugin forces
  iOS 15.5 on the whole app):
  - Android: ML Kit in `android/app/src/main/kotlin/app/driftsports/drift/PoseBridge.kt`.
  - iOS: Apple Vision inside `ios/Runner/AppDelegate.swift`.
  - The Swift code has **never been compiled** (no Mac yet).
- **Visibility:** Swing Check is hidden behind the build flag `DRIFT_SWING_CHECK` (AI Coach menu).
- **Coach feedback:** uses Claude (`claude-opus-5-5` by default; change with `COACH_ANTHROPIC_MODEL`) or OpenAI,
  whichever key is set. `COACH_AI_PROVIDER=auto` chooses.
- **Tests:** mobile 704 pass, backend 1001 pass, and a debug APK builds.
- **Provisional settings:** detection thresholds (`SwingDetectorConfig.peakSpeed = 6.0` torso lengths per
  second, merge window 1200 ms, window -800/+500 ms) and the quality-gate settings (likelihood 0.5, 80%
  visible, minimum 6 frames, maximum 120 ms gap) are guesses. **The clips are how you tune them.**

### Match video analysis (cv-service): built, blocked on real footage.

- **What exists:** `cv-service/` (Tennis-Vision, MIT, FastAPI) with precheck, court and ball tracking, and
  multi-rally sessions. The backend `video-analysis` module (BullMQ queue) and mobile `features/video_analysis/`
  are built.
- **Phase 0 so far:** 0 of 10 earlier clips passed the court check. The causes were WhatsApp compression to
  480 px, portrait framing, a ground-level camera and worn court lines. The go/no-go needs properly captured
  footage. **The group's clips may finally be that footage.**
- **Training data:** Roboflow Universe sets (licences checked through the API) are fine-tuning data only, never
  the accuracy measure. Ultralytics AGPL is avoided by using RF-DETR (Apache-2.0).

## Suggested work, in order (propose a plan first)

1. **Inventory the clips.** Write a small script (outside git, or in `cv-service/tools/`) that records for each
   clip: resolution, orientation, fps, duration, codec, and whether it was WhatsApp-compressed (480 px wide is
   the tell). Then sort each clip by eye: camera angle (side-on, behind, elevated), how well the court is
   marked, which strokes appear, and how many players. Put the results in a table in `PHASE0_FINDINGS.md` or a
   new `docs/ml/real-clips-inventory.md`, using clip ids only, never player names.
2. **Re-run Phase 0 on the usable clips.** Run the cv-service precheck and analysis, record the court-check pass
   rate and ball-detection rate, and write the go/no-go with numbers in `PHASE0_FINDINGS.md`.
3. **Calibrate Swing Check against the clips.** Swing Check only reads the live camera today, so build an offline
   evaluation path:
   - A Python script using MediaPipe Pose (Apache-2.0; same BlazePose family as ML Kit) that writes the same 13
     joints per frame as JSON in the Dart `PoseFrame` shape.
   - A Dart test or CLI that runs `SwingAnalyzer` on those fixtures.
   - Hand labels for a few side-on clips (swing count and approximate contact times).
   - Tune the thresholds against detected-vs-labelled swings and refusal rates, and report the numbers.
   - Keep the fixtures small and anonymous (landmarks only, no video).
   - Open question for the owner: should Swing Check also get an "analyse a recorded clip" option in the app?
     That would be a new feature with UI and translations, so plan it separately.
4. **Real-device pass.** One Android 13+ phone, plus an iPhone on iOS 15+ once a Mac is available, playing a
   clip on a screen or filming live: frames per second, detection, refusals. The iOS compile, and adding
   `ios/Runner/{fr,es}.lproj/InfoPlist.strings` to the Runner target, need Xcode.
5. **Release path,** only after the owner confirms step 2 of "Do this first": migration on the target
   database, environment variables (`COACH_AI_PROVIDER`, LLM key), removing or flipping the `DRIFT_SWING_CHECK`
   flag, version bump per `docs/PLAY_SUBMISSION.md`, and updating `kSwingCheckAppVersion` in
   `mobile/lib/features/swing_check/swing_check_config.dart` (it's tracked by hand).

## Done means

- A clip inventory and a Phase 0 go/no-go, both written down with numbers.
- Swing Check thresholds tuned on real footage, with detected-vs-labelled accuracy reported.
- All tests still green (mobile `flutter test`, backend `npx jest`).
- The tracker, `PROGRESS.md` and the spec updated.
- Nothing deployed or versioned without the owner's explicit go-ahead.
