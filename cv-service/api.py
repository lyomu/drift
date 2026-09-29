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

import logging
import os
import shutil
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

logger = logging.getLogger("cv-service.api")

# Refused before anything is written to disk. Generous because a minute of 1080p phone
# video is comfortably over 100 MB, and the point of the precheck is to judge real
# uploads rather than only small ones.
MAX_UPLOAD_BYTES = 1024 * 1024 * 1024  # 1 GiB

# Read once at import so a misconfigured deployment fails at startup rather than on the
# first request. Overridable so a container can point at a mounted weights volume.
CONFIG_PATH = os.environ.get("TENNIS_VISION_CONFIG", "configs/config.yaml")

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
async def analyze_endpoint(file: UploadFile = File(...)) -> JSONResponse:
    """
    Not implemented, on purpose.

    A full analysis is minutes of GPU work. Doing it inside a request would tie up a
    worker, time out at every proxy in between, and give the caller nowhere to look when
    it failed. It belongs on a queue with a job id and a callback, and that plumbing is
    the next piece of work rather than a thing to fake here.

    Declared so the backend can build against the real path and receive an honest 501
    instead of a 404 that could equally mean the service is misdeployed.
    """
    raise HTTPException(
        status_code=501,
        detail=(
            "Analysis is not available over HTTP yet. A full run takes minutes and will "
            "be dispatched as a queued job with a callback; use the `tennis-vision "
            "analyze` CLI meanwhile."
        ),
    )
