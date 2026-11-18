# Handover: Drift Tennis video AI, build-everything phase (updated 2026-11-12)

You're continuing the video AI work for Drift Tennis. On 2026-11-11 the owner decided to **build both features
to completion, promise nothing publicly, and release only when the whole thing works**. Release target when ready:
an internal build on the owner's phone, then Play internal track and TestFlight. Don't re-ask which feature to
prioritise or whether to release early.

`VIDEO_AI_BUILD_PLAN.md` (workstreams A to E) is **approved as written**. You still need a short written approach
before a large multi-file change the plan doesn't describe, and every approval gate below needs the owner's
explicit OK.

## Start here

1. Read: `VIDEO_AI_BUILD_PLAN.md`; `docs/ml/real-clips-inventory.md` (**read the B1 sections at the bottom: phone
   pass, MediaCodec, rear-view analysis, MediaPipe spike**); `docs/ml/SWING_METRICS_SPEC.md`; the "Swing Check"
   part of `PROGRESS.md` (the two B1 bullets are new).
2. Live pages (update through `ArtifactData`, always pinning `if_version`; read first):
   - Plan page (static HTML): https://claude.ai/artifact/9TT6wsEmuSZRQ9WXWfuXNs
   - Tracker (`tasks`: opt5 = A, opt6 = B1 now "doing", m1f/m1g/m1h = C; `changes`: **next id c024**):
     https://claude.ai/artifact/8PJycdbkGfPd1ibQtzNj1a
   - Swing Lab, the owner's live page (`live/status`, `log/eNNN` **next e030**, `steps` s1-s8 (s6 = phone check),
     `clips`, `notes`): https://claude.ai/artifact/GwXj8vkQy4twTH62DAmXTc. **Read `notes` at the start and after
     each step** (still empty on 2026-11-12). Mark a note handled with `resolved: true` and a `reply`.
   Update `PROGRESS.md` at each phase boundary.

## Owner decisions on 2026-11-11 (don't re-ask)

1. **MediaCodec decoding for recorded clips: approved** (done).
2. **Rear-view check designed from data: approved** → result: ML Kit landmarks can't do it (below), so the owner
   then chose **"Test MediaPipe on the phone"** over a whole-clip facing rule or a confirm-angle step.
3. **C1 change approved:** `/analyze` gets its per-shot list from the app's own Dart `SwingAnalyzer` (compiled with
   `dart compile exe` so the cv-service needs no Dart SDK), the same way the lab does, so the lab and the app show
   the same numbers by construction. (The pipeline's own shot detection found players in 0 of 9 phone clips, so
   `shots[]` from it would always be empty.) Speed from the court fit when calibrated, else the labelled estimate
   from `lab/estimates.py`.
4. Removing the unused Guest-profile Drift install from the phone: approved and done. Clearing app caches on the
   phone: approved (freed nothing); the owner then freed space themselves.

## Where things stand (end of 2026-11-11)

### B1 real-phone pass (owner's Infinix HOT 30 Play X6835B, Android 13, Helio G37, 8 GB)
| Clip | ML Kit (shipped) | MediaPipe (spike) | Lab |
|---|---|---|---|
| R04 first 30 s | 11/11, 40 s | 11/11, 4 min 37 s | 11/11 |
| R07 rear view | **6/6 measured (wrong)**, 19 s | **refused (correct)**, 2 min 4 s | refused |

- **MediaCodec** (`PoseBridge.analyseWithCodec`, retriever fallback `analyseWithRetriever`): decode 969 → 9.3 ms/frame.
- **ML Kit gives every joint likelihood 1.0**, so the "arm hidden" gate never fires on rear views. 2D geometry
  (facing sign, wrist-inside-torso) can't separate R07 from R04's non-hitting-side cuts or R05; only a whole-clip
  "facing away" share does (R07 98% vs R05 84%), too thin on 2 rear clips.
- **MediaPipe on the phone** fixes it but costs 583–606 ms/frame (7x ML Kit; ~9 min for a 60 s clip) and +23 MB.
  The 606 ms includes a Kotlin YUV→ARGB loop.
- **Unfinished:** a speed variant is written and builds but **was not run**: YUV converted at half resolution
  (points scaled back up), GPU delegate with CPU fallback, and a `DriftPose mediapipe: delegate=… convertMsPerFrame=…
  inferMsPerFrame=…` log line on close. Run it next (R04 and R07) to see where the 600 ms goes.
