# Real clips: inventory and Swing Check calibration (2026-11-11)

Nine clips supplied by the owner on 2026-11-11 (consent confirmed by the owner). The videos live in
`cv-service/data/real_clips/` (gitignored, never committed, never uploaded). Clip ids only, no names.
The repo holds only pose landmarks extracted from them (`mobile/test/features/swing_check/fixtures/real/`).

Tools: `cv-service/tools/clip_inventory.py` (metadata), `cv-service/tools/real_clips_phase0.py` (court and
ball check), `cv-service/tools/pose_fixtures.py` (landmarks for Swing Check).

## Inventory

All nine are TikTok exports forwarded over WhatsApp: portrait, re-encoded to 480–576 px wide, 30 fps, H.264.
Several are edited (jump cuts, text overlays, a TikTok end card).

| Clip | Resolution | Length | Camera | Court marking | Strokes | Players in frame | Edited |
|---|---|---|---|---|---|---|---|
| R01 | 576x1024 | 14.2 s | behind the baseline, ground level, static | good (blue hard court) | forehands (left-handed) | 2 (rally) | jump cuts |
| R02 | 480x864 | 29.0 s | handheld pans of an empty court | good (red clay, white lines) | none | 0 | montage |
| R03 | 480x864 | 26.6 s | courtside, ground level, static, night | faint | forehands | 1–2, far (torso ~28 px) | no |
| R04 | 576x1024 | 140.0 s | indoor; front and side-on cuts, then rear | good | 45 forehands, 4 serves | 1 | cuts every ~2.5 s |
| R05 | 480x864 | 7.7 s | rear three-quarter, static | worn | 2 forehands | 1 | no |
| R06 | 480x864 | 12.2 s | three-quarter side, static | almost none (dirt) | 3 forehands | 1 near + far | end card |
| R07 | 576x1024 | 14.0 s | directly behind the player, indoor | good | 2 forehands, 4 backhands | 2 (rally) | no |
| R08 | 576x1054 | 45.2 s | handheld, mixed angles, indoor clay | faint | forehands, serves | 1 + spectators | cuts every ~1 s |
| R09 | 576x1024 | 74.3 s | behind the baseline, handheld zoom, indoor clay | faint | rally | 2, small | no |

None is the capture Phase 0 asked for (landscape, static, elevated, original quality), and none is a clean
side-on Swing Check setup. R04 comes closest for Swing Check: one player, close, good light, with 24
side-on swings.

## Phase 0 (match video): court and ball check

`tennis-vision` with `--fast --no-stubs`, first 300 frames (10 s) of each clip. The court gate is line
support ≥ 0.22. Ball = share of frames with a ball detection.

| Clip | Court line support | Court gate | Ball detected | Player selection |
|---|---|---|---|---|
| R01 | 0.071 | FAIL | 58% | failed |
| R02 | 0.240 | **PASS** | 3% (no play) | failed (no players) |
| R03 | 0.098 | FAIL | 6% | failed |
| R04 | 0.000 | FAIL | 15% | failed |
| R05 | 0.162 | FAIL | 13% | failed |
| R06 | 0.211 | FAIL | 26% | failed |
| R07 | 0.187 | FAIL | 22% | failed |
| R08 | 0.038 | FAIL | 3% | failed |
| R09 | 0.202 | FAIL | 28% | failed |

**Court gate passed on 1 of 9 clips, and 0 of the 8 that show play.** No crashes (September's NaN crash did
not recur).

The precheck rejected all nine on headers alone (portrait, width under 960 px) before looking at the
court. See `cv-service/PHASE0_FINDINGS.md` for the go/no-go.

## Swing Check calibration

**Method.** MediaPipe Pose Landmarker *full* (Apache-2.0, the same BlazePose family as ML Kit's accurate
model) extracted the app's 13 joints per frame at 15 fps, dropping frames with no person, like the app's
pose source. `real_clips_calibration_test.dart` replays them through `SwingAnalyzer`.

**Labels.** 79 swings across 7 clips (69 forehands, 6 serves, 4 backhands), plus 5 "unsure" ones that are
scored neither way. Each contact time was read off 10 fps zoomed crops around wrist-speed candidates
found at a deliberately low threshold, and every clip was scanned at 3 fps for swings the candidates
missed (17 were found that way, 13 of them side-on swings in R04). A detection within ±400 ms of a label is a hit. R02 (no player) and R09
(pose found in only 22% of frames) are not scored.

**Result.** Speed threshold sweep at a 1.2 s merge window, all 7 clips:

| peakSpeed (torso lengths/s) | Recall | Precision | F1 |
|---|---|---|---|
| 3.0 | 85% | 80% | 0.82 |
| 4.0 | 82% | 83% | 0.83 |
| 5.0 | 72% | 86% | 0.79 |
| **6.0 (old default)** | **62%** | 86% | 0.72 |
| 8.0 | 52% | 91% | 0.66 |

