"""
utils/precheck.py
─────────────────
Cheap triage: decide whether a clip is worth running the full pipeline on, before
spending the full pipeline's time on finding out.

Why this module exists
----------------------
The pipeline already refuses to report numbers it cannot stand behind - that is what
`court_validity` and `fps_support` do. But it refuses LATE. A clip that can never
produce a measurement still pays for TrackNet on every frame, YOLO player tracking,
pose estimation and a rendered output video first, and only then is told the court fit
failed. On the first run against real footage that was about 60 s per clip to reach a
verdict that two seconds of evidence could have given.

This module front-loads the evidence that is cheap to gather. It is not a second
opinion on the pipeline's gate and it does not re-derive any threshold: the court test
here IS `court_validity.assess_court_fit_detail`, run over a dozen seek-sampled frames
instead of a fully decoded clip, and the frame-rate test IS `fps_support.assess_fps`.
What is new is the ordering, the metadata checks the pipeline never had, and a verdict
shaped so a caller - the CLI today, the upload endpoint later - can act on it.

Two tiers, and the ordering is the point
----------------------------------------
Tier 1 is metadata only: no torch import, no model load, no frame decode beyond one
probe read. Orientation, resolution, frame rate and duration all come from the video
header in milliseconds.

Tier 2 samples ~12 frames by seeking and runs the court keypoint model on those alone.

Tier 1 rejections short-circuit, so a portrait phone clip is refused without ever
loading 95 MB of court-model weights.

Measured in-process on an RTX 4060, model and page cache warm, so this is steady state
rather than first call:

    rejected on its header       74 ms
    full check including court 1576 ms      21x
    full pipeline analyse       ~25 s       ~340x a header rejection

Note what those numbers are NOT: run as a one-shot CLI command, either path costs about
eight seconds, because ~7.8 s of that is interpreter startup and importing cv2 and scipy.
The ordering therefore buys nothing at a shell prompt and everything in a long-lived
service, which pays the import once and then answers per request. The upload endpoint
this is built for is the latter.

Deliberately NOT checked here
-----------------------------
Whether both players are on the same side of the net - a real failure mode, seen on
most of the first real-footage batch. Detecting it needs YOLO player detection, which
is the expensive stage this module exists to avoid. It belongs in a deeper optional
tier if it ever earns the cost, not in the pre-upload path.

Threshold provenance - read this before trusting the numbers
------------------------------------------------------------
`MIN_LINE_SUPPORT` (0.22) and the frame-rate bands are imported, not invented, and
carry the calibration tables in their own modules.

The thresholds defined HERE are provisional and are not that. They rest on two data
points: the bundled 1280x720 sample clip, which the pipeline analyses correctly, and
a batch of ten 480x864 WhatsApp-compressed portrait clips recorded on real courts,
every one of which failed the court gate (line support 0.022-0.209) with ball
detection between 0% and 25% of frames. That is a working example and a failing
example with nothing measured in between, so the boundaries below are placed by
argument rather than by evidence:

    - 480 px wide gives a tennis ball 1-3 px across, which is why ball detection
      collapsed. 1280 px is the only width observed to work.
    - Portrait framing spends roughly two thirds of its pixels on sky and on empty
      foreground court, leaving the band of play a fraction of the frame.

Both should be re-derived the moment there is footage that brackets them - a
landscape clip at 960 px, a properly-captured portrait clip - exactly as
`MIN_LINE_SUPPORT` was derived from its nine-clip table. Until then they are
signposted as PROVISIONAL in the findings they produce, and a caller that wants to
apply its own policy has the raw numbers in `detail`.
"""
from __future__ import annotations

import math
import os
from dataclasses import dataclass, field

import cv2
import numpy as np

from .court_validity import MIN_LINE_SUPPORT, assess_court_fit_detail
from .fps_support import PARTIALLY_SUPPORTED, SUPPORTED, assess_fps

# Verdict levels, ordered. A result's verdict is the worst of its findings.
PASS = "pass"
WARN = "warn"
REJECT = "reject"

