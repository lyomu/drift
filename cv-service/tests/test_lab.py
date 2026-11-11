"""
tests/test_lab.py
Analysis Lab: the estimate maths and the HTTP routes. No video, no GPU: job runs are
replaced with a stub so these assert the lab's own behaviour.
"""
import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

pytest.importorskip("fastapi", reason="the service extra is not installed")
from fastapi.testclient import TestClient  # noqa: E402

import api  # noqa: E402
from lab import estimates, jobs  # noqa: E402


# ── estimates ────────────────────────────────────────────────────────────────

def _pose(nose_y, ankle_y, lik=0.9):
    p = [[0.0, 0.0, 0.9] for _ in range(13)]
    p[0] = [100.0, nose_y, lik]
    p[11] = [90.0, ankle_y, lik]
    p[12] = [110.0, ankle_y - 4, lik]
    return {"t": 0, "p": p}


def test_player_height_uses_nose_to_ankle_span():
    frames = [_pose(100, 278) for _ in range(10)]  # span 178 px
    assert estimates.player_height_px(frames) == pytest.approx(178 / 0.89)


def test_player_height_needs_enough_reliable_frames():
    assert estimates.player_height_px([_pose(100, 278)] * 4) is None
    assert estimates.player_height_px([_pose(100, 278, lik=0.2)] * 10) is None


def test_ball_centres_skip_missing_and_nan():
    dets = [{1: [0, 0, 10, 10]}, {}, {1: [float("nan"), 0, 1, 1]}]
    assert estimates.ball_centres(dets) == [(5.0, 5.0), None, None]


def test_speed_from_median_displacement():
    # 50 px per frame at 30 fps with 100 px per metre = 15 m/s = 54 km/h
    centres = [None] + [(i * 50.0, 0.0) for i in range(1, 15)]
    kmh, why = estimates.estimate_speed_kmh(centres, 0, 30.0, 100.0)
    assert why is None and kmh == pytest.approx(54.0)


def test_speed_ignores_one_bad_detection():
    centres = [None] + [(i * 50.0, 0.0) for i in range(1, 15)]
    centres[5] = (5000.0, 5000.0)
    kmh, _ = estimates.estimate_speed_kmh(centres, 0, 30.0, 100.0)
    assert kmh == pytest.approx(54.0)


def test_speed_works_with_sparse_detections():
    # ball seen every 4th frame, 200 px per 4 frames = 50 px/frame
    centres = [None] * 25
    for i in (2, 6, 10, 14):
        centres[i] = (i * 50.0, 0.0)
    kmh, why = estimates.estimate_speed_kmh(centres, 0, 30.0, 100.0)
    assert why is None and kmh == pytest.approx(54.0)


def test_speed_ignores_pairs_too_far_apart():
    centres = [None] * 25
    centres[2], centres[12] = (0.0, 0.0), (100.0, 0.0)  # 10 frames apart: no pair
    assert estimates.estimate_speed_kmh(centres, 0, 30.0, 100.0)[0] is None


def test_speed_refuses_without_ball_or_when_implausible():
    assert estimates.estimate_speed_kmh([None] * 20, 0, 30.0, 100.0) == (None, "ball not seen after contact")
    fast = [None] + [(i * 500.0, 0.0) for i in range(1, 15)]
    kmh, why = estimates.estimate_speed_kmh(fast, 0, 30.0, 100.0)
    assert kmh is None and "implausible" in why
    assert estimates.estimate_speed_kmh(fast, 0, 30.0, 0.0) == (None, "no scale")
    slow = [None] + [(i * 10.0, 0.0) for i in range(1, 15)]  # 10.8 km/h
    kmh, why = estimates.estimate_speed_kmh(slow, 0, 30.0, 100.0)
    assert kmh is None and "slow" in why


def test_landing_is_lowest_point_after_contact():
    centres = [None] * 60
    for i, y in zip(range(10, 30), range(100, 300, 10)):
        centres[i] = (50.0, float(y))
    assert estimates.estimate_landing(centres, 0, 30.0, 100, 400) == (0.5, round(290 / 400, 3))
    assert estimates.estimate_landing([None] * 60, 0, 30.0, 100, 400) is None


