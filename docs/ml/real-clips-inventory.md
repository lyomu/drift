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