_SEVERITY_RANK = {PASS: 0, WARN: 1, REJECT: 2}

# ── Provisional thresholds. See "Threshold provenance" in the module docstring. ──

# Below this the ball is too few pixels across for TrackNet to find. The failing batch
# sat at 480 px and detected the ball in 0-25% of frames; the working sample is 1280 px.
MIN_WIDTH_PX = 960
RECOMMENDED_WIDTH_PX = 1280

# A clip shorter than this cannot contain a rally worth measuring.
MIN_DURATION_S = 3.0

# Beyond this a clip is a session rather than a single take. `main.py` still assumes one
# continuous view of play, but `session.py` now segments a long clip into its rallies and
# analyses them individually, so this is no longer a reason to send the user away — it warns
# that the clip will be handled as a session, which costs more and may not cover all of it.
LONG_DURATION_S = 600.0

# Global frame-to-frame shift, as a fraction of frame width, between seek-sampled
# frames seconds apart. A tripod reads near zero because the background does not move;
# a pan or a handheld drift moves the whole background together. Players moving inside
# a static frame are suppressed by downscaling before the correlation.
MAX_STATIC_SHIFT = 0.05
MAX_TOLERABLE_SHIFT = 0.15

# Width the frames are downscaled to before correlating. Small enough that two players
# are a few pixels and cannot dominate the background, large enough to localise a shift.
_MOTION_WORK_WIDTH = 128


@dataclass(frozen=True)
class Finding:
    """One check's outcome, in a shape a UI can render without interpreting it."""

    check: str        # stable machine-readable id
    severity: str     # PASS / WARN / REJECT
    message: str      # user-facing and actionable: what is wrong and what to do
    detail: dict = field(default_factory=dict)   # the raw numbers behind the message

    def as_dict(self) -> dict:
        return {"check": self.check, "severity": self.severity,
                "message": self.message, "detail": self.detail}


@dataclass(frozen=True)
class PrecheckResult:
    """The verdict on a clip, plus every finding that contributed to it."""

    video_path: str
    verdict: str
    findings: list[Finding]
    metadata: dict
    tier2_ran: bool
    # Whether the COURT was actually judged, which `tier2_ran` does not tell you: frames
    # are sampled and the camera-motion test runs whenever the header checks pass, with
    # or without the court model. Kept separate because conflating the two let a --quick
    # run report "deep checks ran" on a clip whose court had never been looked at, and a
    # caller reading that would conclude the court had passed. Defaults to the honest
    # direction: not checked unless something says otherwise.
    court_checked: bool = False

    @property
    def is_rejected(self) -> bool:
        return self.verdict == REJECT

    @property
    def blocking(self) -> list[Finding]:
        """Only the findings that caused a rejection - what a UI should lead with."""
        return [f for f in self.findings if f.severity == REJECT]

    def as_dict(self) -> dict:
        """Shape an HTTP caller can consume directly."""
        return {
            "video": self.video_path,
            "verdict": self.verdict,
            "metadata": self.metadata,
            "frames_sampled": self.tier2_ran,
            "court_checked": self.court_checked,
            "findings": [f.as_dict() for f in self.findings],
        }


def _worst(findings: list[Finding]) -> str:
    return max((f.severity for f in findings), key=lambda s: _SEVERITY_RANK[s],
               default=PASS)


# ──────────────────────────── tier 1: metadata ────────────────────────────

def probe_metadata(video_path: str) -> dict:
    """
    Read the video header. No decoding beyond a single frame to prove it is readable.

    A container can report plausible dimensions and still fail on the first read - the
    first real batch included a zero-byte file from a failed transfer - so readability
    is proven by reading, not by `isOpened()` alone.
    """
    meta = {"readable": False, "width": 0, "height": 0, "fps": 0.0,
            "frame_count": 0, "duration_s": 0.0, "size_bytes": 0}

    try:
        meta["size_bytes"] = os.path.getsize(video_path)
    except OSError:
        return meta
    if meta["size_bytes"] == 0:
        return meta

    cap = cv2.VideoCapture(video_path)
    try:
        if not cap.isOpened():
            return meta
        ok, _ = cap.read()
        if not ok:
            return meta

        # OpenCV applies any rotation flag in the container by default, so these are the
        # dimensions as displayed rather than as stored. That is what we want: a clip
        # shot in portrait reads as portrait here regardless of how it was encoded.
        meta["readable"] = True
        meta["width"] = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        meta["height"] = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        meta["fps"] = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
        meta["frame_count"] = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    finally:
        cap.release()

    if meta["fps"] > 0 and meta["frame_count"] > 0:
        meta["duration_s"] = meta["frame_count"] / meta["fps"]
    return meta


