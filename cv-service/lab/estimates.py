"""
lab/estimates.py
────────────────
Rough numbers for the Analysis Lab when the court can't be calibrated.

The real pipeline refuses speeds and court positions without a court fit, because
pixels can't be turned into metres without one. The lab is a test tool, and the owner
chose to see labelled estimates instead of blanks (2026-11-11). Everything here is
marked as an estimate wherever it is shown:

* **Speed** is scaled from the player's own height in the frame (assumed 1.75 m), using
  the ball's movement in the first frames after contact. It ignores depth: a ball hit
  away from the camera looks slower than it is. Expect it to be off by up to 2x.
* **Placement** is where the ball reached its lowest point in the image after contact,
  in camera-view coordinates. It is not a position on the court.

Pure functions only, so they're unit-testable without video.
"""
from __future__ import annotations

import math
from statistics import median

ASSUMED_STATURE_M = 1.75
# Nose sits about 0.93 of stature above the floor and the ankle about 0.04, so the
# nose-to-ankle span is roughly 0.89 of a standing player's height.
NOSE_TO_ANKLE_SHARE = 0.89
MAX_PLAUSIBLE_KMH = 250.0
# Below this a "shot" is a tracking error (a rolling ball, a mis-detection), not a stroke:
# on R04 the sparse detections gave 12 and 20 km/h for fed forehands.
MIN_PLAUSIBLE_KMH = 30.0

# Joint order of a pose fixture (tools/pose_fixtures.py).
NOSE, L_ANKLE, R_ANKLE = 0, 11, 12


def player_height_px(pose_frames: list[dict], min_likelihood: float = 0.5) -> float | None:
    """Median standing height in pixels, from the nose-to-ankle span."""
    spans = []
    for f in pose_frames:
        p = f["p"]
        nose = p[NOSE]
        ankles = [a for a in (p[L_ANKLE], p[R_ANKLE]) if a[2] >= min_likelihood]
        if nose[2] < min_likelihood or not ankles:
            continue
        span = max(a[1] for a in ankles) - nose[1]
        if span > 0:
            spans.append(span)
    if len(spans) < 5:
        return None
    return median(spans) / NOSE_TO_ANKLE_SHARE


def ball_centres(ball_detections: list) -> list[tuple[float, float] | None]:
    """Per-frame ball centre from TrackNet detections (`{1: [x1, y1, x2, y2]}`)."""
    out: list[tuple[float, float] | None] = []
    for d in ball_detections:
        box = d.get(1) if isinstance(d, dict) else None
        if not box or any(v is None or (isinstance(v, float) and math.isnan(v)) for v in box):
            out.append(None)
        else:
            out.append(((box[0] + box[2]) / 2, (box[1] + box[3]) / 2))
    return out


def estimate_speed_kmh(
    centres: list[tuple[float, float] | None],
    contact_frame: int,
    fps: float,
    px_per_m: float,
    window: int = 21,
    min_pairs: int = 2,
    max_gap: int = 6,
) -> tuple[float | None, str | None]:
    """
    Ball speed just after contact, or (None, reason).

    Uses the median per-frame displacement between consecutive detections in the
    `window` frames after contact, so one bad detection can't set the number. On
    phone video TrackNet sees the ball only every few frames, hence pairs up to
    `max_gap` frames apart (measured on R04: detections 3-6 frames apart).
    """
    if px_per_m <= 0 or fps <= 0:
        return None, "no scale"
    pts = [(i, centres[i]) for i in range(contact_frame + 1, min(len(centres), contact_frame + 1 + window))
           if centres[i] is not None]
    rates = []
    for (i0, a), (i1, b) in zip(pts, pts[1:]):
        gap = i1 - i0
        if gap <= max_gap:
            rates.append(math.dist(a, b) / gap)
    if len(rates) < min_pairs:
        return None, "ball not seen after contact"
    kmh = median(rates) * fps / px_per_m * 3.6
    if kmh > MAX_PLAUSIBLE_KMH:
        return None, "implausible (likely a wrong ball detection)"
    if kmh < MIN_PLAUSIBLE_KMH:
        return None, "implausibly slow (likely a tracking error)"
    return round(kmh, 1), None


def estimate_landing(
    centres: list[tuple[float, float] | None],
    contact_frame: int,
    fps: float,
    width: int,
    height: int,
) -> tuple[float, float] | None:
    """Lowest image point of the ball 0.15-1.5 s after contact, as 0..1 of the frame."""
    start = contact_frame + max(1, round(0.15 * fps))
    end = min(len(centres), contact_frame + round(1.5 * fps))
    seen = [c for c in centres[start:end] if c is not None]
    if len(seen) < 3:
        return None
    x, y = max(seen, key=lambda c: c[1])
    return round(x / width, 3), round(y / height, 3)


def shot_label(overhead: bool, session: str) -> str:
    """S for overheads; groundstrokes are FH in a forehand session, else G."""
    if overhead:
        return "S"
    return "FH" if session == "forehands" else "G"
