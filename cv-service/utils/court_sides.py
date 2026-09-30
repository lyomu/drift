"""
utils/court_sides.py
────────────────────
Which side of the net a player is on.

The bug this exists to fix
--------------------------
`utils/rally_decode.py` documents its state as "(last label, which **side** last struck the
ball)", and its strongest legality rule reads:

    A contact by the side that last struck the ball means the ball never crossed the net.

What was actually passed into it was `hit_bounce_classifier.striking_side()`, which returns
**which player was nearest the ball** — a player id, not a court side. In singles the two
coincide exactly (one player per side), so the distinction never mattered and the rule worked
as written.

In doubles they diverge, and the rule inverts. Partner A hits, then partner B hits: the ball
never crossed the net, so that is not a legal continuation. Player-id comparison sees two
different values, concludes the ball must have crossed, and accepts an impossible rally. The
grammar was doubles-correct in its naming only.

So side is derived here, from geometry, and player identity is kept separately for attribution.
Those are two different questions — "who hit it" and "which end was it hit from" — and
collapsing them is what hid the bug.

This changes singles too, deliberately
--------------------------------------
Passing a true court side rather than a player id is a behaviour change on the singles path
that every published event count was measured on. That was a deliberate call: one code path is
worth more than preserved numbers, and the substitution is arguably a correctness improvement
for singles as well, because a wrong nearest-player call currently corrupts the grammar state
where a wrong side would not. **Event counts in `README.md` and `UPSTREAM_README.md` were
measured before this and are not re-measured here** — see `DRIFT_CHANGES.md`.

How the net line is estimated
-----------------------------
The net is **not** a court keypoint. The model predicts 14 points: baselines (0-3), singles
sidelines (4-7), service lines (8-11) and the centre service line (12-13). The net sits between
the two service lines with nothing marking it.

It is estimated as the midline between the two baselines, evaluated **at the player's own x**
rather than as a single horizontal line. That matters because the court is a trapezoid in
image space: a camera off to one side puts the far baseline higher on one edge of the frame
than the other, and a single y threshold then puts players on the wrong side near the frame
edges.

There is precedent for this estimate in the codebase: `main.py` already computes
`net_y=(court_keypoints[1] + court_keypoints[5]) / 2.0` for `assess_selection`, which is the same
baseline-midline idea evaluated at the court's **left edge only**. This generalises it to the
player's own x so a tilted or off-centre camera cannot push players at the far edge of frame onto
the wrong side. `assess_selection` still takes a scalar `net_y` and is left alone here — it
reports selection quality rather than feeding the grammar, so it is not part of this fix.

PROVISIONAL, in a specific way worth knowing: the true net in image space is *not* the midpoint
between the baselines, because perspective compresses the far half. The midpoint sits slightly
into the far court, which biases a player standing very near the net toward being called "far".
The honest fix is to map through the homography the pipeline already computes and compare
against `HALF_COURT_LINE_HEIGHT`, which `to_court_side_via_homography` does when a homography
is available. This image-space estimate is the fallback for the case that matters most —
`PHASE0_FINDINGS.md` found the court fit failing on every real Drift clip, and a side is still
needed then.
"""
from __future__ import annotations

# Side labels. Ints rather than strings because they land in the rally decoder's state tuple,
# which is hashed per Viterbi step; and named rather than bare 0/1 so a caller cannot silently
# swap them.
FAR = 0
NEAR = 1

# Court keypoint indices, from constants and COURT_LINES in utils/court_validity.py.
FAR_BASELINE = (0, 1)    # (left, right)
NEAR_BASELINE = (2, 3)


def _keypoint_xy(keypoints, index: int) -> tuple[float, float] | None:
    """
    One keypoint as (x, y), or None when the prediction is unusable.

    Keypoints arrive as a flat sequence of 28 values (14 points), which is what
    `CourtLineDetector.predict` returns. Indexing defensively because this runs on clips whose
    court fit has already failed the validity gate — that is the case it exists for, so it
    cannot assume a well-formed prediction.
    """
    if keypoints is None:
        return None
    try:
        x, y = float(keypoints[index * 2]), float(keypoints[index * 2 + 1])
    except (IndexError, TypeError, ValueError):
        return None
    if x != x or y != y:      # NaN, which a failed fit does produce
        return None
    return (x, y)


