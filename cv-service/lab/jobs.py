"""
lab/jobs.py
───────────
One Analysis Lab run: trim, pose, swings, ball, estimates, overlay video.

Each job lives in its own folder under data/lab/<id>/ (gitignored) and writes
status.json after every stage, so the page can show progress live. One job runs at a
time: the ball pipeline needs the whole GPU.

Stages reuse what already exists rather than reimplementing it:
* pose   - tools/pose_fixtures.py (MediaPipe Pose, the app's 13 joints at 15 fps)
* swings - the app's own Dart SwingAnalyzer, via mobile/tool/swing_analyze.dart
* ball   - the tennis-vision pipeline (main.py), whose TrackNet detections are kept
"""
from __future__ import annotations

import json
import pickle
import shutil
import subprocess
import sys
import threading
import time
import traceback
import uuid
from datetime import datetime
from pathlib import Path

from lab import estimates

CV_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = CV_ROOT.parent
MOBILE_ROOT = REPO_ROOT / "mobile"
DATA_DIR = CV_ROOT / "data" / "lab"

STAGES = [
    ("prepare", "Read and trim the video"),
    ("pose", "Find the player's body in each frame"),
    ("swings", "Detect swings and measure them"),
    ("ball", "Track the ball and the court"),
    ("estimates", "Estimate speed and placement"),
    ("video", "Draw the overlay video"),
]

_run_lock = threading.Lock()
# Jobs start in upload order: each waits for the one before it.
_queue_lock = threading.Lock()
_queue: list[str] = []


class LabError(RuntimeError):
    """A stage failed in a way the page should show as-is."""


# ── job folder helpers ────────────────────────────────────────────────


def job_dir(job_id: str) -> Path:
    if not job_id.isalnum():
        raise ValueError("bad job id")
    return DATA_DIR / job_id


def read_status(job_id: str) -> dict | None:
    path = job_dir(job_id) / "status.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def write_status(job_id: str, status: dict) -> None:
    path = job_dir(job_id) / "status.json"
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(status, indent=1), encoding="utf-8")
    tmp.replace(path)


def list_jobs() -> list[dict]:
    if not DATA_DIR.exists():
        return []
    jobs = []
    for d in DATA_DIR.iterdir():
        s = read_status(d.name) if d.is_dir() and d.name.isalnum() else None
        if s:
            jobs.append({k: s.get(k) for k in ("id", "name", "createdAt", "state", "headline")})
    return sorted(jobs, key=lambda j: j["createdAt"] or "", reverse=True)


def is_busy() -> bool:
    return _run_lock.locked()


def create_job(upload_path: Path, name: str, hand: str, session: str, max_seconds: int) -> str:
    job_id = uuid.uuid4().hex[:12]
    d = job_dir(job_id)
    d.mkdir(parents=True)
    shutil.move(str(upload_path), d / ("input" + (upload_path.suffix or ".mp4")))
    write_status(job_id, {
        "id": job_id, "name": name, "createdAt": datetime.now().isoformat(timespec="seconds"),
        "hand": hand, "session": session, "maxSeconds": max_seconds, "state": "queued",
        "stages": [{"key": k, "label": label, "state": "todo"} for k, label in STAGES],
        "log": [], "headline": None, "error": None,
    })
    return job_id


def start_job(job_id: str) -> None:
    with _queue_lock:
        _queue.append(job_id)
    threading.Thread(target=_run, args=(job_id,), daemon=True, name=f"lab-{job_id}").start()


def queue_position(job_id: str) -> int:
    """How many clips are ahead of this one (0 = running or next)."""
    with _queue_lock:
        return _queue.index(job_id) if job_id in _queue else 0


# ── the run ───────────────────────────────────────────────────────────


class _Progress:
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.status = read_status(job_id)

    def stage(self, key: str, state: str, note: str | None = None) -> None:
        for s in self.status["stages"]:
            if s["key"] == key:
                s["state"] = state
                if note is not None:
                    s["note"] = note
        self.save()

    def log(self, text: str) -> None:
        self.status["log"] = (self.status["log"] + [f"{time.strftime('%H:%M:%S')}  {text}"])[-80:]
        self.save()

    def save(self) -> None:
        write_status(self.job_id, self.status)


