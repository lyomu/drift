# Swing Check — on-device swing metrics (spec for review)

2026-11-10 · Status: **approved 2026-11-10**, all four open questions resolved as recommended:
(1) the AI Coach button opens a menu with "Swing check" and "Analyse a clip"; (2) the coach provider supports
OpenAI and Claude, defaulting to whichever key is configured; (3) sessions are stored on the backend, metrics
only; (4) the iOS minimum version is raised only with explicit OK.
Part of the merged video plan (`AI_VIDEO_ANALYSIS_IMPLEMENTATION_PLAN.md`, "Optional" track). Independent of
the cv-service pipeline and of the Phase 0 re-shoot.

## Goal

A player props their phone side-on, hits a few forehands or serves, and gets body-mechanics numbers for each
swing plus short coaching feedback. Everything that sees the camera runs on the phone. Only the numbers leave it.

## Scope

**In:** forehand and serve · side-on camera · one player in frame · live analysis while filming · per-swing
metrics · session summary · AI Coach feedback text · EN / FR / ES.

**Out (and why):**
- **Backhands.** September measured MediaPipe losing the racket arm on 44–58% of backhands
  (`cv-service/DRIFT_CHANGES.md`). ML Kit uses the same pose model family.
- **Automatic stroke classification.** The player picks forehand or serve before filming. Pose-based
  classifiers were built and rejected in September.
- **Ball, racket, court, speed in km/h.** Those belong to the cv-service pipeline.
- **Uploading video.** No video or pose landmarks leave the phone.

## User flow

1. **Entry.** The AI Coach button (today a "Coming soon" tooltip, `mobile/lib/core/shell/ai_coach_fab.dart`)
   opens Swing Check. *(Open question 1.)*
2. **Setup screen.** Pick forehand or serve. Four setup tips with an illustration: side-on to the hitting
   arm, phone propped at waist height, 3–5 m away, whole body in frame, landscape.
3. **Capture screen.** Camera preview with a skeleton overlay. A framing chip says "Whole body visible" or what
   is missing. Swings are detected automatically and counted. Stop button. Aim for 5–10 swings.
4. **Results screen.** Session summary, a card per swing (measured or "not measured" with the reason), and the
   coach's feedback. Saved to history.
5. **Recorded clip (added 2026-11-11, VIDEO_AI_BUILD_PLAN.md A).** The setup screen also offers "Use a recorded
   clip": the player picks a video from the gallery, the phone decodes up to the first 60 s at 15 fps
   (`processVideo` in the native bridge: `MediaMetadataRetriever` + ML Kit on Android, `AVAssetImageGenerator` +
   Vision on iOS) with a progress screen and Cancel, then the same `SwingAnalyzer` and results screen run. The
   clip never leaves the phone. Clip-specific refusals: no player found, no swings found (named cause: filmed
   from behind), unreadable file. Results say "Measured from a recorded clip" and, for longer clips, that only
   the first 60 s were analysed.

## Technical design

### Pose model

**Revised 2026-11-10 (owner decision):** the app must stay installable on every phone it supports today
(iOS 13+, Android 7+). Swing Check itself is available on **Android 13+ and iOS 15+** and hidden from the AI
Coach menu on older phones. The `google_mlkit_pose_detection` Flutter plugin was dropped because its iOS pods
force iOS 15.5 on the whole app. Instead, a small in-app native bridge (`app.driftsports.drift/pose` method
channel, `lib/features/swing_check/data/native_pose_channel.dart`):

- **Android:** Google ML Kit Pose Detection, *accurate* model, stream mode, called directly
  (`android/app/src/main/kotlin/app/driftsports/drift/PoseBridge.kt`, `com.google.mlkit:pose-detection-accurate`).
  Free for commercial use under Google's ML Kit terms.
- **iOS:** Apple Vision `VNDetectHumanBodyPoseRequest` (in `ios/Runner/AppDelegate.swift`, so no Xcode project
  edit is needed). Built into iOS, no extra dependency.
- Both return the same 13 joints in upright-image pixels with a 0..1 confidence. Each session stores its
  `poseModel` (`mlkit-pose-accurate-android` or `apple-vision-body-pose`), because the two detectors can give
  slightly different values. The 0.5 reliability threshold may need tuning per platform on real phones.
- Camera frames come from the `camera` plugin's image stream. One frame is processed at a time; frames that
  arrive while the detector is busy are dropped, so latency never builds up.