- Live swings and the bad-framing refusals: not tested yet. iOS: needs a Mac.

### Code added this session (committed, not pushed)
- `PoseBridge.kt`: MediaCodec path; `FramePose` interface with `MlKitFramePose` / `MediaPipeFramePose`;
  `processVideo` takes `poseModel` ("mlkit" default | "mediapipe"); one `DriftPose clip:` timing log line per clip.
  `PoseBridge(context, messenger)` (MainActivity passes `applicationContext`).
- `build.gradle.kts`: `com.google.mediapipe:tasks-vision:1.0.0`, `androidResources.noCompress += "task"`.
  `android/app/src/main/assets/pose_landmarker_full.task` (9.4 MB, Apache-2.0, copied from `cv-service/models/`).
  **This ships in every build right now, even though only test builds use it.** Decide (with the owner) whether
  MediaPipe replaces ML Kit, and remove the dependency and asset if not.
- Dart: `kClipPoseModel` (`DRIFT_POSE_MODEL`) in `swing_check_config.dart`; `NativePoseChannel.poseModelFor(source)`
  so a session records the model that measured it; `data/pose_dump.dart` (`DRIFT_POSE_DUMP`, writes fixture-format
  JSON to `Android/data/app.driftsports.drift/files/pose_dumps/`, test builds only), called from
  `ClipAnalysisController`.
- Fixtures: `mobile/test/features/swing_check/fixtures/real_mlkit/{R04_30s,R07}.json` and
  `real_mediapipe_phone/{R04_30s,R07}.json` (landmarks only, fine to commit).
- **Tests NOT run for any of this.** `flutter analyze lib/features/swing_check` was clean before the last two edits
  (pose_dump source label, MediaPipe speed variant); the Kotlin compiles (APK built). Still needed: unit test for
  `poseDumpJson`, `poseModelFor`, and a calibration-test replay of the `real_mlkit` / `real_mediapipe_phone`
  fixtures (R04 → 11, R07 → 0 detected on MediaPipe).

## What to do next, in order

1. **Finish the MediaPipe decision.** With the phone plugged in (USB debugging is on): build and install the speed
   variant, run R04 and R07, read the `DriftPose` lines. Then give the owner the choice with numbers:
   MediaPipe for clips (and maybe live) vs ML Kit + a weaker rear-view guard. Live capture at ~600 ms/frame would be
   ~1.6 fps, so it can't be live-on-MediaPipe unless the speed variant gets far below that. Write the outcome in
   `docs/ml/real-clips-inventory.md`, the spec, the plan and the tracker.
2. **Test pass** for everything above (mobile `flutter test`, `flutter analyze`, Kotlin compile).
3. **C. Match analysis per-shot output + stat-sheet screen** (tracker m1f/m1g/m1h). Approved shape: see decision 3.
   C1 `utils/shot_output.py` reusing `lab/estimates.py` and the compiled Dart analyzer; C2 overlay MP4 +
   `VideoAnalysisJob.resultVideoKey` (migration on the local DB only); C3 DTO pass-through; C4 rebuild
   `mobile/lib/features/video_analysis/presentation/` to the lab's stat-sheet layout (`video_player`,
   `CustomPainter`), EN/FR/ES; C5 tests. Done when the lab and the app show the same numbers for one clip and R07
   shows reasons and no speeds.
4. **D** waits on landscape clips and `ROBOFLOW_API_KEY`. **E** is the owner's release gate.

## Phone runbook (what worked)

- adb: `"$HOME/AppData/Local/Android/Sdk/platform-tools/adb.exe" -d …`; in Git Bash set `MSYS_NO_PATHCONV=1` for
  device paths, and use `C:/…` paths for `adb pull`.
- Build (dev_run.sh is emulator-only: x86_64, emulator-5554, uninstalls first):
  `flutter build apk --profile --target-platform android-arm64 --dart-define=DRIFT_SWING_CHECK=true
  --dart-define=DRIFT_API_BASE_URL=http://localhost:3009 [--dart-define=DRIFT_POSE_DUMP=true]
  [--dart-define=DRIFT_POSE_MODEL=mediapipe] --dart-define=DRIFT_GOOGLE_SERVER_CLIENT_ID=<as in dev_run.sh>`.
  Profile mode, debug-signed. Never sign a test build with the production key (`key.release.properties`).