def _run(job_id: str) -> None:
    # Wait for our turn: the head of the queue takes the run lock.
    while True:
        with _queue_lock:
            first = _queue[0] if _queue else job_id
        if first == job_id and _run_lock.acquire(timeout=1):
            break
        time.sleep(1)
    try:
        _run_locked(job_id)
    finally:
        with _queue_lock:
            if job_id in _queue:
                _queue.remove(job_id)
        _run_lock.release()


def _run_locked(job_id: str) -> None:
    p = _Progress(job_id)
    p.status["state"] = "running"
    p.save()
    d = job_dir(job_id)
    try:
        result = _pipeline(d, p)
        (d / "result.json").write_text(json.dumps(result), encoding="utf-8")
        p.status["state"] = "done"
        p.status["headline"] = result["headline"]
        p.log("Done.")
    except Exception as exc:  # noqa: BLE001 - every failure must reach the page
        p.status["state"] = "failed"
        p.status["error"] = str(exc) if isinstance(exc, LabError) else f"{type(exc).__name__}: {exc}"
        for s in p.status["stages"]:
            if s["state"] == "doing":
                s["state"] = "failed"
        p.log("Failed: " + p.status["error"])
        (d / "error.txt").write_text(traceback.format_exc(), encoding="utf-8")
    p.save()


def _pipeline(d: Path, p: _Progress) -> dict:
    hand, session, max_s = p.status["hand"], p.status["session"], p.status["maxSeconds"]
    source = next(d.glob("input.*"))

    # 1. prepare
    p.stage("prepare", "doing")
    clip = d / "clip.mp4"
    _ffmpeg(["-i", str(source), "-t", str(max_s), "-an", "-c:v", "libx264", "-preset", "veryfast",
             "-crf", "18", "-pix_fmt", "yuv420p", str(clip)])
    from tools.clip_inventory import probe
    meta = probe(clip)
    original = probe(source)
    trimmed = original["duration_s"] > meta["duration_s"] + 0.5
    p.log(f"{meta['width']}x{meta['height']} {meta['orientation']}, {meta['fps']:g} fps, "
          f"{meta['duration_s']} s" + (f" (first {max_s} s of {original['duration_s']} s)" if trimmed else ""))
    p.stage("prepare", "done", f"{meta['width']}x{meta['height']}, {meta['duration_s']} s")

    # 2. pose
    p.stage("pose", "doing")
    # In its own process so MediaPipe's memory is released before the ball pipeline,
    # which holds every frame in RAM, starts.
    r = subprocess.run([sys.executable, "tools/pose_fixtures.py", str(clip), "-o", str(d / "pose.json")],
                       cwd=CV_ROOT, capture_output=True, text=True, timeout=1800)
    if r.returncode != 0 or not (d / "pose.json").exists():
        raise LabError("Body tracking failed: " + ((r.stderr or r.stdout).strip().splitlines() or ["?"])[-1])
    fixture = json.loads((d / "pose.json").read_text(encoding="utf-8"))
    share = len(fixture["frames"]) / max(1, fixture["framesSampled"])
    p.log(f"Body found in {len(fixture['frames'])} of {fixture['framesSampled']} sampled frames ({share:.0%}).")
    p.stage("pose", "done", f"body in {share:.0%} of frames")

    # 3. swings (the app's own analyzer)
    p.stage("swings", "doing")
    swings = _dart_swings(d / "pose.json", hand) if fixture["frames"] else {"swings": [], "summaryForehand": {}, "summaryServe": {}}
    (d / "swings.json").write_text(json.dumps(swings), encoding="utf-8")
    n_meas = sum(1 for s in swings["swings"] if s["measured"])
    p.log(f"{len(swings['swings'])} swings detected, {n_meas} measured.")
    p.stage("swings", "done", f"{len(swings['swings'])} swings, {n_meas} measured")

    # 4. ball + court (tennis-vision)
    p.stage("ball", "doing")
    summary, ball_dets = _run_ball_pipeline(clip, d, p)
    if summary is None:
        p.stage("ball", "failed", "pipeline didn't finish")
    else:
        cov = summary.get("ball", {}).get("coverage")
        p.stage("ball", "done", f"ball in {cov:.0%} of frames, court "
                + ("calibrated" if summary.get("court_calibrated") else "not calibrated")
                if cov is not None else "done")

    # 5. estimates
    p.stage("estimates", "doing")
    result = _assemble(meta, fixture, swings, summary, ball_dets, session, trimmed, original)
    p.stage("estimates", "done", "speed " + ("measured" if result["speed"]["source"] == "court" else "estimated"))

    # 6. overlay video
    p.stage("video", "doing")
    try:
        _render_overlay(clip, fixture, result, ball_dets, d / "overlay.mp4", d)
        p.stage("video", "done")
    except Exception as exc:  # noqa: BLE001 - the numbers still stand without the video
        p.log(f"Overlay video failed ({exc}); showing the plain clip.")
        p.stage("video", "failed", "plain clip shown")
    return result