def _line_y_at_x(p1: tuple[float, float], p2: tuple[float, float], x: float) -> float:
    """
    Height of the line through p1,p2 at horizontal position x.

    Clamped to the segment's own y range rather than extrapolated. A player can legitimately
    stand outside the court's x span — wide of the doubles alley, or behind the baseline at an
    angle — and an unclamped line fit there swings far enough to flip the side.
    """
    x1, y1 = p1
    x2, y2 = p2
    if abs(x2 - x1) < 1e-6:
        return (y1 + y2) / 2.0
    t = (x - x1) / (x2 - x1)
    t = max(0.0, min(1.0, t))
    return y1 + t * (y2 - y1)


def net_y_at_x(court_keypoints, x: float) -> float | None:
    """
    Estimated image y of the net at horizontal position x, or None if it cannot be estimated.

    The midline between the two baselines, evaluated at x. See the module docstring on why this
    is per-x rather than a single horizontal threshold, and on the perspective bias it carries.
    """
    far_left = _keypoint_xy(court_keypoints, FAR_BASELINE[0])
    far_right = _keypoint_xy(court_keypoints, FAR_BASELINE[1])
    near_left = _keypoint_xy(court_keypoints, NEAR_BASELINE[0])
    near_right = _keypoint_xy(court_keypoints, NEAR_BASELINE[1])
    if None in (far_left, far_right, near_left, near_right):
        return None

    far_y = _line_y_at_x(far_left, far_right, x)
    near_y = _line_y_at_x(near_left, near_right, x)
    return (far_y + near_y) / 2.0


def court_side(
    player_bbox,
    court_keypoints=None,
    frame_height: int | None = None,
) -> int | None:
    """
    Which side of the net this player is standing on.

    Args:
        player_bbox: `[x1, y1, x2, y2]` in image space.
        court_keypoints: flat 28-value court prediction. When absent or unusable, falls back to
            the frame midline — see below.
        frame_height: needed only for the fallback.

    Returns:
        FAR, NEAR, or None when neither the court nor a frame height was supplied. None is a
        real answer: the rally decoder treats an unknown side as unconstrained rather than
        guessing, which is why this must not invent one.

    The player's **feet** locate them, not their box centre. A player's box spans roughly two
    metres of height projected onto the court plane, and at the net that is enough for the
    centre to sit on the opposite side from where they are standing. `get_foot_position` uses
    the same convention for the mini-court mapping, so the two agree about where a player is.
    """
    if player_bbox is None:
        return None
    try:
        x1, y1, x2, y2 = (float(v) for v in player_bbox)
    except (TypeError, ValueError):
        return None
    if any(v != v for v in (x1, y1, x2, y2)):
        return None

    foot_x = (x1 + x2) / 2.0
    foot_y = y2

    net_y = net_y_at_x(court_keypoints, foot_x)
    if net_y is None:
        # No usable court. The frame midline is a poor stand-in and is used anyway, because the
        # alternative is refusing to decode a rally on every clip whose court fit failed — which
        # PHASE0_FINDINGS.md measured as all ten real Drift clips. Documented as a fallback in
        # the output rather than presented as a court-derived answer.
        if frame_height is None:
            return None
        net_y = frame_height / 2.0

    return FAR if foot_y < net_y else NEAR


def sides_for_frame(
    players: dict,
    court_keypoints=None,
    frame_height: int | None = None,
) -> dict:
    """
    `{player_id: side}` for every player in one frame, skipping those that cannot be placed.

    A player omitted here is one whose side is unknown, which is different from a player on
    neither side. Callers must treat a missing id as "unknown" rather than defaulting it.
    """
    out = {}
    for pid, bbox in (players or {}).items():
        side = court_side(bbox, court_keypoints, frame_height)
        if side is not None:
            out[pid] = side
    return out


