# Handover: Drift Tennis video AI, build-everything phase

You're continuing the video AI work for Drift Tennis. On 2026-11-11 the owner decided to **build both features
to completion, promise nothing publicly, and release only when the whole thing works**. Release target when ready:
an internal build on the owner's phone, then Play internal track and TestFlight.

Don't re-ask which feature to prioritise or whether to release early. That is decided.

## The plan is approved

`VIDEO_AI_BUILD_PLAN.md` (workstreams A to E) was **approved by the owner as written on 2026-11-11**. You don't
need to ask again before working through it. You still need a short written approach before a large multi-file
change that the plan doesn't already describe, and every approval gate below still needs the owner's explicit OK.

## Start here

1. Read, in this order: `VIDEO_AI_BUILD_PLAN.md`, `docs/ml/real-clips-inventory.md` (what the real clips showed
   and how Swing Check was calibrated), `cv-service/PHASE0_FINDINGS.md` (bottom section: the 2026-11-11 re-run),
   `docs/ml/SWING_METRICS_SPEC.md`, and the "Swing Check" part of `PROGRESS.md` (includes the Analysis Lab and the
   recorded-clip bullets).
2. Open the live pages and keep them current:
   - Plan page (static HTML; republish via `Artifact` read with `path: "index.html"`, edit, publish to the url):
     https://claude.ai/artifact/9TT6wsEmuSZRQ9WXWfuXNs
   - Tracker (database `tasks`: opt5 is A and is done; m1f = C1-C3, m1g/m1h = C4/C5, s0a-c, prep8 and older;
     `changes`: **next id is c022**): https://claude.ai/artifact/8PJycdbkGfPd1ibQtzNj1a
   - Swing Lab, the owner's live progress page (database `live/status`, `log/eNNN` **next is e023**, `steps`
     s1-s8, `clips`, `notes`): https://claude.ai/artifact/GwXj8vkQy4twTH62DAmXTc. **Read its `notes` collection
     at the start and after each step**; the owner writes to it (it was empty on 2026-11-11). Mark a note handled
     with `resolved: true` and a `reply`.
   Update through the `ArtifactData` tool, always pinning `if_version` (read first to get versions). Update
   `PROGRESS.md` at each phase boundary.

## Where things stand (end of 2026-11-11)

- **A. Swing Check "Analyse a recorded clip": code and automated tests done.** Setup screen button → gallery
  pick (`image_picker`) → native `processVideo` (Android `MediaMetadataRetriever.getScaledFrameAtTime` + ML Kit,
  640 px frames; iOS `AVAssetImageGenerator` + Vision) on the first 60 s at 15 fps, with progress over the
  `app.driftsports.drift/pose_progress` EventChannel and Cancel → same `SwingAnalyzer` → results screen with
  "Measured from a recorded clip" (and "only the first 60 s" when cut). Key files:
  `mobile/lib/features/swing_check/data/clip_pose_source.dart`,
  `application/clip_analysis_controller.dart`, `presentation/swing_check_clip_progress_screen.dart`, route
  `/swing-check/clip`, `PoseBridge.kt`, `ios/Runner/AppDelegate.swift`. Backend: `SwingSession.source`
  (LIVE | CLIP) + `metrics.clip = {analysedMs, truncated}` validated in `swing-sessions.service.ts`; migration
  `20261111120000_swing_session_source` applied to the **local** DB only. One deliberate deviation from the plan:
  `ClipPoseSource` has its own interface beside the camera `PoseSource` (a clip has no preview).
  Evidence: R04's first 30 s of landmarks through the clip path = 11 detected / 11 measured (lab: 11); R07 (rear
  view) refused with "filmed from behind", nothing saved. **Its "done when" still needs a phone** (part of B1).
  Android rotation note: the bridge assumes the platform returns upright frames and only turns 90/270 videos that
  come back in their stored shape; check a portrait phone video on the phone.
- **Swing Check live camera**: calibrated on 79 hand-labelled swings (peakSpeed 4.0 torso lengths/s, merge 1.4 s):
  80% found / 88% correct; 91% / 92% on front, side and three-quarter views. Rear views fail. **Never run on a
  real phone.** iOS Swift bridge never compiled (no Mac).
- **Match video analysis** (cv-service on Tennis-Vision, NestJS BullMQ queue, mobile upload + results): built.
  Court check passed on 1 of 9 real clips (an empty court), 0 of 8 with play; all 9 are portrait TikTok exports.
  No go/no-go yet: needs landscape, still-phone, full-quality clips.
- **Analysis Lab** (internal, English-only): `cv-service/lab/`, http://localhost:8010/lab. Start with
  `cd cv-service && venv/Scripts/python -m uvicorn api:app --port 8010`. Ball tracking last ran out of memory on
  this PC; swings still work.
- **Tests at end of session:** mobile `flutter test` 721 passed, backend `npx jest` 1005 passed, `flutter analyze`
  clean, `./gradlew :app:compileDebugKotlin` succeeds. cv-service tests not re-run this session (unchanged).
