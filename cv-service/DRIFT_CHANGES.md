# Drift changes

Changes Drift has made on top of the vendored upstream (`v2.1.1`, commit `5dc8f16`).
Newest first.

## 2026-09-30 — Test pass on Phases 2+3: bugs found and fixed, `rfdetr` verified

Everything written for Phase 2 (permissive detector, racket detection) and Phase 3 (multi-rally
sessions) was executed for the first time. Three real bugs surfaced and are fixed; one
calibration finding surfaced and is deliberately **not** acted on, for a reason worth recording.

### Bugs found by running the code, not by reading it

1. **`subject_motion` compared window-tapered arrays against un-tapered ones.**
   `cv2.phaseCorrelate` mutates its input arrays in place, applying the Hanning window
   destructively. The function then differenced one of those windowed arrays against a copy
   shifted to compensate for camera motion — comparing a tapered image to an untapered one,
   which leaves a residual proportional to image contrast. Measured on a pure horizontal pan
   of a textured frame, where the true answer is zero: **3.15 with the bug, 0.00 fixed** — above
   `PLAY_ENTER_DIFF` (3.0), so a panning camera would have read as continuous play. Caught by
   `test_a_panning_camera_does_not_register_as_play`, which is exactly the invariance test that
   exists to catch it. Fixed by passing `.copy()` into `phaseCorrelate`.
2. **`rfdetr`'s COCO label map moved, and the fallback location was wrong.** `rfdetr.util` was
   removed in v1.9.0; on 1.11.0, `rfdetr.assets.coco_classes` holds it, not
   `rfdetr.utilities.coco_classes` as originally guessed. `coco_labels._label_map()` now tries
   both locations. **Verified on the real package: `person` resolves to 1, `tennis racket` to
   43** — the 91-category-id scheme, confirming the reasoning that made name resolution
   necessary in the first place: a hardcoded 80-contiguous index (38, which is `kite`) would
   have been silently wrong.
3. **The default RF-DETR size, `base`, is deprecated.** `RFDETRBase` carries a deprecation
   warning since v1.7.0 for removal in v2.0.0; Nano/Small/Medium/Large do not. Default moved to
   `medium` everywhere it was set (`detector_rfdetr.py`, `racket_detector.py`,
   `configs/config.yaml`, `main.py`'s built-in defaults, both eval scripts' `--rfdetr-size`
   flags). `base` stays selectable for reproducing anything measured on it.

### A fourth bug, found by execution, that reaches beyond this branch

`main.py`'s existing `logger.info(f"Summary JSON → {json_path}")` uses `StreamHandler(sys.stdout)`
with an arrow character, on a `logging.basicConfig` set up with no encoding override. On this
machine's default console codepage (cp1252, not UTF-8), that raises `UnicodeEncodeError` and
crashes the run. This is pre-existing, not introduced here, and out of scope to fix in this
branch — flagged rather than fixed. My own three new occurrences (`tools/make_session_clip.py`,
`session.py` x2, and `rally_segmenter.describe()`) are fixed by using `->` instead of `→`.

### Dependency pins now correct rather than aspirational

- `rfdetr>=1.11.0` installed clean: it does **not** pull `opencv-python-headless` the way
  `roboflow` does, and it does **not** touch `torch` — CUDA (`2.14.0+cu126`) and GUI OpenCV
  both survived. It does upgrade `huggingface_hub` to 1.33.0, verified compatible with
  `scripts/download_models.py`.
- `supervision` capped `<0.31.0` in both `requirements.txt` and `pyproject.toml`. `sv.ByteTrack`
  carries a deprecation warning under the installed 0.30.6 for removal in 0.31.0; the
  replacement is `ByteTrackTracker` from a PyPI package literally named `trackers`, which
  **collides with this repo's own top-level `trackers/` package** — migrating means renaming
  one of them, a deliberate decision, not something to discover mid dependency-bump.
- README test count corrected: **556**, not the hand-counted 554 (two test methods were missed
  counting by hand across two large new files).