- `adb -d install -r --user 0 build/app/outputs/flutter-apk/app-profile.apk`, then `adb -d reverse tcp:3009 tcp:3009`
  (backend on :3009 over USB; `localhost` is allowed for cleartext). The phone's storage is ~99% full: if install
  says INSUFFICIENT_STORAGE, uninstall the test app first (it holds no owner data) or ask the owner to free space.
- Login: local-only account `1swingtest@drifttennis.com` / `Password123` (this phone's keyboard capitalises and
  auto-spaces injected text; type `1swingtest@drifttennis`, keyevent `KEYCODE_PERIOD`, then `com`).
- Clips on the phone: `/sdcard/Movies/DriftTest_R04_30s.mp4` and `DriftTest_R07.mp4` (copied over USB, not sent
  anywhere else). In the photo picker, find the tiles by duration (0:30 and 0:13); positions shift when new
  videos arrive. The picker opens in multi-select mode (extra "Done" tap: worth fixing).
- Timing: `adb -d logcat -v time DriftPose:I flutter:I AndroidRuntime:E '*:S'`.
- **Screen stay-awake:** `adb -d shell svc power stayon usb` during runs, **`svc power stayon false` after**.
  It was left on "usb" when the phone was unplugged on 2026-11-11, so turn it off at the start of the next session
  (or the owner can switch off Developer options → Stay awake). Wireless debugging is also on.
- Ask the owner not to touch the phone during a run; a touch cancelled the first R04 run.
- The PC is short on memory (~0.6 GB free; WSL, Docker and VS Code hold most of it). Run `./gradlew --stop` (with
  `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"`) after each build. Don't kill other Java/Dart processes.

## Rules (from the owner)

- **Build, then test**: write the whole change, then build and test in one pass. "Just write code" means no builds.
- **Translations**: every new user-facing string in EN/FR/ES in the same change (mobile ARB, club-admin messages,
  backend `common/i18n`). Dates and numbers in the active locale. Analysis Lab and platform-admin are English-only.
- **Never raise app install minimums**: iOS 13+ / Android 7+ (minSdk 24). Swing Check is gated at runtime to
  Android 13+ / iOS 15+.
- **Approval gates, never assumed**: version bump, migration on any non-local database, store build or deploy,
  flipping or removing `DRIFT_SWING_CHECK`, sending clips anywhere new, pushing or opening a PR, switching the
  shipped pose model.
- **Refuse rather than invent**: every estimate has an "estimate" chip and reason; every refusal its reason.
- Read and grep the repo yourself; no exploration subagents. Write a plan before multi-file changes the plan
  doesn't cover.
- **Privacy**: clips stay out of git (`cv-service/data/` gitignored; never commit `backend/var/`). Landmark JSON is fine.
- **Secrets**: `ROBOFLOW_API_KEY` from the environment only; never ask for it in chat or write it to a file.
- **Local dev**: backend on **:3009** (`npm run start:dev`), Postgres :5434. Never `npm run build` in `backend/`
  while start:dev runs; avoid `npm run lint` there (auto-fixes ~24 unrelated files).
- **Gradle**: set `JAVA_HOME` to Android Studio's jbr first (JDK 25 fails).
- **Widget tests**: don't `await` a stream subscription's `cancel()` before updating controller state.
- Left out of commits on purpose: `mobile.zip`, `*-check.png`, `backend/var/`, `CLUB_ADMIN_REDESIGN_PLAN.md`,
  `COMMUNITIES_MANUAL_E2E_HANDOFF_PROMPT.md` (other work).

## Things only the owner can unblock

- The phone plugged in (for the MediaPipe speed variant and the live-swing test) and someone to hit for live swings.
- The pose-model decision once the numbers are in.
- 3-5 landscape rally clips sent as files, plus one 10+ minute session (D).
- `ROBOFLOW_API_KEY` in their environment (D3). A Mac (iOS).
- Explicit OK on each approval gate.

## Done means

Spec acceptance criteria met on a real phone; match analysis passing its go/no-go with numbers or ending in a
documented no-go; all tests green (mobile `flutter test`, backend `npx jest`, cv-service
`pytest tests/test_lab.py tests/test_api.py`); tracker, `PROGRESS.md`, Swing Lab and the spec updated; nothing
deployed, pushed or versioned without the owner's go-ahead.
