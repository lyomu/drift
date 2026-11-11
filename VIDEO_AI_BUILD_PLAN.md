# Video AI: build-everything plan

2026-11-11 · Status: **approved by the owner as written (2026-11-11)** · Plan page: https://claude.ai/artifact/9TT6wsEmuSZRQ9WXWfuXNs
Live tracker: https://claude.ai/artifact/8PJycdbkGfPd1ibQtzNj1a · Progress page (Swing Lab): https://claude.ai/artifact/GwXj8vkQy4twTH62DAmXTc

## Direction (owner, 2026-11-11)

Build both features to completion: **Swing Check** (technique numbers from the phone camera) and **match video
analysis** (ball speed, placement, rally stats from an uploaded clip). Promise nothing publicly. Release when the
whole thing works. Release target when ready: internal build on the owner's phone, then Play internal track and
TestFlight.

This plan replaces the ordering question with a work list. The September plan
(`AI_VIDEO_ANALYSIS_IMPLEMENTATION_PLAN.md`) stays the reference for match-analysis phases; the Swing Check spec
(`docs/ml/SWING_METRICS_SPEC.md`) stays the reference for metrics. Numbers so far: `docs/ml/real-clips-inventory.md`,
`cv-service/PHASE0_FINDINGS.md`.

## Where things stand

| Area | State | Evidence |
|---|---|---|
| Swing Check: live camera, metrics, coach text, backend, EN/FR/ES | built, calibrated | 79 labelled swings: 80% found, 88% correct; side views 91% / 92% |
| Swing Check on a real phone | never run | needs an Android 13+ phone; iOS needs a Mac |
| Match analysis: cv-service, backend queue, app upload + results | built | 0 of 8 real clips with play pass the court check (portrait, 480–576 px) |
| Analysis Lab (local test page) | built | `cv-service/lab/`, strokes verified on R04 (11/11) |
| Model fine-tuning on phone footage | not started | needs `ROBOFLOW_API_KEY`, GPU time |

## Workstreams

Ordered by what is unblocked. A, B and C can start now. D waits on footage. E is the gate at the end.

### A. Swing Check: "Analyse a recorded clip" (new feature, unblocked)

**Status 2026-11-11: code and automated tests done** (A1–A6). R04's first 30 s replayed through the clip path: 11
swings, matching the lab; R07 refused. Its "done when" still needs the phone run (B1). iOS bridge not compiled (no Mac).

Why: it lets any player test Swing Check on footage they already have, and it makes the real-phone pass possible
without someone hitting live in front of the phone.

- **A1 Native bridge.** Add `processVideo(path, sampleFps, maxSeconds)` to `PoseBridge.kt` (Android:
  `MediaMetadataRetriever` or `MediaCodec` frames → ML Kit) and to `AppDelegate.swift` (iOS: `AVAssetImageGenerator`
  → Vision). Streams progress over an `EventChannel`; returns frames in the existing 13-joint shape. Nothing in
  `domain/` changes: the same `SwingAnalyzer` runs on the result.
- **A2 Dart data layer.** `ClipPoseSource` beside the camera `PoseSource`, behind the same interface. Clip picked with
  `image_picker` (already a dependency). Hard cap 60 s, same as live sessions are capped at 2 minutes.
- **A3 Screens.** Setup screen gets "Use a recorded clip". A progress screen (frames done / total, cancel). Results
  and history screens are reused. Session records `source: LIVE | CLIP` and the same `poseModel`.
- **A4 Backend.** `SwingSession.source` enum column (default LIVE), migration, DTO, erasure spec unchanged. Metrics
  only; the clip never leaves the phone.
- **A5 Strings** in EN/FR/ES: button, tips for choosing a clip (side-on, one player, phone still), progress,
  refusals specific to clips ("clip too long, first 60 s analysed", "no person found").
- **A6 Tests.** Dart: clip source with a fake bridge, screens with mocktail. Backend: DTO and service spec.
- **Done when:** R04 (first 30 s) analysed on a phone gives the same swing count as the lab (11) within ±1, and a
  rear-view clip (R07) yields refusals, not numbers.

### B. Swing Check: real-phone pass and release path (needs the owner's phone)

- **B1 Phone pass** on an Android 13+ phone via `mobile/tool/dev_run.sh` with `--dart-define=DRIFT_SWING_CHECK=true`:
  processed fps, 10 forehands and 10 serves side-on (live or via A on R04), bad framing for each refusal reason.
  Confirm the 0.5 likelihood threshold and the tuned detector (4.0 / 1.4 s) hold on ML Kit landmarks. Numbers
  written to `docs/ml/real-clips-inventory.md`.
- **B2 iOS**: compile the Vision bridge, add `ios/Runner/{fr,es}.lproj/InfoPlist.strings` to the Runner target,
  repeat B1 on an iPhone (iOS 15+). Needs a Mac.
- **B3 Release prep**, each step only with the owner's explicit OK: `swing_sessions` (+ A4) migration on the
  production database, `COACH_AI_PROVIDER` and key on the server, flag `DRIFT_SWING_CHECK` on for the build,
  version bump per `docs/PLAY_SUBMISSION.md`, `kSwingCheckAppVersion` updated.
- **Done when:** spec acceptance criteria all ticked on a real phone, and the internal build installs from the
  Play internal track.

### C. Match analysis: per-shot results and the stat-sheet screen (unblocked)

Why: the app's current results screen shows totals and refusals. The lab's stat-sheet layout (strokes, split,
speed, history, sequence, placement, per-swing numbers, overlay video) is what the owner wants players to see.