@pytest.mark.parametrize("overhead,session,label", [
    (True, "mixed", "S"), (False, "forehands", "FH"), (False, "mixed", "G"), (True, "forehands", "S"),
])
def test_shot_label(overhead, session, label):
    assert estimates.shot_label(overhead, session) == label


# ── routes ───────────────────────────────────────────────────────────────────

@pytest.fixture
def lab_client(tmp_path, monkeypatch):
    monkeypatch.setattr(jobs, "DATA_DIR", tmp_path)
    started = []
    monkeypatch.setattr(jobs, "start_job", lambda job_id: started.append(job_id))
    client = TestClient(api.app)
    client.started = started
    return client


def test_page_is_served(lab_client):
    r = lab_client.get("/lab")
    assert r.status_code == 200 and "Drift Analysis Lab" in r.text


def test_upload_creates_and_starts_a_job(lab_client):
    r = lab_client.post("/lab/jobs", files={"file": ("rally.mp4", b"fake-bytes", "video/mp4")},
                        data={"hand": "left", "session": "forehands", "max_seconds": "500"})
    assert r.status_code == 200
    job_id = r.json()["id"]
    assert lab_client.started == [job_id]
    status = lab_client.get(f"/lab/jobs/{job_id}").json()
    assert status["name"] == "rally.mp4" and status["hand"] == "left"
    assert status["maxSeconds"] == 120  # clamped
    assert [s["state"] for s in status["stages"]] == ["todo"] * len(jobs.STAGES)
    assert lab_client.get("/lab/jobs").json()["jobs"][0]["id"] == job_id


@pytest.mark.parametrize("data,files,code", [
    ({"hand": "both"}, ("a.mp4", b"x", "video/mp4"), 400),
    ({"session": "volleys"}, ("a.mp4", b"x", "video/mp4"), 400),
    ({}, ("a.txt", b"x", "text/plain"), 400),
    ({}, ("a.mp4", b"", "video/mp4"), 400),
])
def test_upload_rejects_bad_input(lab_client, data, files, code):
    assert lab_client.post("/lab/jobs", files={"file": files}, data=data).status_code == code
    assert lab_client.started == []


def test_upload_while_busy_waits_in_line(lab_client, monkeypatch):
    monkeypatch.setattr(jobs, "is_busy", lambda: True)
    r = lab_client.post("/lab/jobs", files={"file": ("a.mp4", b"x", "video/mp4")})
    assert r.status_code == 200
    job_id = r.json()["id"]
    assert lab_client.started == [job_id]
    assert lab_client.get(f"/lab/jobs/{job_id}").json()["state"] == "queued"


def test_queue_position_counts_jobs_ahead(monkeypatch):
    monkeypatch.setattr(jobs, "_queue", ["a1", "b2", "c3"])
    assert [jobs.queue_position(j) for j in ("a1", "b2", "c3", "zz")] == [0, 1, 2, 0]


def test_unknown_and_malformed_job_ids_are_404(lab_client):
    assert lab_client.get("/lab/jobs/abc123").status_code == 404
    assert lab_client.get("/lab/jobs/..%2F..").status_code == 404


def test_result_is_attached_when_done(lab_client):
    job_id = lab_client.post("/lab/jobs", files={"file": ("a.mp4", b"x", "video/mp4")}).json()["id"]
    (jobs.job_dir(job_id) / "result.json").write_text(json.dumps({"headline": "3 swings"}))
    assert lab_client.get(f"/lab/jobs/{job_id}").json()["result"]["headline"] == "3 swings"


def test_running_job_cannot_be_deleted_but_finished_one_can(lab_client):
    job_id = lab_client.post("/lab/jobs", files={"file": ("a.mp4", b"x", "video/mp4")}).json()["id"]
    assert lab_client.delete(f"/lab/jobs/{job_id}").status_code == 409  # still queued
    status = jobs.read_status(job_id)
    status["state"] = "done"
    jobs.write_status(job_id, status)
    assert lab_client.delete(f"/lab/jobs/{job_id}").status_code == 200
    assert lab_client.get(f"/lab/jobs/{job_id}").status_code == 404