def group_players_by_side(
    player_detections: list[dict],
    court_keypoints=None,
    frame_height: int | None = None,
) -> dict:
    """
    Assign each player id to a side by majority vote over every frame it appears in.

    A per-clip assignment rather than a per-frame one, and the reason is the same one
    `PlayerTracker._choose_players_over_clip` gives for voting over the clip: a player crossing
    the net to shake hands, or a single frame of bad keypoints, must not reassign them. For
    doubles this is what turns four tracked players into two teams.

    Returns:
        `{player_id: side}`. A player whose side could never be determined is omitted.
    """
    votes: dict[int, list[int]] = {}
    for frame_players in player_detections or []:
        for pid, side in sides_for_frame(frame_players, court_keypoints,
                                         frame_height).items():
            votes.setdefault(pid, []).append(side)

    assignment = {}
    for pid, seen in votes.items():
        if not seen:
            continue
        near = sum(1 for s in seen if s == NEAR)
        assignment[pid] = NEAR if near * 2 >= len(seen) else FAR
    return assignment


__all__ = [
    "FAR", "NEAR",
    "court_side", "group_players_by_side", "net_y_at_x", "sides_for_frame",
]


# ── deriving a side when the court is unavailable ──────────────────────────────

def relative_side(players: dict, player_id) -> int | None:
    """
    Which side a player is on, judged only against the other players in the same frame.

    No court, no frame size, no calibration: the players locate each other. Split their foot
    heights at the midpoint of the observed range and the striker belongs to whichever group
    they fall in. Camera-independent by construction, which is the point — it works on the
    clips whose court fit failed, which `PHASE0_FINDINGS.md` measured as all ten of the first
    real batch.

    Two failure modes, both real and both returning a wrong answer rather than None:

    - **Everyone on one side.** Warm-up footage with both people on the same half, which that
      same findings document lists as a genuine case in the first batch. This will split them
      into two "sides" that do not exist.
    - **Players close to the net.** The midpoint split is near their actual positions, so small
      tracking error flips the call.

    It is therefore the LAST tier, used only when neither the court nor a frame height is
    available. Returns None with fewer than two players, where there is nothing to be relative
    to.
    """
    if not players or player_id not in players:
        return None
    if len(players) < 2:
        return None

    def foot_y(bbox) -> float | None:
        try:
            return float(bbox[3])
        except (IndexError, TypeError, ValueError):
            return None

    feet = {pid: foot_y(bbox) for pid, bbox in players.items()}
    feet = {pid: y for pid, y in feet.items() if y is not None and y == y}
    if player_id not in feet or len(feet) < 2:
        return None

    lo, hi = min(feet.values()), max(feet.values())
    if hi - lo < 1e-6:
        return None      # all at the same height: no separation to read
    return FAR if feet[player_id] < (lo + hi) / 2.0 else NEAR


def striking_side(
    frame: int,
    ball_detections: list[dict],
    player_detections: list[dict],
    court_keypoints=None,
    frame_height: int | None = None,
    max_distance_px: float = float("inf"),
) -> int | None:
    """
    Which SIDE of the net struck the ball at this frame — not which player.

    This is what `utils/rally_decode.py` actually needs, and passing it a player id instead is
    the bug this module documents. Composition, deliberately: the striking player is found by
    the existing nearest-player logic, then mapped to a side. Attribution and side stay
    separate functions so a caller has to say which one it wants.

    Three tiers, best first. Each is a weaker claim than the one above it, and the fallbacks
    exist because refusing to decode a rally without a court fit would refuse every real Drift
    clip measured so far:

    1. **Court keypoints** — the net line estimated per-x from the baselines.
    2. **Frame midline** — needs only `frame_height`. Wrong for an off-centre or tilted camera.
    3. **Relative to the other players** — needs nothing, and carries the failure modes in
       `relative_side`.

    Returns None when no tier applies. The decoder treats an unknown side as unconstrained,
    which is the honest behaviour: it keeps the bounce rule and drops the side rule for that
    event rather than inventing a side and rejecting a real contact.
    """
    from .hit_bounce_classifier import striking_player

    player_id = striking_player(frame, ball_detections, player_detections, max_distance_px)
    if player_id is None:
        return None

    players = player_detections[frame] if frame < len(player_detections) else {}
    bbox = players.get(player_id)

    side = court_side(bbox, court_keypoints, frame_height)
    if side is not None:
        return side
    return relative_side(players, player_id)


__all__ += ["relative_side", "striking_side"]