# ── stage helpers ─────────────────────────────────────────────────────


def _ffmpeg(args: list[str]) -> None:
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise LabError("ffmpeg could not read this video: " + (r.stderr.strip().splitlines() or ["?"])[-1])


def _dart_swings(fixture_path: Path, hand: str) -> dict:
    dart = shutil.which("dart")
    if not dart:
        raise LabError("The Dart SDK isn't on PATH, so swings can't be analysed.")
    r = subprocess.run([dart, "run", "tool/swing_analyze.dart", str(fixture_path), "--hand", hand],
                       cwd=MOBILE_ROOT, capture_output=True, text=True, timeout=300)
    out = r.stdout.strip()
    start = out.find("{")
    if r.returncode != 0 or start < 0:
        raise LabError("Swing analysis failed: " + ((r.stderr or r.stdout).strip().splitlines() or ["?"])[-1])
    return json.loads(out[start:])


def _run_ball_pipeline(clip: Path, d: Path, p: _Progress) -> tuple[dict | None, list | None]:
    out = d / "pipeline"
    overlay = d / "pipeline.yaml"
    overlay.write_text(
        "io:\n"
        f"  output_video: {(out / 'analysis.avi').as_posix()}\n"
        f"  output_frames_dir: {(out / 'frames').as_posix()}\n"
        f"  output_stats_dir: {(out / 'stats').as_posix()}\n"
        f"  log_dir: {(out / 'logs').as_posix()}\n"
        f"  tracknet_stub_path: {(out / 'ball.pkl').as_posix()}\n",
        encoding="utf-8",
    )
    proc = subprocess.Popen(
        [sys.executable, "-m", "cli", "analyze", str(clip), "--config", str(overlay), "--fast", "--no-stubs"],
        cwd=CV_ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace",
    )
    tail: list[str] = []
    for line in proc.stdout:  # stream the pipeline's own step lines to the page
        line = line.strip()
        if line:
            tail = (tail + [line])[-8:]
        if "[" in line and "/9]" in line:
            p.log("Ball pipeline: " + line[line.find("["):])
    proc.wait(timeout=3600)
    if proc.returncode != 0:
        for line in tail[-4:]:
            p.log("Ball pipeline said: " + line[:300])
    summaries = sorted((out / "stats").glob("summary_*.json"))
    stubs = sorted(out.glob("ball*.pkl"))
    summary = json.loads(summaries[-1].read_text(encoding="utf-8")) if summaries else None
    dets = None
    if stubs:
        with open(stubs[-1], "rb") as f:
            dets = pickle.load(f)
    if summary is None:
        p.log(f"Ball pipeline exited with code {proc.returncode} and no summary.")
    return summary, dets


