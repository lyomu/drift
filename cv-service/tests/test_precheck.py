"""
tests/test_precheck.py
Unit tests for the pre-upload triage. No torch, no model weights, no real footage:
every clip here is synthesised, so the suite stays deterministic and fast.

The court check itself is not re-tested here - it is `assess_court_fit_detail`, which
tests/test_court_fit_detail.py already covers. What is tested here is the triage around
it: the header checks, the camera-motion test, the severity arithmetic, and above all
the short-circuit, since "a rejected clip never loads the court model" is the property
that makes this runnable on upload at all.
"""
import os
import sys

import cv2
import numpy as np
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.precheck import (
    MIN_WIDTH_PX,
    PASS,
    REJECT,
    RECOMMENDED_WIDTH_PX,
    WARN,
    Finding,
    PrecheckResult,
    _check_duration,
    _check_fps,
    _check_orientation,
    _check_readable,
    _check_resolution,
    _worst,
    assess_camera_motion,
    precheck,
    probe_metadata,
    sample_frames,
)


# ── helpers ──────────────────────────────────────────────────────────────────

def _textured_frame(w: int, h: int, seed: int = 0) -> np.ndarray:
    """A frame with enough texture for phase correlation to lock onto."""
    rng = np.random.default_rng(seed)
    return rng.integers(0, 255, size=(h, w, 3), dtype=np.uint8)


def _write_video(path, w=1280, h=720, n_frames=60, fps=30.0, shift_per_frame=0):
    """
    Synthesise a clip. `shift_per_frame` pans the content horizontally, which is how
    the camera-motion test is exercised without needing real handheld footage.
    """
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"XVID"), fps, (w, h))
    assert writer.isOpened(), "could not open a VideoWriter for the test fixture"
    base = _textured_frame(w, h, seed=1)
    for i in range(n_frames):
        writer.write(np.roll(base, i * shift_per_frame, axis=1) if shift_per_frame
                     else base)
    writer.release()
    return str(path)


def _meta(width=1280, height=720, fps=30.0, frame_count=300, size_bytes=1000):
    return {"readable": True, "width": width, "height": height, "fps": fps,
            "frame_count": frame_count, "size_bytes": size_bytes,
            "duration_s": frame_count / fps if fps else 0.0}


# ── severity arithmetic ──────────────────────────────────────────────────────

def test_worst_severity_wins():
    assert _worst([Finding("a", PASS, "")]) == PASS
    assert _worst([Finding("a", PASS, ""), Finding("b", WARN, "")]) == WARN
    assert _worst([Finding("a", WARN, ""), Finding("b", REJECT, "")]) == REJECT
    assert _worst([Finding("a", REJECT, ""), Finding("b", PASS, "")]) == REJECT


def test_worst_of_nothing_is_pass():
    assert _worst([]) == PASS


def test_blocking_lists_only_rejections():
    findings = [Finding("a", PASS, "fine"), Finding("b", REJECT, "no"),
                Finding("c", WARN, "hmm"), Finding("d", REJECT, "also no")]
    result = PrecheckResult("clip.mp4", REJECT, findings, _meta(), tier2_ran=True)

    assert [f.check for f in result.blocking] == ["b", "d"]
    assert result.is_rejected


def test_as_dict_is_json_shaped():
    result = PrecheckResult("clip.mp4", WARN, [Finding("a", WARN, "m", {"n": 1})],
                            _meta(), tier2_ran=True, court_checked=True)
    d = result.as_dict()

    assert d["verdict"] == WARN
    assert d["frames_sampled"] is True
    assert d["court_checked"] is True
    assert d["findings"] == [{"check": "a", "severity": WARN, "message": "m",
                              "detail": {"n": 1}}]


# ── header checks ────────────────────────────────────────────────────────────

def test_empty_file_is_rejected_with_its_own_reason():
    f = _check_readable({"readable": False, "size_bytes": 0})
    assert f.severity == REJECT
    assert "empty" in f.message.lower()


def test_unreadable_nonempty_file_is_rejected_as_corrupt():
    f = _check_readable({"readable": False, "size_bytes": 4096})
    assert f.severity == REJECT
    assert "corrupt" in f.message.lower() or "unsupported" in f.message.lower()


def test_portrait_is_rejected_landscape_is_not():
    assert _check_orientation(_meta(width=480, height=864)).severity == REJECT
    assert _check_orientation(_meta(width=1280, height=720)).severity == PASS


def test_square_counts_as_landscape():
    # Not a real camera mode, but the boundary should resolve somewhere explicit.
    assert _check_orientation(_meta(width=720, height=720)).severity == PASS


def test_resolution_bands():
    assert _check_resolution(_meta(width=RECOMMENDED_WIDTH_PX)).severity == PASS
    assert _check_resolution(_meta(width=MIN_WIDTH_PX)).severity == WARN
    assert _check_resolution(_meta(width=MIN_WIDTH_PX - 1)).severity == REJECT


def test_rejected_resolution_names_the_usual_cause():
    # The common case is a clip re-compressed by a messaging app, and the message is
    # only useful if it says so - "too low" alone leaves the user with nowhere to go.
    msg = _check_resolution(_meta(width=480, height=864)).message.lower()
    assert "messaging app" in msg or "original file" in msg


def test_fps_delegates_to_fps_support():
    assert _check_fps(_meta(fps=30.0)).severity == PASS      # inside measured band
    assert _check_fps(_meta(fps=20.0)).severity == WARN      # partially supported
    assert _check_fps(_meta(fps=120.0)).severity == REJECT   # far outside


def test_unreadable_fps_is_rejected():
    assert _check_fps(_meta(fps=0.0)).severity == REJECT