def _check_readable(meta: dict) -> Finding:
    if meta["readable"]:
        return Finding("readable", PASS, "Video file opens and decodes.",
                       {"size_bytes": meta["size_bytes"]})
    if meta["size_bytes"] == 0:
        return Finding("readable", REJECT,
                       "This file is empty (0 bytes) - the transfer did not complete. "
                       "Send the video again.",
                       {"size_bytes": 0})
    return Finding("readable", REJECT,
                   "This file could not be opened as a video. It may be corrupt or in "
                   "an unsupported format - re-export it as MP4 (H.264) and try again.",
                   {"size_bytes": meta["size_bytes"]})


def _check_orientation(meta: dict) -> Finding:
    w, h = meta["width"], meta["height"]
    detail = {"width": w, "height": h,
              "aspect": round(w / h, 3) if h else 0.0,
              "provisional": True}
    if h and w >= h:
        return Finding("orientation", PASS, "Filmed in landscape.", detail)
    return Finding(
        "orientation", REJECT,
        "This clip is in portrait. A tennis court is far wider than it is tall, so a "
        "portrait frame spends most of its pixels on sky and empty foreground and "
        "leaves the play itself a narrow band. Turn the phone sideways and film in "
        "landscape.",
        detail,
    )


def _check_resolution(meta: dict) -> Finding:
    w, h = meta["width"], meta["height"]
    detail = {"width": w, "height": h,
              "min_width_px": MIN_WIDTH_PX,
              "recommended_width_px": RECOMMENDED_WIDTH_PX,
              "provisional": True}
    if w >= RECOMMENDED_WIDTH_PX:
        return Finding("resolution", PASS,
                       f"{w}x{h} is enough resolution to track the ball.", detail)
    if w >= MIN_WIDTH_PX:
        return Finding(
            "resolution", WARN,
            f"{w}x{h} is on the low side. Ball tracking degrades as the ball shrinks "
            f"below a few pixels across; {RECOMMENDED_WIDTH_PX}px wide or more is safer.",
            detail,
        )
    return Finding(
        "resolution", REJECT,
        f"{w}x{h} is too low to track a tennis ball, which would be only a pixel or "
        f"two across at this size. This is usually caused by sending the clip through "
        f"a messaging app, which re-compresses it - transfer the original file instead "
        f"(USB, a cloud drive, or as a 'document' rather than as a video).",
        detail,
    )


def _check_fps(meta: dict) -> Finding:
    support = assess_fps(meta["fps"])
    detail = support.as_dict()

    if support.status == SUPPORTED:
        return Finding("frame_rate", PASS, support.reason, detail)
    if support.status == PARTIALLY_SUPPORTED:
        return Finding("frame_rate", WARN, support.reason, detail)

    # Deliberately stricter than the pipeline itself, which runs an unsupported rate
    # anyway with a caveat attached because refusing after the fact would waste a clip
    # the user already uploaded. Before the upload the trade runs the other way: the
    # numbers would not be measurements, and saying so now is cheaper for everyone.
    # A caller that prefers the pipeline's stance has `detail["status"]` to act on.
    return Finding("frame_rate", REJECT, support.reason, detail)