Widening the merge window to 1.4 s removes follow-through and recovery double-counts. **New defaults:
peakSpeed 4.0, merge 1.4 s** (window −800/+500 ms unchanged):

| | Old (6.0 / 1.2 s) | New (4.0 / 1.4 s) |
|---|---|---|
| All 7 clips: recall / precision | 62% / 86% | **80% / 88%** |
| Front, side and three-quarter clips (R04, R05, R06): recall / precision | 63% / 92% | **91% / 92%** |
| R04 side-on forehands detected | 6 / 24 | **20 / 24** |
| Detected swings measured (passed the quality gate), R04–R06 | 34 / 34 | 48 / 49 |

**Why 6.0 failed.** Side-on, the hitting wrist covers fewer torso lengths per second in the image than
seen from the front, and side-on is exactly the setup Swing Check asks for.

**Quality gate.** Unchanged (likelihood 0.5, 80% visible, 6 frames, 120 ms gap). Its refusals land where they
should: R01 (rear view, hitting arm hidden 3/3), R08 (montage, 2) and R03 (night, far, "too fast" 2).
Lowering the visible share to 0.5 measured 3 more of the refused swings in the sweep, and they are exactly
the ones that should be refused.

**What it can't measure.**
- **Rear views don't work.** In R07 the hitting wrist is behind the body in nearly every frame, so 0 of 6
  swings were detected. The setup screen already asks for side-on.
- **Backhands** are out of scope and are missed (4/4 in R07).
- **R03:** MediaPipe found a "person" in a foreground object for 2 s, causing 1 false swing. ML Kit may
  behave differently.
- **Landmark source.** These are MediaPipe landmarks, not ML Kit or Apple Vision. The likelihood threshold
  (0.5) and fps need confirming on a real phone.
- **Labels** are one person's reading of 10 fps crops: timing error up to about ±150 ms, and a swing hidden
  by a cut may be missing.
- **Sample size.** 79 swings, 62% of them from one player (R04).

Spec acceptance "≥ 8 of 10 clean side-on swings detected and measured": met on footage (R04 side-on 20/24 =
83%, front + side-on 91%). Still to confirm on a phone.

## B1 real-phone pass, recorded clips (2026-11-11)

**Phone:** Infinix HOT 30 Play (X6835B), Android 13 (SDK 33), MediaTek Helio G37 (MT6765H), 8 GB RAM. A
budget phone, so decode times here are a floor, not typical. **Build:** profile mode, arm64,
`DRIFT_SWING_CHECK=true`, local backend over `adb reverse`. The AI Coach menu showed Swing check (Android 13+
gate works). Clips were copied over USB to the phone's Movies folder and picked with the system photo picker.
Timings come from a one-line `DriftPose` log in `PoseBridge.analyseClip` (counts and ms only).

| Clip | Frames sampled | Person found | Decode ms/frame | Pose ms/frame | Wall time | Swings detected / measured | Lab (MediaPipe) |
|---|---|---|---|---|---|---|---|
| R04, first 30 s | 450 | 450 (100%) | 969 | 78 | 7 min 52 s | **11 / 11** | 11 / 11 |
| R07 (rear view) | 209 | 205 (98%) | 848 | 77 | 3 min 14 s | **6 / 6 (should be refused)** | 0 detected, refused |

**R04 matches the lab exactly** (plan A "done when": ±1). The 0.5 likelihood and the 4.0 / 1.4 s detector held
on ML Kit landmarks for this clip.

**R07 fails.** ML Kit gives the hidden hitting wrist a confident position (it guesses occluded joints), so the
wrist-speed peaks exist and the quality gate's "arm hidden" check never fires. 6 swings were measured (the clip has
2 forehands and 4 backhands, all called forehands), with numbers like follow-through −7%. The plan's assumption
that rear views refuse themselves because the wrist is hidden is true for MediaPipe, false for ML Kit. A camera-view
check that doesn't depend on joint likelihood is needed before release.

**Decoding is the bottleneck, not the pose model.** `getScaledFrameAtTime(OPTION_CLOSEST)` decodes forward from
the previous keyframe for every sampled frame: 0.85–0.97 s/frame, so a 60 s clip would take about 15 minutes.
ML Kit's accurate model is 77–78 ms/frame even on a Helio G37. The plan's mitigation (sequential `MediaCodec`
decode) is needed.

Other notes from the pass: frames came back upright (raw 576x1024, rotation 0, upright 360x640). The photo picker
opened in multi-select mode (an extra "Done" tap). A first R04 run was cancelled by a touch on the phone after 6 min,
which shows how long the wait feels. Live swings not yet tested.

