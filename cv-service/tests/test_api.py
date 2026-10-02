"""
tests/test_api.py
Tests for the HTTP interface. No model weights and no GPU: the court detector is
replaced with a fake, so these run anywhere and assert the API's behaviour rather than
the pipeline's accuracy, which tests/test_precheck.py already covers.

The one property worth stating outright, because it is easy to get backwards: a refused
clip is HTTP 200 with verdict "reject". A non-2xx status here means the CHECK failed,
not that the clip did. A caller that treats 4xx as "bad video" would report a service
outage to the user as a filming problem.
"""
import os
import sys

import cv2
import numpy as np
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

fastapi = pytest.importorskip("fastapi", reason="the service extra is not installed")
from fastapi.testclient import TestClient  # noqa: E402

import api  # noqa: E402


# ── fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    """
    A client that does NOT run the app's lifespan.

    Deliberately not `with TestClient(...)`: the context manager runs startup, which
    reads the config and loads ~95 MB of real weights. That would make these tests need
    the weights on disk and a GPU, and cost seconds per test, all to exercise routing.
    Requests work fine without it, and the tests that care about the detector inject a
    fake. The lifespan gets its own test below.
    """
    return TestClient(api.app)


@pytest.fixture(autouse=True)
def no_detector():
    """Default to tier 1 only; individual tests opt into a fake court detector."""
    previous = api._state["detector"]
    api._state["detector"] = None
    yield
    api._state["detector"] = previous


class _FakeDetector:
    """
    Stands in for CourtLineDetector.

    Returns keypoints forming a quadrilateral inside the frame. Whether they land on
    paint is decided by the frame content, not by this - which is the point: the API
    layer must not care what the verdict is.
    """

    def __init__(self):
        self.calls = 0

    def predict(self, frame):
        self.calls += 1
        h, w = frame.shape[:2]
        pts = []
        for fx, fy in [(0.1, 0.1), (0.9, 0.1), (0.1, 0.9), (0.9, 0.9),
                       (0.2, 0.1), (0.2, 0.9), (0.8, 0.1), (0.8, 0.9),
                       (0.1, 0.4), (0.9, 0.4), (0.1, 0.6), (0.9, 0.6),
                       (0.5, 0.4), (0.5, 0.6)]:
            pts += [w * fx, h * fy]
        return np.array(pts, dtype=np.float32)


def _video_bytes(tmp_path, w=1280, h=720, n_frames=90, fps=30.0):
    path = tmp_path / "clip.avi"
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"XVID"), fps, (w, h))
    assert writer.isOpened()
    rng = np.random.default_rng(1)
    frame = rng.integers(0, 255, size=(h, w, 3), dtype=np.uint8)
    for _ in range(n_frames):
        writer.write(frame)
    writer.release()
    return path.read_bytes()


# ── health ───────────────────────────────────────────────────────────────────

def test_health_reports_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_health_reports_whether_the_court_model_is_loaded(client):
    # A caller needs this to know whether a "pass" covered the court at all.
    assert client.get("/health").json()["court_model_loaded"] is False

    api._state["detector"] = _FakeDetector()
    assert client.get("/health").json()["court_model_loaded"] is True


# ── precheck ─────────────────────────────────────────────────────────────────

def test_good_clip_passes(client, tmp_path):
    r = client.post("/precheck",
                    files={"file": ("good.avi", _video_bytes(tmp_path), "video/avi")})

    assert r.status_code == 200
    body = r.json()
    assert body["verdict"] == "pass"
    assert body["court_checked"] is False       # no detector loaded in this fixture
    assert body["video"] == "good.avi"


def test_rejected_clip_is_http_200_not_an_error(client, tmp_path):
    """A refused clip is a successful check. Only a broken check is a non-2xx."""
    portrait = _video_bytes(tmp_path, w=480, h=864)
    r = client.post("/precheck",
                    files={"file": ("portrait.avi", portrait, "video/avi")})

    assert r.status_code == 200
    body = r.json()
    assert body["verdict"] == "reject"
    assert any(f["check"] == "orientation" and f["severity"] == "reject"
               for f in body["findings"])


def test_rejection_carries_a_message_for_the_uploader(client, tmp_path):
    portrait = _video_bytes(tmp_path, w=480, h=864)
    body = client.post(
        "/precheck",
        files={"file": ("portrait.avi", portrait, "video/avi")},
    ).json()

    blocking = [f for f in body["findings"] if f["severity"] == "reject"]
    assert blocking
    for f in blocking:
        assert len(f["message"]) > 40


def test_empty_upload_is_a_client_error(client):
    r = client.post("/precheck", files={"file": ("empty.mp4", b"", "video/mp4")})
    assert r.status_code == 400


def test_unreadable_upload_is_rejected_not_crashed(client):
    # Well-formed request, contents that are not a video: the check should return a
    # verdict rather than raise.
    r = client.post("/precheck",
                    files={"file": ("junk.mp4", b"not a video at all", "video/mp4")})

    assert r.status_code == 200
    assert r.json()["verdict"] == "reject"
    assert r.json()["findings"][0]["check"] == "readable"


def test_missing_file_field_is_422(client):
    assert client.post("/precheck").status_code == 422


def test_oversized_upload_is_refused(client, tmp_path, monkeypatch):
    monkeypatch.setattr(api, "MAX_UPLOAD_BYTES", 1024)
    r = client.post("/precheck",
                    files={"file": ("big.avi", _video_bytes(tmp_path), "video/avi")})
    assert r.status_code == 413


def test_loaded_detector_is_used_and_reported(client, tmp_path):
    detector = _FakeDetector()
    api._state["detector"] = detector

    body = client.post(
        "/precheck",
        files={"file": ("good.avi", _video_bytes(tmp_path), "video/avi")},
    ).json()

    assert detector.calls > 0, "the preloaded detector should have been reused"
    assert body["court_checked"] is True
    assert any(f["check"] == "court" for f in body["findings"])


def test_temp_files_do_not_accumulate(client, tmp_path):
    """
    Every upload lands on disk to be read by OpenCV, so a leak here fills the disk of a
    long-running service - the failure mode that already cost this project a day.
    """
    import tempfile
    from pathlib import Path

    tmpdir = Path(tempfile.gettempdir())
    before = len(list(tmpdir.glob("*.avi")))

    for _ in range(3):
        client.post("/precheck",
                    files={"file": ("clip.avi", _video_bytes(tmp_path), "video/avi")})

    assert len(list(tmpdir.glob("*.avi"))) == before


# ── startup ──────────────────────────────────────────────────────────────────

def test_missing_weights_degrade_the_service_rather_than_stopping_it(tmp_path):
    """
    Startup must survive absent weights.

    A service that refuses to boot without the court model cannot serve the header
    checks either - and those are what rejected every clip in the first real batch
    (portrait framing, a zero-byte transfer). Losing them because an unrelated file is
    missing would turn a degraded service into no service.
    """
    bogus = tmp_path / "no-court.yaml"
    bogus.write_text("models:\n  court: does/not/exist.pth\n", encoding="utf-8")

    original = api.CONFIG_PATH
    api.CONFIG_PATH = str(bogus)
    try:
        with TestClient(api.app) as c:          # context manager => lifespan runs
            body = c.get("/health").json()
            assert body["status"] == "ok"
            assert body["court_model_loaded"] is False

            # and it still answers, on the checks that need no model
            portrait = _video_bytes(tmp_path, w=480, h=864)
            r = c.post("/precheck",
                       files={"file": ("p.avi", portrait, "video/avi")})
            assert r.status_code == 200
            assert r.json()["verdict"] == "reject"
            assert r.json()["court_checked"] is False
    finally:
        api.CONFIG_PATH = original


# ── analyze ──────────────────────────────────────────────────────────────────

def test_analyze_returns_the_pipeline_summary(client, tmp_path, monkeypatch):
    """The summary the pipeline wrote is returned as-is, plus which version wrote it."""
    monkeypatch.setattr(
        api, "_run_pipeline",
        lambda *args, **kwargs: {"total_shots_p1": 3, "court_calibrated": True},
    )

    r = client.post("/analyze",
                    files={"file": ("clip.avi", _video_bytes(tmp_path), "video/avi")})

    assert r.status_code == 200
    body = r.json()
    assert body["summary"]["total_shots_p1"] == 3
    assert body["pipeline_version"]
    assert body["video"] == "clip.avi"


def test_analyze_refuses_a_second_concurrent_run(client, tmp_path, monkeypatch):
    """
    One GPU, one analysis. The second caller is refused with a Retry-After rather than
    admitted into a queue this process would then have to manage — work should pile up
    in the caller's queue, where it is visible, not in here where it is not.
    """
    import asyncio

    # Hold the slot as a running analysis would.
    slot = asyncio.Semaphore(1)
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(slot.acquire())
        monkeypatch.setattr(api, "_analysis_slot", slot)

        r = client.post(
            "/analyze",
            files={"file": ("clip.avi", _video_bytes(tmp_path), "video/avi")},
        )

        assert r.status_code == 503
        assert r.headers["retry-after"] == "60"
    finally:
        loop.close()


def test_analyze_cleans_up_when_the_pipeline_fails(client, tmp_path, monkeypatch):
    """A failed run must not leave its working directory behind on a long-lived host."""
    import tempfile
    from pathlib import Path as _Path

    def boom(*args, **kwargs):
        raise RuntimeError("pipeline exploded")

    monkeypatch.setattr(api, "_run_pipeline", boom)
    before = len(list(_Path(tempfile.gettempdir()).glob("analyze-*")))

    with pytest.raises(RuntimeError):
        client.post("/analyze",
                    files={"file": ("clip.avi", _video_bytes(tmp_path), "video/avi")})

    assert len(list(_Path(tempfile.gettempdir()).glob("analyze-*"))) == before