### Test results

| Suite | Result |
|---|---|
| cv-service (`pytest tests/ -m "not slow"`) | **555 passed, 1 deselected** |
| backend (`jest`) | **731 passed**, 57 suites |
| mobile (`flutter test`) | **610 passed** |

One mobile fix needed: the 13 new session tests landed inside the wrong `group()` — a patch
script matched the file's *last* closing brace rather than the intended parent, so they ran
(and passed) under `VideoAnalysisJob.courtCalibrated` instead of `VideoResultsScreen` and their
own top-level group. Moved to the right parents; still 610 passing, now attributable correctly
on a future failure.

### The segmentation mechanism, run for the first time — and what it found

Built a synthetic session with `tools/make_session_clip.py` (4 real rallies from the two bundled
clips, 8s gaps, both `frozen` and `noise` gap kinds) and scored it with
`eval/rally_segmentation_accuracy.py`.

**The mechanism is sound:** 100% precision, zero spurious spans, zero splits, zero merges, and
motion-only segmentation agreed exactly with court-checked segmentation (14.2s vs 2.3s wall
clock for the same result) — the court gate is not the bottleneck on these clips. Frozen and
noise gap kinds scored identically, meaning `PLAY_EXIT_DIFF` is **not** sitting on the noise
floor, which was the specific risk the two gap kinds were built to distinguish.

**Recall was 50%, and the reason is specific.** Both instances of the short bundled clip
(`input_video.mp4`, 7.1s) were missed entirely — its motion never exceeds 1.73 against
`PLAY_ENTER_DIFF = 3.0`. The long clip (`input_video_2.mp4`) was found but with a systematic
late start (mean +140 frames, ~4.7s) — its own motion stays under 2.0 for the first ~9 seconds
before the rally visibly picks up.

**Deliberately not retuned.** `PLAY_ENTER_DIFF` could be lowered to catch this specific pair of
broadcast clips, and that would be exactly the mistake this project's own methodology rejects
repeatedly (`UPSTREAM_README.md` §"What we tried that did not work", `PHASE0_FINDINGS.md`):
tuning a threshold to n=2 broadcast samples produces a threshold calibrated for broadcast
footage, on a project whose entire premise is that broadcast-tuned models do not transfer to
Drift's camera domain. The finding is recorded here and the threshold stays provisional, to be
re-derived against real session footage as `PLAY_ENTER_DIFF`'s own docstring already says.

## 2026-09-30 — Multi-rally sessions (Phase 3)

Removes the "one continuous take, one rally" constraint. A long clip is now segmented into its
rallies, each analysed, and the results rolled up — across cv-service, the backend and the app.

### The measurement that justified the approach

`UPSTREAM_README.md` §"Supported inputs" refused any clip spanning more than one passage of
play, and the held-out benchmark measured the cost: **fourteen fixed-length broadcast windows,
all fourteen refused**, because an arbitrary window contains the end of a point, a crowd
reaction, a replay and the next serve. Trimmed to the rally inside them, **five of five** had a
valid court and valid player selection. The tennis was always analysable; the cutting was the
missing step. This is that step.

### Why the pre-pass is not what the plan proposed

`AI_VIDEO_ANALYSIS_IMPLEMENTATION_PLAN.md` proposes finding boundaries from "ball and player
motion". Ball motion is the wrong primary signal on two measured grounds:

- **It is not available.** `PHASE0_FINDINGS.md` measured ball detection at 0-25% of frames on
  ten real Drift clips. A gate needing the ball would refuse whole sessions on footage where
  the pipeline's own numbers say the ball is mostly not found.
- **It costs the thing being avoided.** TrackNet is half the runtime. Running it over a session
  to decide what to run it over defeats the purpose.