- **Committed** on branch `chore/version-0.9.0-build6` (not pushed, no PR). Left out on purpose:
  `mobile.zip`, the `*-check.png` screenshots, `backend/var/` (local uploaded videos),
  `CLUB_ADMIN_REDESIGN_PLAN.md`, `COMMUNITIES_MANUAL_E2E_HANDOFF_PROMPT.md` (other work).

## What to do next, in order

1. **C. Match analysis per-shot output and the stat-sheet results screen** (plan C1-C5; tracker m1f, m1g, m1h).
   Unblocked. Start with a short written approach for C, since it spans cv-service, backend and mobile:
   - C1 `/analyze` adds `shots[]` in `cv-service/api.py` via a new `utils/shot_output.py` that reuses
     `cv-service/lab/estimates.py` (30 km/h floor, 250 km/h ceiling, "estimate" flag + reason).
   - C2 overlay `analysis.avi` → H.264 MP4 under the job's storage key; `VideoAnalysisJob.resultVideoKey` column
     + migration (local DB only); signed URL like the upload.
   - C3 backend DTO pass-through; C4 rebuild `mobile/lib/features/video_analysis/presentation/` results screen to
     the lab's stat-sheet layout (`video_player`, `CustomPainter` overlay), EN/FR/ES; C5 tests.
   - Done when the lab and the app show the same numbers for one clip, and R07 shows reasons and no speeds.
2. **B1 real-phone pass** the moment the owner plugs in an Android 13+ phone: `mobile/tool/dev_run.sh` with
   `--dart-define=DRIFT_SWING_CHECK=true` added to its build command. Run R04 (first 30 s) and R07 as recorded
   clips (copy them to the phone from `cv-service/data/real_clips/`; that is not "sending them anywhere new", but
   say what you're doing), then live swings if someone can hit. Record fps / decode time per frame, swing counts,
   and whether the 0.5 likelihood and 4.0 / 1.4 s thresholds hold on ML Kit, in `docs/ml/real-clips-inventory.md`.
   B2 (iOS) needs a Mac.
3. **D. Footage-dependent work**: waits on landscape clips and `ROBOFLOW_API_KEY`.
4. **E. Release gate**: owner decides.

## Rules (from the owner)

- **Build, then test**: write the whole change, then do all builds and tests in one pass at the end. Don't run
  builds or dev servers mid-task when told "just write code".
- **Translations**: every new user-facing string in EN/FR/ES in the same change (mobile ARB files, club-admin
  messages, backend `common/i18n`). Format dates and numbers with the active locale. The Analysis Lab and
  platform-admin are English-only.
- **Never raise app install minimums**: iOS 13+ and Android 7+. Swing Check is gated at runtime to Android 13+ /
  iOS 15+.
- **Approval gates, never assumed**: version bump, migration on any non-local database, store build or deploy,
  flipping or removing `DRIFT_SWING_CHECK`, sending the clips anywhere new, pushing or opening a PR.
- **Refuse rather than invent**: every estimate carries an "estimate" chip and reason; every refusal carries its
  reason. Never show a fabricated number as fact.
- Read and grep the repo yourself; don't spawn exploration subagents.
- **Privacy**: keep clips out of git (`cv-service/data/` is gitignored; `backend/var/` must not be committed).
  Landmark JSON is fine to commit.
- **Secrets**: the Roboflow key is read from the `ROBOFLOW_API_KEY` environment variable. Never ask for a key in
  chat or write one into a file.
- **Local dev**: backend on **:3009** (port 3000 belongs to another project); local Postgres on :5434. Never
  `npm run build` in `backend/` while `start:dev` runs. `npm run lint` there auto-fixes ~24 unrelated files, so
  avoid it. Use `mobile/tool/dev_run.sh`, not `flutter run`, for the phone.
- **Gradle**: plain `./gradlew` picks up JDK 25 and fails with "25.0.4.1". Set
  `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"` first (or use `flutter build`). Run
  `./gradlew --stop` before and after heavy runs.
- **Machine limits**: 15.7 GB RAM and an 8 GB GPU; one lab job at a time.
- **Tests in widget tests**: don't `await` a stream subscription's `cancel()` before updating controller state; it
  adds an event-loop turn that `pumpAndSettle` won't wait for.

## Things only the owner can unblock

- Plug in an Android 13+ phone (no live hitting needed now: recorded clips work).
- 3-5 landscape clips of a rally on a well-marked court, phone still, sent as files (not WhatsApp video), plus one
  10+ minute session.
- Set `ROBOFLOW_API_KEY` in their environment.
- A Mac, for iOS.
- Their explicit OK on each approval gate above.

## Done means

Spec acceptance criteria met on a real phone; match analysis either passing its go/no-go with numbers or ending in
a documented no-go; all tests green (mobile `flutter test`, backend `npx jest`, cv-service `pytest tests/test_lab.py
tests/test_api.py`); tracker, `PROGRESS.md`, Swing Lab and the spec updated; nothing deployed, pushed or versioned
without the owner's go-ahead.