def test_duration_bands():
    assert _check_duration(_meta(fps=30.0, frame_count=30)).severity == REJECT   # 1s
    assert _check_duration(_meta(fps=30.0, frame_count=900)).severity == PASS    # 30s
    assert _check_duration(_meta(fps=30.0, frame_count=30 * 700)).severity == WARN


def test_unknown_duration_warns_rather_than_rejects():
    # A header that cannot be read is not evidence the clip is bad.
    assert _check_duration(_meta(fps=0.0, frame_count=0)).severity == WARN


# ── camera motion ────────────────────────────────────────────────────────────

def test_static_camera_passes():
    frames = [_textured_frame(320, 180, seed=1) for _ in range(6)]
    f = assess_camera_motion(frames)
    assert f.severity == PASS
    assert f.detail["median_shift"] < 0.05


def test_panning_camera_is_rejected():
    base = _textured_frame(320, 180, seed=2)
    # 25% of frame width between samples - unambiguously a moving camera.
    frames = [np.roll(base, i * 80, axis=1) for i in range(6)]
    f = assess_camera_motion(frames)
    assert f.severity == REJECT
    assert "tripod" in f.message.lower() or "fence" in f.message.lower()


def test_single_frame_cannot_judge_motion():
    f = assess_camera_motion([_textured_frame(320, 180)])
    assert f.severity == WARN
    assert f.check == "camera_motion"


# ── sampling and metadata against a real file ────────────────────────────────

def test_probe_metadata_reads_the_header(tmp_path):
    path = _write_video(tmp_path / "clip.avi", w=640, h=480, n_frames=45, fps=30.0)
    meta = probe_metadata(path)

    assert meta["readable"]
    assert (meta["width"], meta["height"]) == (640, 480)
    assert meta["fps"] == pytest.approx(30.0, abs=0.5)
    assert meta["duration_s"] == pytest.approx(1.5, abs=0.2)


def test_probe_metadata_on_missing_file_is_not_readable():
    meta = probe_metadata("does_not_exist.mp4")
    assert meta["readable"] is False
    assert meta["size_bytes"] == 0


def test_probe_metadata_on_empty_file(tmp_path):
    empty = tmp_path / "empty.mp4"
    empty.write_bytes(b"")
    meta = probe_metadata(str(empty))
    assert meta["readable"] is False
    assert meta["size_bytes"] == 0


def test_sample_frames_returns_requested_count(tmp_path):
    path = _write_video(tmp_path / "clip.avi", w=320, h=240, n_frames=60)
    frames = sample_frames(path, count=12)

    assert len(frames) == 12
    assert all(f.shape == (240, 320, 3) for f in frames)


def test_sample_frames_never_exceeds_the_clip(tmp_path):
    path = _write_video(tmp_path / "short.avi", w=320, h=240, n_frames=5)
    assert len(sample_frames(path, count=12)) <= 5


# ── end to end, without the court model ──────────────────────────────────────

def test_portrait_clip_short_circuits_before_tier_two(tmp_path):
    """
    The property that makes this runnable on upload: a clip refused on its header
    never decodes frames and never loads 95 MB of court-model weights.
    """
    path = _write_video(tmp_path / "portrait.avi", w=480, h=864, n_frames=90)
    result = precheck(path)

    assert result.verdict == REJECT
    assert result.tier2_ran is False
    assert "orientation" in [f.check for f in result.blocking]


def test_good_clip_passes_header_and_motion_checks(tmp_path):
    path = _write_video(tmp_path / "good.avi", w=1280, h=720, n_frames=150, fps=30.0)
    result = precheck(path, court_model_path=None)

    assert result.verdict == PASS
    assert result.tier2_ran is True
    assert {f.check for f in result.findings} >= {
        "readable", "orientation", "resolution", "frame_rate", "duration",
        "camera_motion",
    }


def test_court_is_not_judged_without_the_model(tmp_path):
    # Omitting the weights must not silently imply the court was checked and passed.
    path = _write_video(tmp_path / "good.avi", w=1280, h=720, n_frames=150)
    result = precheck(path, court_model_path=None)

    assert "court" not in [f.check for f in result.findings]


def test_result_says_the_court_went_unchecked(tmp_path):
    """
    A pass with no court model is not a pass on the court, and the result has to say so.

    Sampling frames and running the camera test happens with or without the weights, so
    "deep checks ran" is true in both cases and cannot answer this. Reporting it as if it
    could let a --quick run advertise a court that had never been looked at.
    """
    path = _write_video(tmp_path / "good.avi", w=1280, h=720, n_frames=150)
    result = precheck(path, court_model_path=None)

    assert result.verdict == PASS          # every check that DID run passed
    assert result.tier2_ran is True        # frames were sampled
    assert result.court_checked is False   # but the court was not judged
    assert result.as_dict()["court_checked"] is False


def test_court_checked_defaults_to_the_honest_direction():
    # Anything constructing a result without stating it claims the weaker thing.
    result = PrecheckResult("clip.mp4", PASS, [], _meta(), tier2_ran=True)
    assert result.court_checked is False


def test_empty_file_rejected_end_to_end(tmp_path):
    empty = tmp_path / "empty.mp4"
    empty.write_bytes(b"")
    result = precheck(str(empty))

    assert result.verdict == REJECT
    assert result.tier2_ran is False
    assert [f.check for f in result.blocking] == ["readable"]


def test_every_rejection_carries_an_actionable_message(tmp_path):
    """A refusal the user cannot act on is the failure mode this module exists to avoid."""
    path = _write_video(tmp_path / "portrait.avi", w=480, h=864, n_frames=90)
    result = precheck(path)

    for finding in result.blocking:
        assert len(finding.message) > 40, f"{finding.check} message is too terse"
        assert finding.message.rstrip().endswith("."), finding.check