So the signal is two cheap things, both already trusted here: **court validity** (the
pipeline's own 0.22 gate, which is what rejects cuts, replays and crowd shots) and **residual
subject motion**.

Residual motion is the inverse of an existing measurement, which is worth knowing:
`precheck._global_shift` downscales to 128 px *specifically so players become smudges* and the
background dominates — that makes it a camera-motion test. The segmenter needs the opposite,
so it compensates for the camera shift and measures what is left, at a working width where a
player survives. Camera motion and subject motion are complementary and the same primitive
separates them in both directions.

Player detection is deliberately **not** in the pre-pass: it costs a model pass per sample,
which scales with session length rather than with how much play there is.

### New in cv-service

- **`utils/rally_segmenter.py`** — streaming pre-pass. Holds **at most three frames** at once
  and seeks rather than decodes; `eval/heldout_segments.py:find_court_segment` already located
  a court-valid run but reads every frame into a list (~50 GB at session length) and returns
  only the longest one, so it could not be reused.
  - **Hysteresis**, not one threshold: `PLAY_ENTER_DIFF` to start, the lower `PLAY_EXIT_DIFF`
    to continue. A rally has genuinely still moments — the ball at the top of its arc, a player
    waiting to receive — and a single threshold cuts the rally in half at each of them.
  - Merge short gaps → drop sub-`MIN_RALLY_S` spans → pad, **in that order**. Merging before
    filtering means two halves of one rally are joined and kept rather than dropped separately;
    padding after merging means padding cannot cause a merge the gap rule refused.
  - Padding is not cosmetic: speed is distance over flight time and a flight is reconstructed
    *between* events, so a span starting exactly on the first contact has nothing to
    reconstruct from.
  - `MIN_RALLY_S` reuses the precheck's own floor rather than inventing a second one, so the
    segmenter and the upload gate cannot disagree about what is too short to measure.
- **`utils/session_aggregate.py`** — three rules, each preventing a number that is not a
  measurement:
  1. **Counts sum; averages are weighted by their own denominators.** A mean of per-rally means
     weights a one-shot rally exactly as heavily as a twelve-shot one. `session_totals_match_parts`
     asserts the plan's acceptance criterion on the shipped object, and checks counts only —
     weighted means are deliberately *not* the sum of their parts.
  2. **An uncalibrated rally contributes counts and nothing else.** Its speeds are plausible
     and meaningless; mixing one in corrupts the session invisibly, worse than the single-clip
     case because nobody can see which rally did it. Shot counts survive, because contact
     detection does not depend on the court fit.
  3. **A partial session says so in the same object as the totals.** `segments_found` and
     `segments_analysed` travel together — a number whose denominator is elsewhere gets quoted
     without it.
- **`session.py`** + `tennis-vision session` — orchestration. One **subprocess per rally**,
  following `eval/heldout_segments.py`: `main.py` reads `sys.argv`, a CUDA fault kills one rally
  rather than the session, and memory is released between rallies. Each rally gets **its own
  stats directory** via a config overlay, rather than recovering its summary by diffing a glob
  before and after — which races and cannot tell two runs in the same second apart.
- **The frame budget, and the runtime arithmetic behind it.** At the measured ~0.63 s/frame on
  an RTX 4060, a 10-minute session is ~3 hours end to end; even after segmentation, 20 rallies
  of 15 s is ~1.6 hours on a service that runs one analysis at a time because it has one GPU.
  So `session.frame_budget` (5400 frames ≈ 3 min of play ≈ 55 min of GPU) bounds it. **This is a
  policy choice, not a measurement.** One span larger than the whole budget is analysed
  *truncated* with `truncated: true` and both frame counts recorded, rather than skipped —
  reporting a partial rally and saying so beats reporting nothing.
- **`tools/make_session_clip.py`** — builds a synthetic session from real rally clips with
  **exact ground truth by construction**, which is the same trick `utils/fps_support.py` uses:
  resample real footage so the true answer is known. Idle gaps hold the *court view* rather than
  cutting to black, so the boundary has to be found by motion — the static-camera case. Two gap
  kinds, and the difference between them is the finding: if `--gap-kind noise` degrades the
  result, `PLAY_EXIT_DIFF` is sitting on the noise floor.
- **`eval/rally_segmentation_accuracy.py`** — recall, precision, and **signed** boundary error.
  The sign is the useful part: consistently late starts mean padding is too small and the first
  contact is being clipped. Splits and merges are counted separately from precision/recall,
  because they are a different defect with a different fix — rolling them in would send someone
  to tune the wrong constant.

### Backend

- `POST /analyze-session` on cv-service, sharing the single analysis slot with `/analyze`, plus
  `dry_run` which segments only — seconds instead of hours, which is what an upload flow wants
  before asking someone to wait.
- `CvServiceClient.analyzeSession`, with its own much longer timeout. The `503`-means-busy
  contract matters more here: a session holds the GPU far longer, so mistaking busy for broken
  would mark a perfectly analysable session FAILED.
- **No migration.** Session-ness is derived from `precheckResult.metadata.duration_s`, already
  stored — cv-service read the duration from the video header at upload time and we kept the
  whole verdict, so a column would duplicate data we have. `analysisResult` is schemaless JSON
  and carries `mode: "session"`, so both result shapes coexist. `SESSION_DURATION_S` must stay
  in step with `LONG_DURATION_S` in `precheck.py`, which is what warns the user at upload time;
  a test brackets the boundary so the two cannot drift.
- An unreadable or absent duration routes to the **single-clip** path. Running a 20-second rally
  through session mode wastes a pre-pass; running a 40-minute session as one rally produces a
  confident refusal or a meaningless number.
- The completion push reports **how much** of the session was measured. "Your session has been
  analysed" over 8 of 20 rallies reads as all of it.

### Mobile

- The results screen branches on the summary's own `mode`, so a session gets a different screen
  rather than the clip screen with extra rows — a session's first question is "how much of it
  did you measure", which a single clip never has to answer.
- Rallies found versus measured sits **above** the totals, not in a footnote.
- Every rally is listed including skipped ones, each with its reason. A skipped rally is real
  play we chose not to measure, and hiding it would make the session look shorter than it was.
- Speeds are keyed off the session's `court_calibrated` exactly as the single-clip screen keys
  off a clip's. All three layers read `!= false`, not `== true`, so a summary omitting the key
  behaves identically everywhere — a layer disagreeing is how a warning stops being shown.

### Stale claims removed

Phase 1 and 2 left documentation asserting things that had since become untrue. All were in
files touched here:

- `cv-service/README.md`: `/analyze` described as "**501 on purpose**"; "Not built yet" still
  listing the Nest integration and upload handling as missing.
- `utils/precheck.py`: the long-duration warning told users to upload a session as individual
  rallies, which is exactly what this phase removes the need for.
- `backend/src/video-analysis/video-analysis.service.ts`: "the ANALYSIS ... does not exist yet
  (cv-service answers 501)".
- `mobile/.../video_analysis_repository.dart`: "analysis is not built yet".

### What is still not established

**No multi-rally Drift footage exists on this machine**, and per `PHASE0_FINDINGS.md` the
re-shoot has not happened. So:

- Every threshold in `rally_segmenter.py` is **provisional**, reasoned from session structure
  and from constants calibrated for other purposes, and marked `provisional` in the output it
  produces.
- The synthetic sessions verify the *mechanism* — that spans are found, cut, analysed and
  aggregated correctly. They cannot verify that boundaries land on real rallies.
- Phase 3's acceptance criterion ("a 10+ minute session is correctly split") is therefore **not
  met and not refuted**. It needs footage.
- Tests: +50 cv-service (504 → 554), +9 backend, +10 mobile. None need weights, a GPU or video.

## 2026-09-30 — Permissive detector backend + racket detection prototype (Phase 2, groundwork)

Phase 2 groundwork, written before any Drift footage exists. **Nothing here is wired into
the pipeline's output and no stroke-type label is produced.** Two things were built: the
licensing prerequisite for training anything, and a prototype of the one forehand/backhand
avenue nobody has tried.

### Why a detector swap comes before any Phase 2 training

`ultralytics` is AGPL-3.0, and the obligation covers weights fine-tuned through it
"regardless of whether you train from scratch" (`LICENSING.md` §1). So a racket detector or
a stroke classifier trained through it could not ship in a proprietary service. Replacing it
is a precondition for Phase 2's training work, not a cleanup task afterwards.

- Player detection is now a **swappable backend**, selected by `models.player_backend`
  (`yolo` | `rfdetr`). Player *selection* is not swappable and stays in one place: upstream
  already measured that detection is saturated for this task — YOLOv8x finds 11-14 people
  per frame and the pipeline needs 2 — so the hard part is choosing which two, and that is
  detector-independent.
- New `trackers/detector_yolo.py`: the existing `.track()` path, **moved verbatim, not
  rewritten**. It is the reference behaviour every published number was measured against, so
  an improvement made in passing would have invalidated the comparison the new backend exists
  to be judged by. Its `ultralytics` import is now lazy, so the endgame — uninstalling the
  package — does not break `import trackers`.
- New `trackers/detector_rfdetr.py`: RF-DETR (Apache-2.0) for detection,
  `supervision.ByteTrack` (MIT) for track ids. `supervision` was already a dependency and
  already ships ByteTrack, so the tracking half cost only wiring. Returns the identical
  `{track_id: bbox}` contract, including dropping detections ByteTrack has not confirmed —
  player selection scores tracks by id across frames, so a detection without one is unusable
  either way.
- **The default stays `yolo`.** Every measured number in `README.md` was produced on it;
  flipping the default would silently re-baseline all of them. The switch belongs to whoever
  has run the comparison and looked at it.
- New `trackers/coco_labels.py`: resolves COCO classes **by name**, never by a hardcoded int.
  COCO ships two incompatible numbering schemes, and id 43 is `tennis racket` in one and
  `knife` in the other. Neither raises. A confusion there produces a racket detector that
  reports detections at a plausible rate, of the wrong object — so when the name cannot be
  resolved this raises and names both candidates rather than guessing.
- `stub_path_for_video` gained a `variant`, and `main.py` keys the player stub by backend.
  Without it, a cached YOLO run's boxes would load into an RF-DETR run and the two backends
  would compare as identical — that module's original bug with the detector substituted for
  the clip. No variant keeps the existing path byte-identical, so nothing already cached is
  invalidated.
- New `eval/player_detector_comparison.py`. It does **not** measure accuracy — there is no
  labelled person-detection ground truth here. It measures what the pipeline consumes: mean
  detections per frame, track count, tracks clearing the persistence bar, how many players
  were selected, whether they sat on opposite sides of the net, id churn, and runtime. The
  column that decides the swap is `halves`.

### Racket detection — the untried path at the actual root cause

Three forehand/backhand approaches have been built and rejected in this repo, and they share
a root cause: the answer is where the racket is, and pose loses that exactly when it matters.
MediaPipe drops the occluded racket arm on 44-58% of backhands; SAM 3D Body recovers it from a
body prior and made things *worse* (85.5% → 66.4% balanced on identical clips, wrist-side
accuracy down to 51.8%, chance). Detecting the racket does not guess.

- New `trackers/racket_detector.py`: RF-DETR's COCO `tennis racket` class. **No training
  needed for a first signal, and no weights encumbered** — the pretrained checkpoints already
  carry the class. Deliberately **untracked**: a tracker's constant-velocity prior would coast
  through the frames where the detector declines, inventing a racket position at precisely the
  moment the honest answer is "not visible", which is the SAM 3D failure restated.
- `racket_for_player` gates association on distance, scaled by the player's box height rather
  than in pixels, so one constant works on a 480 px WhatsApp transfer and a 1080 p broadcast
  frame. **The constant is provisional and from body proportions, not from labels** — nothing
  here has measured a racket-to-player distance against ground truth.
- New `utils/racket_features.py`: body-relative racket geometry at contact — signed side,
  offset, height, and a box aspect that is a *weak* face-orientation proxy and says so (an
  axis-aligned box is near-square at 45° whichever way the face points).
  - The honest limitation, stated in the module: a racket box has **no depth**, so the body
    axis must be built in the image plane — the exact ill-conditioned construction
    `pose_shot_classifier.py` escapes into (x, z) to avoid. The reason to expect it to work
    anyway is the **lever arm**: a racket head sits an arm plus a racket off the midline where
    a wrist sits a quarter of a shoulder width, so the same rotation gives a much larger
    image-space offset. That is an argument, not a measurement, and it has not been made.
  - Every row carries `shoulder_width_px`, confidence and distance, so ill-conditioned frames
    can be filtered rather than trusted.
- New `eval/racket_coverage_at_contacts.py`. **Coverage, not accuracy.** The measurement is
  `racket only`: contacts where `classify_forehand_backhand` declined *and* a racket was found
  and attributed to the hitting player. That is a sharper question than
  `pose_availability_at_contacts.py` asks, because pose being available is not the same as
  pose being decisive — a frame with landmarks but no readable side is invisible to the
  availability eval and is exactly what the racket is meant to cover. Near zero means the
  avenue is dead; large means Phase 2 has a path.

### What this deliberately does not do

- No training, no fine-tuning, no new weights.
- **No stroke-type label** reaches the pipeline, the API or the app.
- **No accuracy number from broadcast footage.** There are 13 labelled events in
  `datasets/labels/`, on one broadcast clip, and `PHASE0_FINDINGS.md` plus every negative
  result above say a broadcast or THETIS score has already proven not to transfer to Drift's
  camera domain. Phase 2 cannot exit on this work; its criteria need held-out Drift footage,
  and none exists on this machine yet.

### Incidental fixes

- **The Phase 0 crash is fixed.** `is_serve` guarded a missing ball box with
  `if not ball_box`, but a `[nan, nan, nan, nan]` box is truthy, so `get_center_of_bbox` cast
  NaN to int and raised `ValueError` — clip 4 of the Phase 0 batch (0/150 frames with a ball)
  crashed instead of being refused. Now refused per frame with "ball position is not a number
  at contact", and refused for infinities too. Fixed at the serve detector rather than by
  teaching `get_center_of_bbox` to tolerate NaN: that helper is called from everywhere, and a
  tolerant version would let NaN propagate into speeds and placements as a plausible-looking
  number.
- `api.py`'s module docstring still described `/analyze` as a deliberate 501 stub, which it
  has not been since the analysis was wired up. The same stale claim is removed from
  `backend/prisma/schema.prisma`'s `VideoAnalysisStatus`, where `ACCEPTED` was documented as
  terminal.
- Tests: +50 (454 → 504). `tests/test_detector_backends.py` (23),
  `tests/test_racket_features.py` (20), plus 4 NaN-refusal tests and 3 backend-keying tests.
  None need weights, a GPU, `rfdetr` or `ultralytics`.

## 2026-09-29 — HTTP service (Phase 1, slice 1a)

- New `api.py`: FastAPI interface for the Drift backend to call. `GET /health`,
  `POST /precheck` (multipart upload → precheck verdict as JSON), `POST /analyze`.
- The court model loads **once** in the lifespan handler and is reused per request.
  That is the entire reason this exists as a service: a CLI invocation pays ~7.8 s of
  interpreter and library import plus a ResNet-50 load every single time, which is why
  the precheck's 74 ms–1.6 s only becomes usable in a process that stays up. Verified
  against the running service: 1.39 s for a clip that goes all the way to the court
  check, 0.20 s for one rejected on its header.
- `utils.precheck()` gained an optional `detector` argument so a preloaded model can be
  injected. Passing `court_model_path` still works and still builds one per call, which
  is right for the CLI and wrong for a service.
- `/analyze` returns **501 deliberately**. A full run is minutes of GPU work and belongs
  on a queue with a callback; the route is declared so the backend can build against the
  real URL and get an honest error rather than a 404 that could equally mean a
  misdeployment.
- **A refused clip is HTTP 200 with `verdict: "reject"`**, not a 4xx. A non-2xx means the
  check itself failed. Getting this backwards would have the backend report a service
  outage to the user as a filming problem.
- Missing weights degrade the service to header checks rather than stopping startup.
  Those checks rejected every clip in the first real batch, so losing them because an
  unrelated file is absent would turn a degraded service into no service. Covered by a
  test that runs the real lifespan against a config pointing at absent weights.
- Uploads stream to a temp file in 1 MB chunks with the size ceiling enforced mid-stream,
  and are removed in a `finally`. A test asserts temp files do not accumulate.
- New `service` extra in `pyproject.toml` (fastapi, uvicorn, python-multipart) — an extra
  rather than a core dependency because nothing in the pipeline imports it.
- New `tests/test_api.py`: 13 tests, no weights and no GPU needed (the detector is faked).

## 2026-09-29 — Pre-upload precheck

First Drift code change on top of upstream.

- New `utils/precheck.py`: cheap triage that decides whether a clip is worth analysing,
  before paying for the full pipeline. Two tiers — header checks (orientation,
  resolution, frame rate, duration, readability) with no torch import and no model load,
  then court and camera-motion checks over ~12 seek-sampled frames. A clip refused on its
  header short-circuits and never loads the 95 MB court model.
- Reuses rather than duplicates the existing gates: the court test *is*
  `court_validity.assess_court_fit_detail` (same 0.22 calibration, same cut-vs-no-court
  distinction) and the frame-rate test *is* `fps_support.assess_fps`. The precheck and
  the pipeline therefore cannot disagree about whether a clip is usable.
- One deliberate divergence: an unsupported frame rate is a REJECT here, where the
  pipeline runs it anyway with a caveat. Documented in `_check_fps` — before an upload,
  saying so early is cheaper than after; callers get the raw status to overrule it.
- New `tennis-vision precheck <clip>` CLI command, with `--quick` (skip the court model),
  `--json` (for the upload endpoint to consume later) and `--samples N`. Exit status 1
  on a refusal, 0 otherwise.
- The result reports `frames_sampled` and `court_checked` separately. Conflating them is
  a trap: frames are sampled and the camera test runs with or without the court model, so
  a single "deep checks ran" flag reported true on a `--quick` run whose court had never
  been looked at, and a caller reading it would conclude the court had passed.
  `court_checked` defaults to False — the honest direction.
- Measured cost, RTX 4060, warm: 74 ms to reject on the header, 1576 ms for the full check
  including the court, against ~25 s for a full analysis. As a one-shot CLI command both
  paths cost ~8 s, nearly all of it interpreter startup and importing cv2/scipy, so the
  short-circuit buys nothing at a shell prompt and everything in a long-lived service.
- New `tests/test_precheck.py`: 29 unit tests on synthesised clips, no weights needed.
- `README.md` gained a Tests section carrying the suite count, which
  `test_packaging.py::test_readme_test_count_is_current` asserts against pytest's actual
  collection. That test had been failing since the vendoring rename moved upstream's
  count claim into `UPSTREAM_README.md`; the suite is now green (440 passed, 1 slow
  test deselected).
- **Thresholds added here are provisional**, unlike the ones it reuses. They rest on the
  bundled 1280x720 sample working and ten 480x864 WhatsApp-compressed clips failing, with
  nothing measured between. Marked `provisional` in the findings they produce, and due for
  re-derivation once properly captured footage exists. See the module docstring.

## 2026-09-29 — Vendored

- Copied `lyomu/Tennis-Vision` @ `5dc8f16` (== upstream `v2.1.1`) into `cv-service/`.
- Renamed upstream `README.md` to `UPSTREAM_README.md`; added a Drift `README.md`.
- No code changes.
