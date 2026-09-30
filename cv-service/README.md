# cv-service

Computer-vision pipeline for Drift's AI match-video analysis: ball tracking, court
detection, player tracking, and shot events from a single camera.

**Stage: Phase 0 spike.** CLI only. See
[`../AI_VIDEO_ANALYSIS_IMPLEMENTATION_PLAN.md`](../AI_VIDEO_ANALYSIS_IMPLEMENTATION_PLAN.md)
for the phase plan.

## Provenance

Vendored (plain copy, not a submodule) from
[`lyomu/Tennis-Vision`](https://github.com/lyomu/Tennis-Vision), a fork of
[`HarshTomar1234/Tennis-Vision`](https://github.com/HarshTomar1234/Tennis-Vision).

| | |
|---|---|
| Upstream version | `v2.1.1` |
| Commit | `5dc8f1608371a44a6c1566097963246f085044d7` |
| Vendored on | 2026-09-29 |
| Code licence | MIT — see [`LICENSE`](LICENSE) |

Upstream's own README, with its measured accuracy numbers and limitations, is kept
verbatim as [`UPSTREAM_README.md`](UPSTREAM_README.md). `CHANGELOG.md` and
`CONTRIBUTING.md` are upstream's history. Drift's changes are logged in
[`DRIFT_CHANGES.md`](DRIFT_CHANGES.md). The nested `.github/` is upstream's and does
not run here (GitHub only runs workflows from the repo root).

This folder is the one part of the monorepo under different licence terms from the
rest (root is proprietary). Keep `LICENSE` in place.

## Licensing of the model weights — must be resolved before production

The code is MIT. The weights and one dependency are not, and are fine for internal
evaluation but **not cleared for a commercial product**:

| Component | Source | Terms | Status |
|---|---|---|---|
| Ball detection (`tracknet.pt`) | [yastrebksv/TrackNet](https://github.com/yastrebksv/TrackNet) | **No licence at all** — so all rights reserved by default, not "research use" | Blocker for production |
| Player detection (`ultralytics` / YOLOv8x) | Ultralytics | AGPL-3.0 — covers trained models too, and a network service using it must be open-sourced or licensed | Blocker for production |
| Court keypoints (`keypoints_model_geoaug.pth`) | Hugging Face `Coddieharsh/tennis-court-keypoints` | Research use only; fine-tuned from an unlicensed model trained on YouTube-derived images | Blocker for production |
| Pose (`pose_landmarker_lite.task`) | Google MediaPipe | Apache-2.0 | OK |

`ultralytics` is the only AGPL dependency in the stack — everything else that is not a
model weight is MIT, Apache-2.0 or BSD.

**See [`LICENSING.md`](LICENSING.md)** for the full assessment: what AGPL-3.0 actually
requires for our service topology, the permissively licensed replacements (RF-DETR plus
`supervision.ByteTrack`, both already viable), and why retraining the court and ball
models on our own labelled footage resolves both the weight licensing and the
domain-transfer risk found in [`PHASE0_FINDINGS.md`](PHASE0_FINDINGS.md) with one piece
of work.

None of this blocks internal evaluation. All of it blocks a public launch.

## Setup

Requires Python 3.10+ and, for reasonable speed, an NVIDIA GPU with CUDA.

```bash
cd cv-service
python -m venv venv
venv\Scripts\activate            # Windows; source venv/bin/activate on macOS/Linux

# Install the CUDA build of torch first, matching your CUDA version
# (see https://pytorch.org/get-started/locally/), e.g. for CUDA 12.x:
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

pip install -e .
tennis-vision download-models
```

`download-models` fetches the court and pose weights automatically. TrackNet is not
redistributed, so fetch it by hand as the script instructs:

```bash
gdown 1XEYZ4myUN7QT-NeBYJI0xteLsvs-ZAOl -O models/tracknet.pt
```

YOLOv8x weights download automatically on first run.

## Run

```bash
tennis-vision analyze input_videos/input_video_2.mp4 -o output/demo.avi
```

Add `--max-frames 60` for a quick check. Outputs land in `output/` (gitignored): an
annotated video, a per-frame stats CSV, a run summary JSON, and a 3-D viewer HTML file.

### Checking a clip before analysing it

```bash
tennis-vision precheck input_videos/input_video_2.mp4
```

Refuses unusable footage in milliseconds rather than after a full analysis: orientation,
resolution, frame rate, duration and readability from the header, then the court and
camera-steadiness over a dozen sampled frames. Exits non-zero on a refusal, so it can
gate a pipeline. `--quick` skips loading the court model, `--json` emits a machine-readable
result. See [`utils/precheck.py`](utils/precheck.py) — some of its thresholds are
provisional and say so.

### Analysing a whole session

```bash
# What's in here, and where? Seconds, no GPU work.
tennis-vision session input_videos/practice.mp4 --dry-run

# Find the rallies and analyse each one
tennis-vision session input_videos/practice.mp4 -o output/session.json
```

`analyze` assumes one continuous passage of play; `session` removes that constraint. A cheap
pre-pass seek-samples the clip for court validity and subject motion, turns that into rally
spans, and runs the pipeline once per rally as a subprocess. Session totals come back with a
per-rally breakdown.

Two things about it are worth knowing before reading its numbers:

- **It runs under a frame budget** (`session.frame_budget`, default 5400 frames ≈ 3 minutes
  of play ≈ 55 minutes of GPU). A session can contain more rallies than that covers. Every
  rally found is reported either way, and the ones that did not fit carry
  `status: "skipped_budget"` — so `segments_found` and `segments_analysed` always travel
  together. A total over 8 of 20 rallies must not read as a total over the session.
- **Its thresholds are provisional, not calibrated.** There is no multi-rally footage in this
  repo to calibrate against. `tools/make_session_clip.py` builds a synthetic session from real
  rally clips with known boundaries and `eval/rally_segmentation_accuracy.py` scores against
  it, which measures the mechanism and explicitly not whether the thresholds suit real
  footage. See [`utils/rally_segmenter.py`](utils/rally_segmenter.py).

Session averages are weighted by the shots that produced them rather than averaged across
rallies, and an uncalibrated rally contributes shot counts but no speeds — see
[`utils/session_aggregate.py`](utils/session_aggregate.py) for why both of those are
load-bearing.

## HTTP service

```bash
pip install -e ".[service]"
uvicorn api:app --host 0.0.0.0 --port 8000
```

| Route | Does |
|---|---|
| `GET /health` | Liveness, and whether the court model loaded |
| `POST /precheck` | Multipart video upload → the precheck verdict as JSON |
| `POST /analyze` | Full pipeline on one rally, synchronously. Minutes. `503` when busy |
| `POST /analyze-session` | Segment a long clip and analyse its rallies. Hours. `dry_run=true` segments only |

Both analysis routes are synchronous and share a single slot, because there is one GPU. A
second concurrent request gets `503` with `Retry-After` rather than being queued — the
caller (the backend's worker) already owns retries and persistence, and duplicating them here
would put the same concerns in two places.

The court model loads once at startup and is reused, which is what makes `/precheck`
answer in 74 ms–1.6 s instead of reloading ResNet-50 per request.

A refused clip is **HTTP 200 with `"verdict": "reject"`**, not an error status. A non-2xx
means the check itself failed. Every rejection carries a `message` written to be shown to
whoever uploaded the video.

If the weights are missing the service still starts and serves the header checks,
reporting `court_checked: false` — those catch most bad uploads, and refusing to boot
would lose them too.

**Internal only as it stands**: no authentication, no rate limiting, no metrics. Do not
expose it publicly.

## Tests

**556 unit and integration tests** (`pytest tests/`). Run them with:

```bash
pytest tests/ -m "not slow"
```

The `slow` marker covers the tests that run the real pipeline end to end and need the
downloadable weights. `tests/test_packaging.py` checks this count against what pytest
actually collects, so it cannot go stale silently — if you add tests, update the number
above.

## Verified

**2026-09-29**, on Python 3.14.0 / Windows, NVIDIA GeForce RTX 4060 Laptop GPU (driver
566.24, CUDA 12.7), `torch==2.14.0+cu126`. Upstream developed and measured on Python
3.12; 3.14 worked here without needing a downgrade — `pip check` is clean and every
dependency (including `mediapipe`) resolved a `cp314` wheel.

```
tennis-vision analyze input_videos/input_video_2.mp4 --max-frames 30 --fast --debug -o output/videos/sanity_check.avi
```

Ran clean end to end (exit 0, ~56s including the one-time `yolov8x.pt` download) on the
bundled 30-frame slice of `input_video_2.mp4`. All 9 pipeline stages completed: player
detection, TrackNet ball tracking, court homography (14/14 inliers), rally-grammar shot
classification (1 serve detected, 28.6 km/h), Kalman-smoothed mini-court mapping, and
3-D reconstruction. Produced `output/videos/sanity_check.avi` (annotated video),
`output/stats/{stats,summary,trajectory3d}_<timestamp>.{csv,json}`, and a 3-D viewer
HTML. This confirms the environment itself works — not yet evidence the pipeline works
on Drift's real (non-broadcast) camera footage, which is the next step.

## Not built yet

- No auth, rate limiting or metrics on the HTTP service
- No Dockerfile, no Jenkinsfile stage, no deploy target (won't run on the shared box)
- **No Drift footage tested yet** — only the bundled broadcast samples. The Phase 0 re-shoot
  has not happened, so the court gate is still unscored on real footage
  ([`PHASE0_FINDINGS.md`](PHASE0_FINDINGS.md)), no stroke-type label has cleared a bar on
  Drift footage, and the session segmenter's thresholds are uncalibrated
- No stroke-type classification wired into the pipeline. The racket detector and its features
  exist and are measured for coverage only ([`trackers/racket_detector.py`](trackers/racket_detector.py))
- The permissive detector backend is built but not the default, so `ultralytics` (AGPL-3.0)
  is still on the critical path for a launch — see [`LICENSING.md`](LICENSING.md)
