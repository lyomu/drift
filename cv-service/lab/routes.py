"""
lab/routes.py
─────────────
Analysis Lab: a local test page for uploading a clip and seeing everything the
pipelines make of it. Internal tool, English only, runs on the developer's machine.

    uvicorn api:app --port 8010      then open http://localhost:8010/lab
"""
from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse

from lab import jobs

router = APIRouter(prefix="/lab", tags=["lab"])
PAGE = Path(__file__).resolve().parent / "static" / "lab.html"
MAX_UPLOAD_BYTES = 1024 * 1024 * 1024
ALLOWED_SUFFIXES = {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm"}


@router.get("", response_class=HTMLResponse)
def page() -> str:
    return PAGE.read_text(encoding="utf-8")


@router.get("/jobs")
def list_jobs() -> dict:
    return {"jobs": jobs.list_jobs(), "busy": jobs.is_busy()}


@router.post("/jobs")
async def create_job(
    file: UploadFile = File(...),
    hand: str = Form("right"),
    session: str = Form("mixed"),
    max_seconds: int = Form(30),
) -> dict:
    # A clip uploaded while another runs waits in line: each job's thread blocks on
    # the run lock, so they go one at a time without a separate queue.
    if hand not in ("right", "left"):
        raise HTTPException(400, "hand must be right or left")
    if session not in ("mixed", "forehands", "serves"):
        raise HTTPException(400, "session must be mixed, forehands or serves")
    max_seconds = max(5, min(120, max_seconds))
    suffix = Path(file.filename or "clip.mp4").suffix.lower() or ".mp4"
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(400, f"{suffix} isn't a video format the lab reads.")

    tmp = Path(tempfile.mkdtemp(prefix="lab-upload-")) / f"upload{suffix}"
    written = 0
    with tmp.open("wb") as handle:
        while chunk := await file.read(1024 * 1024):
            written += len(chunk)
            if written > MAX_UPLOAD_BYTES:
                shutil.rmtree(tmp.parent, ignore_errors=True)
                raise HTTPException(413, "Video is larger than 1 GB.")
            handle.write(chunk)
    if written == 0:
        shutil.rmtree(tmp.parent, ignore_errors=True)
        raise HTTPException(400, "The uploaded file is empty.")

    job_id = jobs.create_job(tmp, Path(file.filename or "clip").name, hand, session, max_seconds)
    shutil.rmtree(tmp.parent, ignore_errors=True)
    jobs.start_job(job_id)
    return {"id": job_id}


def _status_or_404(job_id: str) -> dict:
    try:
        status = jobs.read_status(job_id)
    except ValueError:
        status = None
    if status is None:
        raise HTTPException(404, "No such analysis.")
    return status


@router.get("/jobs/{job_id}")
def get_job(job_id: str) -> dict:
    status = _status_or_404(job_id)
    result_path = jobs.job_dir(job_id) / "result.json"
    if result_path.exists():
        import json
        status["result"] = json.loads(result_path.read_text(encoding="utf-8"))
    d = jobs.job_dir(job_id)
    status["ahead"] = jobs.queue_position(job_id) if status.get("state") == "queued" else 0
    status["hasOverlay"] = (d / "overlay.mp4").exists()
    status["hasClip"] = (d / "clip.mp4").exists()
    return status


@router.get("/jobs/{job_id}/video")
def get_video(job_id: str, plain: bool = False):
    _status_or_404(job_id)
    d = jobs.job_dir(job_id)
    path = d / "clip.mp4" if plain or not (d / "overlay.mp4").exists() else d / "overlay.mp4"
    if not path.exists():
        raise HTTPException(404, "The video isn't ready yet.")
    return FileResponse(path, media_type="video/mp4")


@router.delete("/jobs/{job_id}")
def delete_job(job_id: str) -> dict:
    status = _status_or_404(job_id)
    if status.get("state") in ("queued", "running"):
        raise HTTPException(409, "This analysis is still running.")
    shutil.rmtree(jobs.job_dir(job_id), ignore_errors=True)
    return {"deleted": job_id}
