"""
tests/test_racket_features.py
─────────────────────────────
Tests for racket-to-player association and for the body-relative racket geometry.

What is being guarded
---------------------
These are the two pieces of the untried Phase 2 avenue that can be wrong without anything
raising, and they fail in opposite directions:

- `racket_for_player` can answer when it should decline. An ungated nearest-neighbour always
  finds a racket — the opponent's, a courtside bag, a shadow — and this project's negative
  results are a catalogue of what always-answering costs. SAM 3D Body made the classifier
  worse than MediaPipe precisely by answering where MediaPipe declined.
- `racket_features_at_contact` can produce a number that is not camera-independent. A side
  signal that flips with which way the player faces, or changes with resolution, would train
  a classifier that works on the clip it was fitted to and nowhere else — which is the 76.3%
  on THETIS / 53.6% on broadcast result restated.

So the tests below are mostly invariance and refusal tests, not value tests. There is no
accuracy assertion anywhere in this file and there cannot be: accuracy needs labelled Drift
footage, which does not exist yet.

No weights, no GPU, no `rfdetr` needed.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from trackers.racket_detector import (
    MAX_RACKET_DISTANCE_BOX_HEIGHTS,
    racket_for_player,
)
from utils.racket_features import MIN_SHOULDER_WIDTH_PX, racket_features_at_contact

# A player 40 px wide and 160 px tall, centred at (120, 180).
PLAYER = [100.0, 100.0, 140.0, 260.0]


def racket(cx, cy, w=30.0, h=10.0, confidence=0.8):
    return {"bbox": [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2],
            "confidence": confidence}


def shoulders(left_x, right_x, y=150.0):
    """
    Two shoulders at the same image height.

    `left`/`right` are ANATOMICAL, so `left_x < right_x` is a player facing away from the
    camera and `left_x > right_x` is one facing it. Which is the point of several tests
    below: the same racket position must not mean different things depending on facing.
    """
    return {"LEFT_SHOULDER": (left_x, y, 0.0), "RIGHT_SHOULDER": (right_x, y, 0.0)}


# ── association: when is a racket this player's racket ─────────────────────────

def test_no_rackets_means_no_racket():
    assert racket_for_player([], PLAYER) is None


def test_no_player_box_means_no_racket():
    assert racket_for_player([racket(120, 180)], None) is None


def test_a_racket_at_the_player_is_theirs():
    found = racket_for_player([racket(130, 170)], PLAYER)
    assert found is not None
    assert found["distance_px"] == pytest.approx(((130 - 120) ** 2 + (170 - 180) ** 2) ** 0.5)


def test_a_distant_racket_is_declined_rather_than_claimed():
    """
    The gate is the whole point of this function. The nearest racket in the frame may be the
    opponent's or nobody's, and a function that always returns one turns "no evidence" into
    "evidence", which is the failure mode this avenue was chosen to avoid.
    """
    far = 120.0, 180.0 + MAX_RACKET_DISTANCE_BOX_HEIGHTS * 160.0 + 50.0
    assert racket_for_player([racket(*far)], PLAYER) is None


def test_the_nearest_racket_within_the_gate_wins():
    """Two players in frame, two rackets: each must get the one nearer to them."""
    rackets = [racket(200, 250, confidence=0.99), racket(125, 185, confidence=0.30)]
    found = racket_for_player(rackets, PLAYER)
    assert found["confidence"] == 0.30, "picked by confidence instead of by distance"


def test_a_degenerate_player_box_declines():
    """A zero-height box cannot scale a distance gate, so it cannot be gated at all."""
    assert racket_for_player([racket(120, 100)], [100.0, 100.0, 140.0, 100.0]) is None


def test_the_gate_scales_with_the_player_not_with_pixels():
    """
    The property that makes one constant work on a 480 px phone transfer and a 1080 p
    broadcast frame. The same pixel distance must be acceptable for a large player and refused
    for a small one, because what it means in metres differs.

    Without this, the threshold is really a resolution setting, and PHASE0_FINDINGS.md has
    the clips that would break it: 480x864 WhatsApp transfers alongside 1280x720 broadcast.
    """
    big = [0.0, 0.0, 100.0, 400.0]      # 400 px tall, centre (50, 200)
    small = [0.0, 0.0, 10.0, 40.0]      # 40 px tall, centre (5, 20)
    offset = 100.0

    assert racket_for_player([racket(50.0, 200.0 + offset)], big) is not None
    assert racket_for_player([racket(5.0, 20.0 + offset)], small) is None


# ── features: refusals ─────────────────────────────────────────────────────────

def test_no_racket_means_no_features():
    assert racket_features_at_contact(shoulders(140, 100), None) is None


def test_no_landmarks_means_no_features():
    assert racket_features_at_contact(None, racket(160, 150)) is None


def test_missing_a_shoulder_means_no_features():
    """
    One shoulder gives no axis. Worth testing because shoulders are what this approach relies
    on surviving: MediaPipe drops the occluded racket ARM on 44-58% of backhands while
    keeping the torso, and that asymmetry is the whole reason a racket detector might help.
    """
    landmarks = {"LEFT_SHOULDER": (140.0, 150.0, 0.0)}
    assert racket_features_at_contact(landmarks, racket(160, 150)) is None


def test_a_collapsed_body_axis_is_refused():
    """
    Trap 3 from `pose_shot_classifier.py`, inherited. A player turning side-on to hit collapses
    the image-space shoulder axis to 2.8-8.5 px on real groundstrokes, where a 2-3 px landmark
    error flips the sign. A racket box carries no depth, so unlike the pose classifier this
    module cannot escape into the (x, z) plane — it has to decline instead.
    """
    narrow = shoulders(100.0 + MIN_SHOULDER_WIDTH_PX / 2.0, 100.0)
    assert racket_features_at_contact(narrow, racket(160, 150)) is None


# ── features: invariances that decide whether this generalises ─────────────────

def test_racket_on_the_anatomical_left_reads_positive():
    features = racket_features_at_contact(shoulders(100.0, 60.0), racket(120.0, 150.0))
    assert features["racket_side"] > 0


def test_the_sign_does_not_depend_on_which_way_the_player_faces():
    """
    Trap 1/2 from `pose_shot_classifier.py`: image left and right swap meaning when a player
    turns around, so any rule keyed to image direction is wrong half the time. The same racket
    pixel must read as the opposite anatomical side when the shoulders swap.
    """
    away = racket_features_at_contact(shoulders(100.0, 60.0), racket(120.0, 150.0))
    toward = racket_features_at_contact(shoulders(60.0, 100.0), racket(120.0, 150.0))
    assert away["racket_side"] * toward["racket_side"] < 0


def test_the_side_signal_is_scale_free():
    """
    Doubling every pixel coordinate is a resolution change, not a tennis change. If this
    feature moved with resolution it would encode the camera, and a classifier fitted on
    broadcast clips would read a phone clip as a different stroke.
    """
    small = racket_features_at_contact(shoulders(100.0, 60.0), racket(120.0, 150.0))
    large = racket_features_at_contact(
        {"LEFT_SHOULDER": (200.0, 300.0, 0.0), "RIGHT_SHOULDER": (120.0, 300.0, 0.0)},
        racket(240.0, 300.0, w=60.0, h=20.0),
    )
    assert small["racket_side"] == pytest.approx(large["racket_side"])


def test_height_is_positive_upwards():
    """
    Image y grows downward. A feature named "height" that increased as the racket fell would
    be read as physics by whoever uses it next, and the serve/smash rules elsewhere in this
    pipeline are built on overhead contact being *high*.
    """
    overhead = racket_features_at_contact(shoulders(100.0, 60.0), racket(80.0, 100.0))
    low = racket_features_at_contact(shoulders(100.0, 60.0), racket(80.0, 200.0))
    assert overhead["racket_height"] > 0 > low["racket_height"]


def test_offset_is_the_unsigned_side():
    features = racket_features_at_contact(shoulders(60.0, 100.0), racket(120.0, 150.0))
    assert features["racket_offset"] == abs(features["racket_side"])


def test_conditioning_and_provenance_are_reported():
    """
    Every one of these is a reason a caller might throw the row out, so the row has to carry
    them. A feature table that reports only the features cannot be filtered afterwards, and
    `shoulder_width_px` in particular is what makes the ill-conditioned frames identifiable at
    all — see the module docstring on why this approach cannot avoid them.
    """
    found = racket_for_player([racket(130.0, 170.0, confidence=0.55)], PLAYER)
    features = racket_features_at_contact(shoulders(140.0, 100.0), found)

    assert features["shoulder_width_px"] == pytest.approx(40.0)
    assert features["racket_confidence"] == 0.55
    assert features["racket_distance_px"] == pytest.approx(found["distance_px"])


def test_box_aspect_is_none_for_a_degenerate_box():
    """A zero-height box has no aspect. None says so; a division would raise."""
    flat = {"bbox": [100.0, 150.0, 130.0, 150.0], "confidence": 0.5}
    features = racket_features_at_contact(shoulders(140.0, 100.0), flat)
    assert features["box_aspect"] is None


def test_box_aspect_is_width_over_height():
    features = racket_features_at_contact(shoulders(140.0, 100.0),
                                          racket(120.0, 150.0, w=30.0, h=10.0))
    assert features["box_aspect"] == pytest.approx(3.0)


def test_thresholds_are_documented_as_provisional():
    """
    A guard on the house style rather than on behaviour. Both constants here are provisional —
    one is geometry from body proportions, the other is borrowed from a measurement made for a
    different feature — and `cv-service`'s convention is that a calibrated constant states what
    calibrated it and an uncalibrated one says so plainly.
    """
    import trackers.racket_detector as detector_module
    import utils.racket_features as features_module

    assert "PROVISIONAL" in detector_module.__doc__ or "provisional" in (
        open(detector_module.__file__, encoding="utf-8").read())
    assert "PROVISIONAL" in open(features_module.__file__, encoding="utf-8").read()
    assert 0 < MAX_RACKET_DISTANCE_BOX_HEIGHTS < 5
    assert 0 < MIN_SHOULDER_WIDTH_PX < 50