def _assemble(meta, fixture, swings, summary, ball_dets, session, trimmed, original) -> dict:
    fps = meta["fps"]
    height_px = estimates.player_height_px(fixture["frames"])
    px_per_m = height_px / estimates.ASSUMED_STATURE_M if height_px else 0.0
    centres = estimates.ball_centres(ball_dets) if ball_dets else []
    court_ok = bool(summary and summary.get("court_calibrated"))

    shots = []
    for s in swings["swings"]:
        cf = round(s["peakMs"] * fps / 1000)
        speed, why = (estimates.estimate_speed_kmh(centres, cf, fps, px_per_m)
                      if centres else (None, "ball not tracked"))
        landing = estimates.estimate_landing(centres, cf, fps, meta["width"], meta["height"]) if centres else None
        shots.append({
            "n": s["index"] + 1, "tMs": s["peakMs"], "label": estimates.shot_label(s["overhead"], session),
            "measured": s["measured"], "reason": s.get("reason"), "values": s["values"],
            "speedKmh": speed, "speedNote": why, "landing": landing,
        })

    speeds = [x["speedKmh"] for x in shots if x["speedKmh"] is not None]
    if court_ok and summary.get("avg_shot_speed_p1_kmh"):
        speed = {"source": "court", "avgKmh": summary["avg_shot_speed_p1_kmh"], "peakKmh": None}
    else:
        speed = {"source": "estimate", "avgKmh": round(sum(speeds) / len(speeds), 1) if speeds else None,
                 "peakKmh": max(speeds) if speeds else None,
                 "scale": f"player height {height_px:.0f} px = {estimates.ASSUMED_STATURE_M} m" if height_px else None}

    n_s = sum(1 for x in shots if x["label"] == "S")
    n_g = len(shots) - n_s
    kind = "forehands" if session == "forehands" else "groundstrokes"
    headline = (f"{len(shots)} swings: {n_g} {kind if n_g != 1 else kind[:-1]}"
                + (f", {n_s} serve{'s' if n_s != 1 else ''}" if n_s else "")) if shots else "No swings found"
    return {
        "headline": headline,
        "meta": meta,
        "trimmed": trimmed,
        "originalDurationS": original["duration_s"],
        "poseShare": round(len(fixture["frames"]) / max(1, fixture["framesSampled"]), 3),
        "detector": swings.get("detector"),
        "shots": shots,
        "counts": {"swings": len(shots), "groundstrokes": n_g, "serves": n_s,
                   "measured": sum(1 for x in shots if x["measured"])},
        "summaryForehand": swings.get("summaryForehand", {}),
        "summaryServe": swings.get("summaryServe", {}),
        "speed": speed,
        "court": {
            "calibrated": court_ok,
            "lineSupport": summary.get("court_line_support") if summary else None,
            "ballCoverage": summary.get("ball", {}).get("coverage") if summary else None,
            "pipelineTypes": summary.get("shot_classification", {}).get("types") if summary else None,
            "warning": summary.get("warning") if summary else "The ball pipeline didn't finish.",
        },
    }


_BONES = [(1, 2), (1, 3), (3, 5), (2, 4), (4, 6), (1, 7), (2, 8), (7, 8), (7, 9), (9, 11), (8, 10), (10, 12)]


def _render_overlay(clip: Path, fixture: dict, result: dict, ball_dets, out: Path, d: Path) -> None:
    import cv2

    cap = cv2.VideoCapture(str(clip))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    tmp = d / "overlay.avi"
    writer = cv2.VideoWriter(str(tmp), cv2.VideoWriter_fourcc(*"MJPG"), fps, (w, h))
    poses = fixture["frames"]
    centres = estimates.ball_centres(ball_dets) if ball_dets else []
    shots = result["shots"]
    pi, i = 0, 0
    scale = max(1.0, w / 540)
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        t = i * 1000 / fps
        while pi + 1 < len(poses) and abs(poses[pi + 1]["t"] - t) <= abs(poses[pi]["t"] - t):
            pi += 1
        if poses and abs(poses[pi]["t"] - t) <= 80:
            pts = poses[pi]["p"]
            for a, b in _BONES:
                if pts[a][2] >= 0.5 and pts[b][2] >= 0.5:
                    cv2.line(frame, (int(pts[a][0]), int(pts[a][1])), (int(pts[b][0]), int(pts[b][1])),
                             (255, 255, 255), max(1, int(2 * scale)), cv2.LINE_AA)
        if i < len(centres) and centres[i] is not None:
            cv2.circle(frame, (int(centres[i][0]), int(centres[i][1])), int(6 * scale), (60, 220, 230), 2, cv2.LINE_AA)
        for s in shots:
            if -250 <= t - s["tMs"] <= 600:
                text = f"#{s['n']} {s['label']}" + (f"  ~{s['speedKmh']:.0f} km/h" if s["speedKmh"] else "")
                cv2.rectangle(frame, (0, 0), (w, int(44 * scale)), (40, 95, 30), -1)
                cv2.putText(frame, text, (int(12 * scale), int(31 * scale)), cv2.FONT_HERSHEY_DUPLEX,
                            0.9 * scale, (255, 255, 255), max(1, int(2 * scale)), cv2.LINE_AA)
        writer.write(frame)
        i += 1
    cap.release()
    writer.release()
    _ffmpeg(["-i", str(tmp), "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
             "-movflags", "+faststart", str(out)])
    tmp.unlink(missing_ok=True)
