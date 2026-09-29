"""
api.py
──────
HTTP interface to the pipeline, for the Drift backend to call.

    uvicorn api:app --host 0.0.0.0 --port 8000

Why this exists
---------------
Everything here already worked from the command line. What the command line cannot do
is be called by a Nest backend, and what a one-shot process cannot do is amortise its
startup: importing cv2 and scipy costs ~7.8 s and loading the court model costs most of
a second, both of which a CLI invocation pays every single time. Measured warm, a
precheck is 74 ms when it rejects on the header and ~1.6 s when it goes all the way to
the court. Those are the numbers that make a synchronous call from an upload path
reasonable, and they are only available to a process that stays up.

So the model is loaded once in the lifespan handler and reused for every request. That
is the whole design.

Scope
-----
`/precheck` is real. `/analyze` is deliberately a stub that refuses with 501: the full
pipeline is a minutes-long job that belongs on a queue with a callback, not on an HTTP
request, and the job plumbing it will report to does not exist yet. It is declared here
so the backend can wire against the real URL shape now and get a truthful error rather
than a 404 that might mean anything.

Not built yet: authentication, rate limiting, request size limits beyond the one below,
metrics. This is an internal service that must not be exposed publicly as it stands.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
import subprocess
import sys
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

logger = logging.getLogger("cv-service.api")

# Refused before anything is written to disk. Generous because a minute of 1080p phone
# video is comfortably over 100 MB, and the point of the precheck is to judge real
# uploads rather than only small ones.
MAX_UPLOAD_BYTES = 1024 * 1024 * 1024  # 1 GiB

# Read once at import so a misconfigured deployment fails at startup rather than on the
# first request. Overridable so a container can point at a mounted weights volume.
CONFIG_PATH = os.environ.get("TENNIS_VISION_CONFIG", "configs/config.yaml")

# Ceiling on one analysis. Generous rather than tuned: a 30 s clip is roughly half a
# minute of work on an RTX 4060, and a three-minute one is several. The point is to
# bound a hung run, not to predict a healthy one.
ANALYSIS_TIMEOUT_S = int(os.environ.get("TENNIS_VISION_ANALYSIS_TIMEOUT_S", 1800))

# One GPU, one analysis. Held for the whole run so a second caller is refused rather
# than admitted into a queue this process would then have to manage.
_analysis_slot = asyncio.Semaphore(1)

_state: dict = {"detector": None, "court_model_path": None}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """
    Load the court model once, at startup.

    Deliberately does NOT abort startup when the weights are missing. A service that
    refuses to boot without them cannot serve the header checks either, and those are
    the ones that reject most bad uploads - the orientation and resolution failures that
    made up every rejection in the first real batch. Missing weights degrade the service
    to tier 1 and say so on every response, rather than taking it down.
    """
    import main as pipeline

    court_model_path = pipeline.load_config(CONFIG_PATH)["models"]["court"]

    if Path(court_model_path).exists():
        from court_line_detector import CourtLineDetector

        logger.info("loading court model from %s", court_model_path)
        _state["detector"] = CourtLineDetector(court_model_path)
        _state["court_model_path"] = court_model_path
        logger.info("court model ready")
    else:
        logger.warning(
            "court model not found at %s - /precheck will run header checks only and "
            "report court_checked=false. Run 'tennis-vision download-models'.",
            court_model_path,
        )

    yield

    _state["detector"] = None


app = FastAPI(
    title="Drift CV service",
    version="0.1.0",
    summary="Video triage and analysis for Drift match-video features.",
    lifespan=lifespan,
)


@app.get("/health")
def health() -> dict:
    """
    Liveness plus what this instance can actually do.

    `court_model_loaded` is here because it changes the meaning of a /precheck response:
    without it a clip can pass every check that ran and still have an undetectable court.
    A caller that treats a pass as a pass regardless would be wrong, so the capability is
    reported rather than assumed.
    """
    return {
        "status": "ok",
        "court_model_loaded": _state["detector"] is not None,
        "court_model_path": _state["court_model_path"],
    }


@app.post("/precheck")
async def precheck_endpoint(file: UploadFile = File(...)) -> JSONResponse:
    """
    Judge whether an uploaded clip is worth analysing.

    Returns the PrecheckResult verbatim (see `utils/precheck.py`), always with HTTP 200
    when the check itself completed: a refused clip is a successful check with a
    `reject` verdict, not a failed request. The caller branches on `verdict`, and every
    rejection carries a message written to be shown to the person who uploaded it.
    """
    from utils.precheck import precheck as run_precheck

    suffix = Path(file.filename or "upload.mp4").suffix or ".mp4"
    tmp_path = None
    try:
        # Streamed to disk in chunks rather than read into memory: OpenCV needs a path
        # anyway, and buffering a 200 MB upload per concurrent request would not end
        # well. The size ceiling is enforced as it streams, so an oversized upload stops
        # costing disk as soon as it crosses the line.
        written = 0
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name
            while chunk := await file.read(1024 * 1024):
                written += len(chunk)
                if written > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"Video is larger than the "
                            f"{MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit."
                        ),
                    )
                tmp.write(chunk)

        if written == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        result = run_precheck(tmp_path, detector=_state["detector"])

        payload = result.as_dict()
        # The caller uploaded a file; echoing back the temp path we happened to give it
        # would be noise at best and a disclosure at worst.
        payload["video"] = file.filename
        return JSONResponse(payload)
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                logger.warning("could not remove temp file %s", tmp_path)


@app.post("/analyze")
async def analyze_endpoint(
    file: UploadFile = File(...),
    max_frames: int = Form(0),
    fast: bool = Form(False),
) -> JSONResponse:
    """
    Run the full pipeline on a clip and return its summary.

    Long and synchronous, which is a deliberate choice about where durability lives.
    The caller is the backend's queue worker, not a person: it already has retries,
    backoff and persistence, and duplicating those here — a job table, a callback,
    and credentials in the reverse direction — would put the same concerns in two
    places to save a held-open connection on an internal network that nothing is
    waiting on.

    The pipeline runs as a SUBPROCESS rather than in-process. `main.main()` reads
    `sys.argv`, so calling it from a request handler would mean mutating process-global
    state under concurrency; and a CUDA fault in a subprocess kills the subprocess
    rather than the service. The ~8 s of interpreter startup is nothing against an
    analysis measured in minutes.

    One GPU means one analysis. A second concurrent request is refused with 503 and
    Retry-After rather than queued, so work piles up in the caller's queue where it can
    be seen, instead of in this process where it cannot.
    """
    if _analysis_slot.locked():
        raise HTTPException(
            status_code=503,
            headers={"Retry-After": "60"},
            detail=(
                "Another analysis is already running. This service handles one at a "
                "time because it has one GPU."
            ),
        )

    async with _analysis_slot:
        suffix = Path(file.filename or "upload.mp4").suffix or ".mp4"
        workdir = Path(tempfile.mkdtemp(prefix="analyze-"))
        clip = workdir / f"input{suffix}"

        try:
            written = 0
            with clip.open("wb") as handle:
                while chunk := await file.read(1024 * 1024):
                    written += len(chunk)
                    if written > MAX_UPLOAD_BYTES:
                        raise HTTPException(
                            status_code=413,
                            detail=(
                                f"Video is larger than the "
                                f"{MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit."
                            ),
                        )
                    handle.write(chunk)

            if written == 0:
                raise HTTPException(status_code=400, detail="Uploaded file is empty.")

            summary = await asyncio.to_thread(
                _run_pipeline, clip, workdir, max_frames, fast
            )
            return JSONResponse(
                {
                    "video": file.filename,
                    "summary": summary,
                    "pipeline_version": _pipeline_version(),
                }
            )
        finally:
            shutil.rmtree(workdir, ignore_errors=True)


def _run_pipeline(clip: Path, workdir: Path, max_frames: int, fast: bool) -> dict:
    """
    Run the CLI against `clip` and return the summary it wrote.

    Blocking: called in a worker thread. Reads the summary from disk rather than
    parsing stdout, because the JSON on disk is the pipeline's actual output contract
    and log formats are not.
    """
    output_dir = workdir / "output"

    # Every output path is redirected into this request's own directory via a config
    # overlay. `load_config` layers built-in defaults, then configs/config.yaml, then
    # this file, so the model paths from the base config survive and only the io block
    # moves. Without it the pipeline writes into the repo's own output/, where
    # concurrent requests would read each other's summaries and nothing would ever be
    # cleaned up.
    overlay = workdir / "config.yaml"
    overlay.write_text(
        "io:\n"
        f"  output_video: {(output_dir / 'videos' / 'analysis.avi').as_posix()}\n"
        f"  output_frames_dir: {(output_dir / 'frames').as_posix()}\n"
        f"  output_stats_dir: {(output_dir / 'stats').as_posix()}\n"
        f"  log_dir: {(workdir / 'logs').as_posix()}\n",
        encoding="utf-8",
    )

    command = [
        sys.executable, "-m", "cli", "analyze", str(clip),
        "--config", str(overlay),
    ]
    if max_frames:
        command += ["--max-frames", str(max_frames)]
    if fast:
        command.append("--fast")

    result = subprocess.run(
        command,
        # Run from the package root: `-m cli` and the base config's relative model
        # paths both resolve from there.
        cwd=Path(__file__).resolve().parent,
        capture_output=True,
        text=True,
        timeout=ANALYSIS_TIMEOUT_S,
    )

    summaries = sorted((output_dir / "stats").glob("summary_*.json"))
    if not summaries:
        # No summary means the run did not reach the end. The pipeline's own stderr is
        # the only useful thing to say, trimmed: it is an internal caller reading this.
        tail = (result.stderr or result.stdout or "").strip().splitlines()[-15:]
        raise HTTPException(
            status_code=500,
            detail={
                "error": "The analysis did not produce a summary.",
                "exit_code": result.returncode,
                "log_tail": tail,
            },
        )

    return json.loads(summaries[-1].read_text(encoding="utf-8"))


def _pipeline_version() -> str:
    """
    Which pipeline produced a result.

    Stored by the caller against the job. Without it, a result from before a model or
    threshold change is indistinguishable from one after, and a table of them quietly
    becomes a mix of incomparable things.
    """
    import cli

    return cli.__version__