- Target: **15+ processed frames per second on an 8 GB phone.** Measured during testing, not assumed.

### Swing detection (no classifier)

- Signal: speed of the dominant-hand wrist, divided by torso length so it doesn't depend on distance to the
  camera. Dominant hand comes from the profile's existing `dominantHand` field, with a toggle on the setup
  screen if it isn't set.
- A swing is a speed peak above a threshold, with a window from 0.8 s before to 0.5 s after the peak.
  Peaks closer than 1.4 s apart merge.
- **Tuned 2026-11-11** on 79 hand-labelled swings from 7 real clips (`docs/ml/real-clips-inventory.md`):
  threshold **4.0 torso lengths/s** (the first guess of 6.0 missed 18 of 24 side-on forehands), merge window
  1.4 s (was 1.2 s). Recall 80% and precision 88% on all clips; 91% / 92% on front, side and three-quarter
  views. Rear views fail (hitting wrist hidden). Regression-guarded by
  `mobile/test/features/swing_check/real_clips_calibration_test.dart`.
- **"Contact" is the moment of peak wrist speed.** It's an approximation (there's no ball detection), and the
  UI says "around contact".
- Thresholds were tuned on real footage (above). The quality-gate settings were kept: their refusals fell on
  the rear-view, night and montage clips, as intended. Re-check both on a real phone, since ML Kit and Vision
  likelihoods differ from MediaPipe's.

### Quality gate (refuse rather than invent)

Each swing is measured only if both shoulders, both hips, the dominant elbow and wrist, and both knees have
likelihood ≥ 0.5 in at least 80% of the window's frames. Otherwise the swing card shows "Not measured" with
one reason:

- the hitting arm was hidden
- part of the body was out of frame
- the swing was too fast or blurred to follow

A session with fewer than 3 measured swings shows the reasons and setup tips, and asks for no coach
feedback. This follows the cv-service rule: a specific refusal, never a made-up number.

### Metrics

All 2D, in the image plane, from a side-on view. Angles are scale-free; heights are relative to the
player's own body, so camera distance doesn't matter.

| Metric | Forehand | Serve | How |
|---|---|---|---|
| Contact height | ✓ | ✓ | Wrist height at contact, as % of the player's height (ankle to nose) |
| Arm extension at contact | ✓ | ✓ | Elbow angle (shoulder–elbow–wrist) |
| Knee bend | ✓ | ✓ | Smallest knee angle in the loading phase before contact |
| Contact in front | ✓ | | Wrist ahead of the front hip at contact, as % of torso length |
| Swing tempo | ✓ | ✓ | Time from backswing start (wrist speed rises) to contact |
| Follow-through finish | ✓ | | Wrist height at the end of the window relative to the shoulder |
| Trophy-to-contact time | | ✓ | Time from the racket-arm low point to contact |

- **Shoulder and hip rotation are left out.** A side-on 2D view can't measure them reliably. A
  foreshortening proxy would look precise and be wrong.
- **No "pro" target numbers in v1.** There's no validated reference data. The results show the player's
  own averages and consistency (spread across swings), and trends across sessions. The coach text gives
  qualitative guidance ("contact further in front", "extend the arm fully on the serve").

### Data and backend

- **New Prisma model `SwingSession`:** `id`, `userId`, `stroke` (FOREHAND | SERVE), `dominantHand`,
  `swingsDetected`, `swingsMeasured`, `metrics` (JSON: per-swing values and refusal reasons), `summary` (JSON),
  `feedback` (JSON, nullable), `poseModel` and `appVersion` strings, `createdAt`. Migration included.
  Added 2026-11-11: `source` (LIVE | CLIP, default LIVE; migration `20261111120000_swing_session_source`) and,
  for clips only, `metrics.clip = {analysedMs, truncated}`, validated server-side.
- **Endpoints** (auth required, own data only):
  - `POST /swing-sessions` saves a session (metrics only).
  - `GET /swing-sessions` returns history, and `GET /swing-sessions/:id` returns one session.
  - `POST /swing-sessions/:id/feedback` generates and stores the coach text.
- **Coach feedback** uses a provider interface in the same shape as `backend/src/news/openai-news-ai.provider.ts`:
  env `COACH_AI_PROVIDER` (`disabled` by default), structured JSON output of 2–4 tips, each tied to a metric.
  It's written in the user's locale (EN / FR / ES), with a 15 s timeout and one retry. Its input is the metrics,
  stroke, handedness and refusal reasons only. With the provider disabled or failing, the results screen shows
  metrics without the text, plus a translated notice. *(Open question 2: which LLM.)*