def _check_duration(meta: dict) -> Finding:
    d = meta["duration_s"]
    detail = {"duration_s": round(d, 2), "frame_count": meta["frame_count"],
              "min_duration_s": MIN_DURATION_S, "provisional": True}
    if d <= 0:
        return Finding("duration", WARN,
                       "Clip length could not be read from the file header.", detail)
    if d < MIN_DURATION_S:
        return Finding("duration", REJECT,
                       f"This clip is {d:.1f}s long, which is too short to contain a "
                       f"rally worth measuring.", detail)
    if d > LONG_DURATION_S:
        return Finding("duration", WARN,
                       f"This clip is {d / 60:.0f} minutes long, so it will be analysed "
                       f"as a session: we find the rallies in it and measure them one by "
                       f"one. Long sessions take a while and we may not get through every "
                       f"rally — you'll see which ones we measured.", detail)
    return Finding("duration", PASS, f"{d:.1f}s of footage.", detail)


# ──────────────────────── tier 2: sampled-frame checks ────────────────────────

def sample_frames(video_path: str, count: int = 12) -> list[np.ndarray]:
    """
    Pull `count` evenly spaced frames by seeking, rather than decoding the whole clip.

    Seeking is approximate on some codecs and the reported frame count is occasionally
    wrong, so an unusable header falls back to reading forward and keeping every Nth
    frame. Returning fewer frames than asked for is fine - every consumer here treats
    the sample as a sample.
    """
    cap = cv2.VideoCapture(video_path)
    frames: list[np.ndarray] = []
    try:
        if not cap.isOpened():
            return frames
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

        if total <= 0:
            stride = 10
            i = 0
            while len(frames) < count:
                ok, frame = cap.read()
                if not ok:
                    break
                if i % stride == 0:
                    frames.append(frame)
                i += 1
            return frames

        for idx in np.linspace(0, total - 1, min(count, total), dtype=int):
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
            ok, frame = cap.read()
            if ok:
                frames.append(frame)
    finally:
        cap.release()
    return frames


def _global_shift(a: np.ndarray, b: np.ndarray) -> float:
    """
    Translation between two frames as a fraction of frame width.

    Downscaled hard first: at 128 px wide a player is a smudge and the background
    dominates the correlation, which is what makes this a camera-motion test rather
    than a subject-motion test. Phase correlation is used rather than feature matching
    because it needs no detector, no matcher and no tuning.
    """
    ratio = _MOTION_WORK_WIDTH / a.shape[1]
    size = (_MOTION_WORK_WIDTH, max(8, int(a.shape[0] * ratio)))

    ga = cv2.cvtColor(cv2.resize(a, size), cv2.COLOR_BGR2GRAY).astype(np.float32)
    gb = cv2.cvtColor(cv2.resize(b, size), cv2.COLOR_BGR2GRAY).astype(np.float32)
    window = cv2.createHanningWindow((ga.shape[1], ga.shape[0]), cv2.CV_32F)

    (dx, dy), _response = cv2.phaseCorrelate(ga, gb, window)
    return math.hypot(dx, dy) / _MOTION_WORK_WIDTH


def assess_camera_motion(frames: list[np.ndarray]) -> Finding:
    """Judge whether the camera held still across the sampled frames."""
    if len(frames) < 2:
        return Finding("camera_motion", WARN,
                       "Not enough frames could be sampled to judge camera movement.",
                       {"samples": len(frames), "provisional": True})

    shifts = [_global_shift(frames[i], frames[i + 1]) for i in range(len(frames) - 1)]
    median = float(np.median(shifts))
    worst = float(np.max(shifts))
    detail = {"median_shift": round(median, 4), "max_shift": round(worst, 4),
              "static_below": MAX_STATIC_SHIFT, "tolerable_below": MAX_TOLERABLE_SHIFT,
              "samples": len(frames), "provisional": True}

    if median <= MAX_STATIC_SHIFT:
        return Finding("camera_motion", PASS, "Camera is steady.", detail)
    if median <= MAX_TOLERABLE_SHIFT:
        return Finding(
            "camera_motion", WARN,
            "The camera drifts during this clip. Court positions are re-detected per "
            "frame so this is survivable, but a propped-up or tripod-mounted phone "
            "gives noticeably better measurements.", detail)
    return Finding(
        "camera_motion", REJECT,
        "The camera moves too much during this clip - it looks panned or hand-held "
        "rather than fixed. Prop the phone against the fence or use a tripod, and let "
        "the play happen inside a still frame.", detail)


