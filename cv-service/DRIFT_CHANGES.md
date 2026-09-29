# Drift changes

Changes Drift has made on top of the vendored upstream (`v2.1.1`, commit `5dc8f16`).
Newest first.

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