- **Account deletion:** `SwingSession` is added to `backend/src/privacy/erasure.service.ts`.
  `erasure-coverage.spec.ts` will fail until it is.
- **Rate limit** on the feedback endpoint, so one user can't run up LLM cost.

### Files

**Mobile:** new `mobile/lib/features/swing_check/`
- `domain/` — `pose_frame.dart` (landmark time series), `swing_detector.dart`, `swing_metrics.dart`,
  `quality_gate.dart`. Pure Dart, no Flutter imports, so it's unit-testable without a camera.
- `data/` — `pose_source.dart` (camera + ML Kit wrapper behind an interface), `swing_check_repository.dart` (API)
- `application/swing_check_providers.dart` (Riverpod)
- `presentation/` — `swing_check_setup_screen.dart`, `swing_check_capture_screen.dart`,
  `swing_check_results_screen.dart`, `swing_check_history_screen.dart`, `widgets/pose_overlay_painter.dart`
- `core/router/app_router.dart` — routes `/swing-check`, `/swing-check/capture`, `/swing-check/:id`
- `core/shell/ai_coach_fab.dart` — navigate, behind a build flag (`--dart-define=SWING_CHECK=true`) until launch
- `pubspec.yaml` — `camera`, `google_mlkit_pose_detection`
- `android/app/src/main/AndroidManifest.xml` — `CAMERA` permission (minSdk 24 is fine)
- `ios/Runner/Info.plist` — `NSCameraUsageDescription`, translated through `InfoPlist.strings` for fr and es
- `l10n/app_en.arb`, `app_fr.arb`, `app_es.arb` — every new string, all three in the same change

**Backend:** new `backend/src/swing-sessions/` (module, controller, service, DTOs, coach feedback provider),
the Prisma model and migration, the erasure service entry, `.env.example` entries, and the module registered in
`app.module.ts`.

### Testing (one pass at the end, per the build-then-test convention)

- **Unit (Dart):** swing detection and every metric on synthetic landmark series with known answers, for
  example a scripted arm at a fixed elbow angle. Quality-gate refusals for each reason. Left-handed mirroring.
- **Widget:** setup, capture (fake pose source) and results screens, with the repository mocked via mocktail.
  Includes the refused-session and feedback-unavailable states.
- **Backend (jest):** service and controller, ownership checks, provider disabled and failing, erasure coverage.
- **On a real 8 GB phone** (`mobile/tool/dev_run.sh`): processed frames per second, 10 forehands and 10 serves
  side-on, plus deliberately bad framing to check the refusal reasons. Numbers written down.

## Acceptance criteria

- [ ] 15+ processed frames per second on an 8 GB test phone, or a documented reason and fallback
- [ ] At least 8 of 10 clean side-on swings are detected and measured, for both forehand and serve
- [ ] A badly framed session gives specific reasons and no metrics or feedback for those swings
- [ ] No video or landmark data is sent off the phone (checked in the repository code and a network log)
- [ ] All new text appears in EN, FR and ES
- [ ] Deleting the account deletes swing sessions

## Open questions

1. **Entry point.** Should the AI Coach button open Swing Check directly, or a small menu with "Swing check"
   and the existing "Analyse a clip" (`/video-analysis`)? Recommended: the menu, so both features have a door.
2. **LLM for feedback.** Reuse the existing OpenAI setup (key already configured for news), or use Claude?
   Either fits the provider interface. Recommended: build the interface for both and default to whichever
   key production already has.
3. **History on the server.** Store sessions on the backend (trends across devices, and the AI Coach can
   reference past sessions), or keep them on the phone only? Recommended: backend, metrics only.
4. **iOS minimum version.** ML Kit's iOS requirement may be above the app's current deployment target.
   This gets checked when the plugin is added, and the target is raised only with your OK.

## Risks

- **2D side-on measurements are approximations.** They're presented as "your numbers and your consistency",
  never as precise biomechanics.
- **Motion blur at contact.** At 30 fps the wrist can blur and its landmark lag behind. The contact metrics are
  the most affected, and the quality gate catches the worst frames.
- **Phone heat and battery** during long captures. Sessions are capped at 2 minutes.