def assess_court(frames: list[np.ndarray], keypoints_per_frame: list) -> Finding:
    """
    Court check - a thin adapter over the pipeline's own gate.

    No threshold is re-derived here: `assess_court_fit_detail` owns the decision, the
    0.22 calibration behind it, and the distinction between a clip with camera cuts in
    it and one that never shows a court at all. This only chooses a severity and passes
    its reason through, so the precheck and the pipeline can never disagree about
    whether a given clip's court is usable.
    """
    valid, median, detail = assess_court_fit_detail(frames, keypoints_per_frame,
                                                    sample_count=len(frames))
    detail = {**detail, "median_line_support": round(median, 3),
              "min_line_support": MIN_LINE_SUPPORT}

    if valid:
        return Finding("court", PASS, detail["reason"], detail)

    if detail.get("likely_camera_cut"):
        return Finding("court", REJECT, detail["reason"], detail)

    return Finding(
        "court", REJECT,
        detail["reason"] + " Court markings that are worn or painted over cannot be "
        "located, and every real-world measurement - speed, distance, placement - is "
        "derived from them. A court with clearer lines, or a view taking in more of "
        "the court, is what this needs.",
        detail,
    )


# ──────────────────────────────── entry point ────────────────────────────────

def precheck(
    video_path: str,
    court_model_path: str | None = None,
    sample_count: int = 12,
    device: str | None = None,
    detector=None,
) -> PrecheckResult:
    """
    Triage a clip. Cheap checks first; expensive ones only if the cheap ones allow it.

    Args:
        video_path:       clip to judge.
        court_model_path: court keypoint weights. Omit to run tier 1 only - metadata
                          checks with no torch import and no model load.
        sample_count:     frames to seek-sample for the tier 2 checks.
        device:           torch device for the court model; defaults to CUDA if present.
        detector:         an already-loaded CourtLineDetector to reuse. A one-shot CLI
                          run has nothing to reuse and should pass `court_model_path`
                          instead; a long-lived service loads the weights once at
                          startup and passes them here on every request, which is the
                          difference between ~1.6 s and paying a fresh ResNet-50 load
                          per clip. Takes precedence over `court_model_path`.

    Returns:
        A PrecheckResult. Never raises on a bad clip: an unreadable or unusable video
        is a REJECT verdict with a reason, which is the whole point of the module.
    """
    meta = probe_metadata(video_path)
    findings = [_check_readable(meta)]

    if not meta["readable"]:
        return PrecheckResult(video_path, REJECT, findings, meta, tier2_ran=False)

    findings += [_check_orientation(meta), _check_resolution(meta),
                 _check_fps(meta), _check_duration(meta)]

    # Short-circuit: a clip already refused on its header is not worth decoding frames
    # for, and certainly not worth loading the court model for. This is what keeps the
    # common rejection path in the millisecond range.
    if _worst(findings) == REJECT:
        return PrecheckResult(video_path, REJECT, findings, meta, tier2_ran=False)

    frames = sample_frames(video_path, sample_count)
    if not frames:
        findings.append(Finding("sampling", REJECT,
                                "No frames could be read from this clip, although its "
                                "header looked valid. The file is likely truncated.",
                                {"requested": sample_count}))
        return PrecheckResult(video_path, REJECT, findings, meta, tier2_ran=False)

    findings.append(assess_camera_motion(frames))

    court_checked = False
    if detector is None and court_model_path:
        # Imported here, not at module scope, so tier 1 stays free of torch entirely.
        from court_line_detector import CourtLineDetector

        detector = CourtLineDetector(court_model_path, device=device)

    if detector is not None:
        keypoints = [detector.predict(f) for f in frames]
        findings.append(assess_court(frames, keypoints))
        court_checked = True

    return PrecheckResult(video_path, _worst(findings), findings, meta,
                          tier2_ran=True, court_checked=court_checked)