### MediaCodec decoding (2026-11-11, same phone)

`PoseBridge.analyseWithCodec`: sequential `MediaExtractor` + `MediaCodec` decode, frames sampled by presentation
time and handed to ML Kit as `YUV_420_888` images with the track rotation (no bitmap, no downscale). The retriever
path stays as a fallback when a decoder can't give images.

| Clip | Decoder | Decode ms/frame | Pose ms/frame | Wall time | Swings detected / measured |
|---|---|---|---|---|---|
| R04, first 30 s | retriever (before) | 969 | 78 | 7 min 52 s | 11 / 11 |
| R04, first 30 s | **mediacodec** | **9.3** | 80.5 | **40 s** | 11 / 11 |
| R07 | retriever (before) | 848 | 77 | 3 min 14 s | 6 / 6 |
| R07 | **mediacodec** | **9.3** | 82.6 | **19 s** | 6 / 6 |

About 12x faster; a full 60 s clip should take ~80 s on this budget phone, nearly all of it the pose model.
Averages moved by a few points (R04 contact height 78% → 75%) because ML Kit now sees full-resolution frames at
their exact timestamps instead of 640 px frames at nominal times.

### Rear-view check: what the landmarks can and can't tell (2026-11-11)

ML Kit landmarks for R04 (30 s) and R07 were dumped on the phone with a test-only switch
(`--dart-define=DRIFT_POSE_DUMP=true`, `lib/features/swing_check/data/pose_dump.dart`) and committed beside the
MediaPipe fixtures in `test/features/swing_check/fixtures/real_mlkit/`. ML Kit gives every joint likelihood 1.0, so
likelihood can't flag a hidden wrist on Android.

**Facing** = (left minus right x of shoulders and hips) / torso length; negative means the player's back is to the
camera. Both models get left and right right from behind (R07: 97% of frames facing away on MediaPipe, 98% on ML Kit).

| Signal | R07 (behind, fails) | R05 (rear 3/4, works) | R04 non-hitting-side cuts (work) | Separates? |
|---|---|---|---|---|
| Facing at each swing | −0.34 to −0.43 | −0.06 to −0.09 | −0.26 to −0.51 | no (R04 overlaps R07) |
| Facing away and hitting wrist inside the torso's x-span around contact | 17–83% of frames | 0% | 50–100% | no (R04 scores higher) |
| Share of the clip's frames facing away | 97–98% | 84% | 15–24% (whole clip) | only by a thin margin, 2 rear clips |

Why: R04's "side-on" cuts are filmed from the player's non-hitting side, so the back turns to the camera during the
take-back and the wrist really passes behind the body, yet MediaPipe measured those swings correctly because it
reports visibility. 2D landmark geometry alone doesn't tell "directly behind" from these working views; what R07 lacks
is the wrist visibility MediaPipe reports and ML Kit doesn't.

### MediaPipe on the phone (spike, 2026-11-11, owner chose "test MediaPipe on phone")

Same phone, test build with `--dart-define=DRIFT_POSE_MODEL=mediapipe`: MediaPipe Pose Landmarker *full*
(`com.google.mediapipe:tasks-vision:1.0.0`, model `pose_landmarker_full.task` from `cv-service/models/`, bundled in
`android/app/src/main/assets/`), VIDEO mode, 0.5 thresholds, visibility used as likelihood, exactly like
`tools/pose_fixtures.py`. Recorded clips only; live capture is still ML Kit. Frames: MediaCodec YUV converted to
ARGB in Kotlin at full resolution.

| Clip | Model | Pose ms/frame | Wall time | Result |
|---|---|---|---|---|
| R04, first 30 s | ML Kit | 80 | 40 s | 11 / 11 measured |
| R04, first 30 s | **MediaPipe** | **606** | 4 min 37 s | **11 / 11 measured** |
| R07 (rear view) | ML Kit | 83 | 19 s | 6 / 6 measured (wrong) |
| R07 (rear view) | **MediaPipe** | **583** | 2 min 4 s | **refused: "filmed from behind"** (correct) |

**MediaPipe passes both halves of plan A's "done when" on a real phone; ML Kit doesn't.** The cost is speed: ~7x
slower than ML Kit on this Helio G37 (a 60 s clip ≈ 9 min) and the APK grows ~23 MB (arm64 profile 104.9 → 127.8 MB).
The 606 ms includes the Kotlin YUV→ARGB conversion. A speed variant (convert at half resolution, GPU delegate
with CPU fallback, separate convert/infer timings in a `DriftPose mediapipe:` log line) is written and builds but
was **not yet run** on the phone. MediaPipe landmarks from the phone are in
`test/features/swing_check/fixtures/real_mediapipe_phone/`.