- **C1 cv-service per-shot output.** `/analyze` adds `shots[]` (time, label, measured speed when the court is
  calibrated, otherwise the labelled estimate from `lab/estimates.py` scaled from player height, landing point in
  court or camera coordinates, source flag). Pose height comes from the pipeline's existing `utils/pose_estimator.py`.
  Estimates obey the floor (30 km/h) and ceiling (250 km/h) already in the lab; anything outside is "no estimate"
  with a reason. The validity gate's refusals are untouched: an estimate is always marked as one.
- **C2 Overlay video delivery.** The pipeline's `analysis.avi` becomes an H.264 MP4 stored under the job's storage
  key; the backend serves it through a signed URL like the upload. `VideoAnalysisJob.resultVideoKey` column.
- **C3 Backend pass-through.** `analysisResult` JSON already stores the summary whole; `shots[]` rides along. Add
  the result-video field to the DTO. Push copy unchanged.
- **C4 Mobile results screen** rebuilt to the stat-sheet layout with native `video_player` and a `CustomPainter`
  for the skeleton and ball on top of the plain clip when no overlay exists: headline, strokes, groundstrokes /
  serves, speed (measured or estimate chip), speed history, shot sequence (tap to seek), placement (court or
  camera-view), court and ball check, per-shot table. Every estimate carries the "estimate" chip and a one-line
  reason; every refusal carries its reason. EN/FR/ES.
- **C5 Tests.** cv-service: per-shot assembly and estimate flags on a recorded summary. Backend: DTO spec. Mobile:
  widget tests for calibrated, estimated and refused results.
- **Done when:** a lab run and the app show the same numbers for the same clip, and the refused clip (R07) shows
  reasons and no speeds.

### D. Match analysis: go/no-go and model fine-tuning (needs footage)

- **D1 Footage.** 3–5 landscape clips, phone still (propped or tripod), fence-height if possible, well-marked court,
  players on both sides of the net, transferred as files (not WhatsApp video). Any player in the group can film
  them. Plus one 10+ minute session for rally splitting.
- **D2 Go/no-go.** Run `tools/real_clips_phase0.py` on them; court-gate pass rate, ball detection, player
  selection into `PHASE0_FINDINGS.md`. Bar: court gate passes on at least half.
- **D3 Fine-tune** court keypoints and an RF-DETR ball detector (Apache-2.0, not Ultralytics) on the Universe sets
  in `docs/ml/dataset-shortlist.md` plus frames from D1. Accuracy is measured only on held-out Drift footage.
  Needs `ROBOFLOW_API_KEY` in the environment; the owner has OK'd third-party processing of the group's clips
  (2026-11-11). Fill the attribution registry in the shortlist.
- **D4 Rally splitting** checked on the 10-minute session; thresholds in `utils/rally_segmenter.py` lose their
  `provisional` mark or get changed.
- **D5 Stroke type** stays confidence-gated per the September plan: shipped only above a measured bar on Drift
  footage; otherwise shots are "groundstroke".
- **Done when:** D2 has numbers, D3 reports held-out accuracy before and after, and the app end-to-end (upload →
  job → push → results) works on a real phone with one D1 clip.

### E. Release gate (owner decides)

All of A–C done, B1 passed, D2 answered. Then, with explicit OKs: production migrations (`swing_sessions`,
`SwingSession.source`, `resultVideoKey`), server env, flag removal, version bump, Play internal track, TestFlight
when a Mac exists. Nothing is announced before that.

## Order of work

1. **A** (recorded clip) first: unblocked, and it unlocks B1 without live hitting.
2. **C1–C5** next, in parallel with A where files don't overlap.
3. **B1** the moment the phone is available; **B2** when a Mac is.
4. **D** as soon as footage arrives; D3 can start earlier on public data once the key is set.
5. **E**.

## Approval gates (never assumed)

Version bump · migration on any non-local database · store build or deploy · flipping or removing
`DRIFT_SWING_CHECK` · uploading the group's clips anywhere new · raising iOS/Android minimums (not planned; Swing
Check stays runtime-gated to Android 13+ / iOS 15+).

## Risks

- **Clip decoding speed on phones.** Frame extraction at 15 fps for 60 s is 900 frames; `MediaMetadataRetriever`
  can be 50 ms per frame on mid-range phones (45 s). Mitigation: `MediaCodec` path if measured too slow; cap and
  progress UI either way.
- **Estimates read as facts.** Mitigation: chip and reason on every estimate, floor/ceiling, and the lab's
  wording ("scaled from player height; ignores depth; can be off by 2x").
- **Footage never arrives.** Then D stays open and the release ships Swing Check with match analysis still
  behind its own flag. That is a release-gate decision for the owner, not a plan change.
- **Detector tuned on MediaPipe, shipped on ML Kit / Vision.** B1 exists to catch this; thresholds live in one
  place (`SwingDetectorConfig`) and the calibration test guards regressions.

## Files this plan touches (new or changed)

Mobile: `features/swing_check/{data/clip_pose_source.dart, presentation/swing_check_clip_progress_screen.dart,
presentation/swing_check_setup_screen.dart, domain/swing_session.dart}`, `features/video_analysis/presentation/*`,
`android/.../PoseBridge.kt`, `ios/Runner/AppDelegate.swift`, `l10n/app_{en,fr,es}.arb`, tests.
Backend: `prisma/schema.prisma` (+2 migrations), `src/swing-sessions/*`, `src/video-analysis/*`, `common/i18n` if
push copy changes.
cv-service: `api.py` (`/analyze` shots), `utils/shot_output.py` (new, shares `lab/estimates.py`), `tests/`.
Docs: this file, `PROGRESS.md`, `docs/ml/SWING_METRICS_SPEC.md`, `PHASE0_FINDINGS.md`, tracker.
