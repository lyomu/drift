"""
utils/racket_features.py
────────────────────────
Where the racket is, relative to the body, at a contact frame.

Companion to `pose_shot_classifier.py`, which answers the same question from the wrist and
is documented there as failing when the racket arm is occluded — 44-58% of backhands. These
features come from `trackers/racket_detector.py` instead, so they exist on frames where the
arm does not.

Nothing here is wired into the pipeline. It computes and returns features; `eval/
racket_coverage_at_contacts.py` logs them. There is no classifier, because there are no
labels on Drift footage to fit or check one against.

The honest problem with these features, stated up front
------------------------------------------------------
`pose_shot_classifier.py` builds its body axis in the horizontal (x, z) plane using
MediaPipe's depth estimate, specifically to dodge what it calls trap 3: when a player turns
side-on to hit, the shoulder axis collapses in image space to 2.8-8.5 px on real
groundstrokes, where a 2-3 px landmark error flips the answer.

**A detected racket box has no depth.** It is image-space only, so the axis it is projected
onto must be image-space too — the exact ill-conditioned construction that module avoids.
This is not an oversight; it is the price of the approach and it is why
`shoulder_width_px` is returned alongside every feature, so a caller can discard frames
where the axis is too short to mean anything.

There is a real reason to expect it to work anyway, and it is the lever arm. The wrist sits
roughly a quarter of a shoulder width off the midline on a marginal stroke; a racket head
sits a whole arm plus a racket further out. The same body rotation therefore produces a much
larger image-space offset for the racket than for the wrist, so the signal can survive an
axis that would be too noisy for the wrist. Whether it does is a measurement, and it has not
been made. Do not assume it.

What these features cannot do alone
-----------------------------------
`racket_side` gives the side of the body the racket is on. Forehand versus backhand needs
that *plus handedness*, which no single frame contains — the same gap `pose_shot_classifier`
closes by reading which wrist is hitting.

The available route, recorded but not implemented: handedness is constant for a player
within a clip, so the distribution of `racket_side` over that player's contacts should be
bimodal, and for almost every player the fuller mode is the forehand side. That is a
clip-level inference from a prior about how often people hit forehands, and it needs labels
to validate before it is worth more than a sentence. Written down so the next person does
not have to re-derive it.
"""
from __future__ import annotations

# Below this shoulder width in pixels, the image-space body axis is not worth projecting
# onto. Taken directly from the measurement in `pose_shot_classifier.py`'s docstring:
# shoulder width fell to 2.8-8.5 px on real side-on groundstrokes, where a 2-3 px landmark
# error flips the sign. 8.0 sits at the top of that observed range, so a frame passing this
# gate has an axis at least a few times its own error.
#
# PROVISIONAL. It is a threshold borrowed from a measurement made for a different feature
# (the wrist), and the lever-arm argument in the module docstring is precisely a claim that
# the racket tolerates a shorter axis than the wrist does. If that claim holds, this is too
# strict and should come down. The eval reports how many frames it rejects so the cost of
# being wrong about it is visible rather than silent.
MIN_SHOULDER_WIDTH_PX = 8.0


def racket_features_at_contact(
    landmarks: dict | None,
    racket: dict | None,
    min_shoulder_width_px: float = MIN_SHOULDER_WIDTH_PX,
) -> dict | None:
    """
    Body-relative racket geometry at one frame.

    Args:
        landmarks: from `PoseEstimator.detect_in_bbox` — `{name: (x_px, y_px, z_px)}`.
            Only the two shoulders are needed, which is the point: shoulders survive on
            frames where the racket-arm wrist does not.
        racket: one detection from `trackers.racket_detector.racket_for_player`, i.e.
            `{"bbox": [...], "confidence": float, "distance_px": float}`.
        min_shoulder_width_px: conditioning gate, see MIN_SHOULDER_WIDTH_PX.

    Returns:
        A feature dict, or None when the geometry is unavailable. None is returned for a
        missing racket, missing shoulders, or an axis too short to project onto — three
        different absences, distinguished by `unavailable_reason` in the returned dict only
        when features *are* computable. When they are not, the caller knows only that they
        are not; the eval counts the reasons separately by asking in order rather than
        reading them off a return value.
    """
    if not landmarks or racket is None:
        return None

    left_sh = landmarks.get("LEFT_SHOULDER")
    right_sh = landmarks.get("RIGHT_SHOULDER")
    if left_sh is None or right_sh is None:
        return None

    # Image-plane body axis: the player's right shoulder to their left. See the module
    # docstring — this is the ill-conditioned construction, and the gate below is why it
    # is allowed to be.
    axis_x = left_sh[0] - right_sh[0]
    axis_y = left_sh[1] - right_sh[1]
    shoulder_width = (axis_x ** 2 + axis_y ** 2) ** 0.5
    if shoulder_width < min_shoulder_width_px:
        return None

    centre_x = (left_sh[0] + right_sh[0]) / 2.0
    centre_y = (left_sh[1] + right_sh[1]) / 2.0

    x1, y1, x2, y2 = racket["bbox"]
    racket_cx = (x1 + x2) / 2.0
    racket_cy = (y1 + y2) / 2.0

    # Signed projection onto the shoulder axis, in shoulder widths. Positive means the
    # racket is toward the player's anatomical LEFT. Dividing by shoulder_width twice is
    # deliberate: once to normalise the axis to a unit vector, once to express the result
    # as a fraction of body width rather than in pixels, which is what makes it comparable
    # across a 480px phone clip and a 1080p broadcast frame.
    rel_x = racket_cx - centre_x
    rel_y = racket_cy - centre_y
    racket_side = (rel_x * axis_x + rel_y * axis_y) / (shoulder_width ** 2)

    # Height above the shoulder line, in shoulder widths, sign flipped so positive is up —
    # image y grows downward and a feature named "height" that increases as the racket
    # falls is a bug waiting to be read as physics.
    racket_height = -rel_y / shoulder_width

    box_w = abs(x2 - x1)
    box_h = abs(y2 - y1)

    return {
        # The primary signal: which side of the midline, and how far out.
        "racket_side": racket_side,
        "racket_offset": abs(racket_side),
        "racket_height": racket_height,

        # A WEAK face-orientation proxy, and weak for a specific reason worth knowing: the
        # box is axis-aligned, so a racket held at 45° produces a near-square box whether
        # its face points at the camera or along it. It carries orientation information only
        # near 0° and 90°. Recorded because it is free and because the implementation plan
        # names racket-face orientation as a Phase 2 feature — not because this delivers it.
        "box_aspect": (box_w / box_h) if box_h > 0 else None,

        # Conditioning and provenance, so a caller can filter rather than trust. Every one
        # of these is a reason a feature row might deserve to be thrown out.
        "shoulder_width_px": shoulder_width,
        "racket_confidence": racket.get("confidence"),
        "racket_distance_px": racket.get("distance_px"),
    }
