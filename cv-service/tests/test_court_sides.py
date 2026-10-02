"""
tests/test_court_sides.py
─────────────────────────
Tests for court-side derivation, and for the doubles bug it exists to fix.

The bug, as a test
------------------
`rally_decode` enforces "a contact by the side that last struck the ball means the ball never
crossed the net", and it was fed a player id. In singles one player is one side, so it worked. In
doubles two partners share a side, and comparing player ids says a partner-then-partner sequence
is legal when the ball never crossed the net.

`test_two_partners_share_a_side` is the assertion that would have failed before this module
existed, and it is the reason the rest of this file is here.

No weights, no GPU, no video: keypoints and bounding boxes are plain numbers.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.court_sides import (
    FAR,
    NEAR,
    court_side,
    group_players_by_side,
    net_y_at_x,
    relative_side,
    sides_for_frame,
)

# A rectangular court, far baseline at y=100, near baseline at y=500, so the net midline is 300.
# Keypoints are the flat 28-value form the court model emits; only 0-3 matter here.
FLAT_COURT = [
    0.0, 100.0,      # 0 far baseline left
    400.0, 100.0,    # 1 far baseline right
    0.0, 500.0,      # 2 near baseline left
    400.0, 500.0,    # 3 near baseline right
] + [0.0] * 20

# The same court seen from off to one side: the far baseline is higher on the left than the
# right, which is what a single horizontal net threshold gets wrong near the frame edges.
TILTED_COURT = [
    0.0, 80.0,
    400.0, 160.0,
    0.0, 480.0,
    400.0, 560.0,
] + [0.0] * 20


def box(cx: float, foot_y: float, w: float = 40.0, h: float = 160.0):
    """A player box whose FEET are at foot_y, which is what locates them."""
    return [cx - w / 2, foot_y - h, cx + w / 2, foot_y]


# ── the net estimate ───────────────────────────────────────────────────────────

def test_net_sits_midway_between_the_baselines():
    assert net_y_at_x(FLAT_COURT, 200.0) == pytest.approx(300.0)


def test_the_net_line_follows_a_tilted_court():
    """
    Evaluated at the player's own x, not as one horizontal line.

    On the tilted court the net is at 280 on the left edge and 360 on the right. A single
    threshold taken from the left edge would put a player standing at y=320 on the right side of
    frame on the wrong side of the net.
    """
    assert net_y_at_x(TILTED_COURT, 0.0) == pytest.approx(280.0)
    assert net_y_at_x(TILTED_COURT, 400.0) == pytest.approx(360.0)


def test_an_unusable_court_gives_no_net():
    assert net_y_at_x(None, 200.0) is None
    assert net_y_at_x([0.0] * 4, 200.0) is None          # too short
    assert net_y_at_x([float("nan")] * 28, 200.0) is None


# ── placing a player ───────────────────────────────────────────────────────────

def test_a_player_beyond_the_net_is_far():
    assert court_side(box(200.0, 150.0), FLAT_COURT) == FAR


def test_a_player_this_side_of_the_net_is_near():
    assert court_side(box(200.0, 450.0), FLAT_COURT) == NEAR


def test_feet_locate_a_player_not_the_box_centre():
    """
    A player box spans about two metres projected onto the court, so at the net its centre can
    sit on the opposite side from where the player is standing. `get_foot_position` uses the same
    convention for the mini-court, so the two agree about where a player is.
    """
    # Feet at 340 (near side); box centre is at 340-80 = 260, which is the FAR side.
    assert court_side(box(200.0, 340.0), FLAT_COURT) == NEAR


def test_the_tilted_court_places_an_edge_player_correctly():
    """The case a single horizontal threshold gets wrong."""
    # Net is 360 at x=400. A player with feet at 320 there is beyond the net.
    assert court_side(box(400.0, 320.0), TILTED_COURT) == FAR
    # The same y on the left edge, where the net is at 280, is on the near side.
    assert court_side(box(0.0, 320.0), TILTED_COURT) == NEAR


def test_without_a_court_the_frame_midline_is_used():
    assert court_side(box(200.0, 100.0), None, frame_height=720) == FAR
    assert court_side(box(200.0, 700.0), None, frame_height=720) == NEAR


def test_with_neither_a_court_nor_a_frame_height_it_declines():
    """
    None is a real answer. The decoder treats an unknown side as unconstrained, which is better
    than inventing a side and rejecting a contact that really happened.
    """
    assert court_side(box(200.0, 300.0), None) is None


def test_a_malformed_box_declines():
    assert court_side(None, FLAT_COURT) is None
    assert court_side([1.0, 2.0], FLAT_COURT) is None
    assert court_side([float("nan")] * 4, FLAT_COURT) is None


# ── the doubles bug ────────────────────────────────────────────────────────────

def test_two_partners_share_a_side():
    """
    The assertion the whole module exists for.

    Two partners stand on the same half. Under the old behaviour the grammar compared PLAYER ids,
    saw 1 != 2, and concluded the ball had crossed the net — accepting a rally in which one team
    hit twice in a row. Comparing sides rejects it, because both players return the same side.
    """
    players = {1: box(120.0, 450.0), 2: box(300.0, 420.0)}   # both near
    sides = sides_for_frame(players, FLAT_COURT)
    assert sides[1] == sides[2] == NEAR


def test_opponents_are_on_different_sides():
    players = {1: box(120.0, 450.0), 2: box(300.0, 150.0)}
    sides = sides_for_frame(players, FLAT_COURT)
    assert sides[1] != sides[2]


def test_a_doubles_frame_splits_two_and_two():
    """Four players, two per side — the shape a doubles clip should produce."""
    players = {
        1: box(100.0, 450.0), 2: box(300.0, 420.0),   # near team
        3: box(100.0, 150.0), 4: box(300.0, 180.0),   # far team
    }
    sides = sides_for_frame(players, FLAT_COURT)
    assert sorted(sides.values()) == [FAR, FAR, NEAR, NEAR]


def test_players_unplaceable_are_omitted_not_defaulted():
    """
    A missing id means "unknown side", which is different from "on neither side". Defaulting it
    to a side is how a wrong side reaches the grammar.
    """
    players = {1: box(200.0, 450.0), 2: [float("nan")] * 4}
    sides = sides_for_frame(players, FLAT_COURT)
    assert 1 in sides and 2 not in sides


# ── per-clip team assignment ───────────────────────────────────────────────────

def test_sides_are_assigned_by_majority_over_the_clip():
    """
    One frame of bad keypoints, or a player crossing the net to shake hands, must not reassign
    them. Same reasoning as PlayerTracker's own per-clip vote.
    """
    frames = [{1: box(200.0, 450.0)}] * 9 + [{1: box(200.0, 150.0)}]
    assert group_players_by_side(frames, FLAT_COURT) == {1: NEAR}


def test_team_assignment_covers_all_four_players():
    frames = [{
        1: box(100.0, 450.0), 2: box(300.0, 430.0),
        3: box(100.0, 150.0), 4: box(300.0, 170.0),
    }] * 5
    assignment = group_players_by_side(frames, FLAT_COURT)
    assert assignment == {1: NEAR, 2: NEAR, 3: FAR, 4: FAR}


def test_a_player_never_placeable_is_absent_from_the_assignment():
    frames = [{1: box(200.0, 450.0), 2: [float("nan")] * 4}] * 4
    assert 2 not in group_players_by_side(frames, FLAT_COURT)


# ── the no-calibration fallback ────────────────────────────────────────────────

def test_relative_side_needs_no_court_at_all():
    """
    The tier that matters most in practice: PHASE0_FINDINGS.md measured the court fit failing on
    all ten real Drift clips, and a side is still needed then.
    """
    players = {1: box(200.0, 150.0), 2: box(200.0, 450.0)}
    assert relative_side(players, 1) == FAR
    assert relative_side(players, 2) == NEAR


def test_relative_side_declines_with_nobody_to_compare_against():
    assert relative_side({1: box(200.0, 300.0)}, 1) is None
    assert relative_side({}, 1) is None


def test_relative_side_declines_when_everyone_is_at_the_same_height():
    """No separation to read. Splitting a degenerate range would be a coin flip."""
    players = {1: box(100.0, 400.0), 2: box(300.0, 400.0)}
    assert relative_side(players, 1) is None


def test_relative_side_is_wrong_when_both_players_are_one_side():
    """
    A documented failure, asserted so it cannot be mistaken for working. Warm-up footage with
    both people on one half is a real case from the first Drift batch, and this tier will split
    them into two sides that do not exist. It is the LAST tier for exactly this reason.
    """
    players = {1: box(100.0, 430.0), 2: box(300.0, 470.0)}   # both near
    assert relative_side(players, 1) != relative_side(players, 2)


def test_the_court_tier_beats_the_relative_tier():
    """
    With a court available, both players on one side are correctly both NEAR — which is the case
    the relative tier gets wrong. Tier order is the fix.
    """
    players = {1: box(100.0, 430.0), 2: box(300.0, 470.0)}
    sides = sides_for_frame(players, FLAT_COURT)
    assert sides[1] == sides[2] == NEAR


def test_side_labels_are_distinct():
    """A guard on the constants: FAR and NEAR land in the decoder's state tuple."""
    assert FAR != NEAR
