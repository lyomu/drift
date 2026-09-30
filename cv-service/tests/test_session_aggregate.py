"""
tests/test_session_aggregate.py
───────────────────────────────
Tests for rolling per-rally results up into a session.

The plan's acceptance criterion, tested directly
------------------------------------------------
`AI_VIDEO_ANALYSIS_IMPLEMENTATION_PLAN.md` Phase 3: *"Session-level aggregation matches the
sum of its per-rally parts."* For counts that is a straight assertion and it is made below.

Everything else in this file exists because the naive reading of that sentence is wrong in
three specific ways, each of which would publish a number that is not a measurement:

- A mean of per-rally means is **not** the sum of the parts, and treating it as one weights a
  one-shot rally exactly as heavily as a twelve-shot one.
- An uncalibrated rally's speeds are plausible numbers with no meaning. Summing them in
  corrupts the session silently, and worse than in the single-clip case, because the user
  cannot see which rally did it.
- A session analysed under a frame budget is partial, and totals that do not carry their
  denominator get quoted without it.

No weights, no GPU, no video. These are dictionaries in and dictionaries out.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.session_aggregate import (
    ANALYSED,
    FAILED,
    SKIPPED_BUDGET,
    SKIPPED_SHORT,
    aggregate_session,
    is_calibrated,
    session_totals_match_parts,
)


def rally(
    index=0,
    shots_p1=3,
    shots_p2=2,
    speed_p1=80.0,
    speed_p2=70.0,
    calibrated=True,
    frames=300,
    types=None,
    status=ANALYSED,
):
    """One segment record, shaped as `session.py` produces it."""
    if status != ANALYSED:
        return {"index": index, "status": status, "span": {"start_s": 0, "end_s": 10}}

    summary = {
        "total_shots_p1": shots_p1,
        "total_shots_p2": shots_p2,
        "avg_shot_speed_p1_kmh": speed_p1,
        "avg_shot_speed_p2_kmh": speed_p2,
        "court_calibrated": calibrated,
        "_frames": frames,
    }
    if types is not None:
        summary["shot_classification"] = {"types": types}
    return {
        "index": index,
        "status": ANALYSED,
        "span": {"start_s": 0, "end_s": 10},
        "summary": summary,
    }


# ── rule 1: counts sum, averages are weighted ──────────────────────────────────

def test_shot_counts_are_the_sum_of_the_parts():
    """The acceptance criterion, asserted on the object that would be shipped."""
    session = aggregate_session([
        rally(0, shots_p1=3, shots_p2=2),
        rally(1, shots_p1=5, shots_p2=4),
        rally(2, shots_p1=1, shots_p2=0),
    ])
    assert session["totals"]["total_shots_p1"] == 9
    assert session["totals"]["total_shots_p2"] == 6
    assert session["totals"]["total_shots"] == 15
    assert session_totals_match_parts(session)


def test_speeds_are_weighted_by_the_shots_that_produced_them():
    """
    The distortion this module exists to prevent. A one-shot rally at 200 km/h and a
    nine-shot rally at 100 km/h: an unweighted mean says 150, which describes neither. The
    honest figure is the mean over all ten shots, 110.
    """
    session = aggregate_session([
        rally(0, shots_p1=1, shots_p2=0, speed_p1=200.0),
        rally(1, shots_p1=9, shots_p2=0, speed_p1=100.0),
    ])
    assert session["totals"]["avg_shot_speed_p1_kmh"] == pytest.approx(110.0)


def test_a_weighted_mean_is_deliberately_not_the_sum_of_parts():
    """
    Stated as a test so the invariant checker's scope is unambiguous: it checks counts, and
    must not be extended to speeds by someone reading the acceptance criterion literally.
    """
    session = aggregate_session([
        rally(0, shots_p1=1, speed_p1=200.0),
        rally(1, shots_p1=9, speed_p1=100.0),
    ])
    parts = 200.0 + 100.0
    assert session["totals"]["avg_shot_speed_p1_kmh"] != parts
    assert session_totals_match_parts(session)


def test_a_zero_speed_is_absence_not_a_measurement():
    """
    The pipeline writes 0.0 for "no data" on these keys. Averaging a 0.0 in would drag the
    session average toward zero on the strength of a rally that measured nothing.
    """
    session = aggregate_session([
        rally(0, shots_p1=4, speed_p1=100.0),
        rally(1, shots_p1=4, speed_p1=0.0),
    ])
    assert session["totals"]["avg_shot_speed_p1_kmh"] == pytest.approx(100.0)


def test_no_measurable_speed_omits_the_key_rather_than_reporting_zero():
    """A session with no measured speed has no average speed. 0.0 km/h would read as slow."""
    session = aggregate_session([rally(0, speed_p1=0.0, speed_p2=0.0)])
    assert "avg_shot_speed_p1_kmh" not in session["totals"]


def test_an_absent_count_is_not_defaulted_to_zero():
    """
    Absent and zero are different claims. A summary that never reported a count must not
    contribute a confident zero to the session, because afterwards the two are identical.
    """
    segment = rally(0)
    del segment["summary"]["total_shots_p2"]
    session = aggregate_session([segment])

    assert session["totals"]["total_shots_p1"] == 3
    # Omitted entirely, not present as 0. A caller can then tell "nobody measured this" from
    # "measured, and it was none", which a zero would have collapsed.
    assert "total_shots_p2" not in session["totals"]
    assert session_totals_match_parts(session)


# ── rule 2: an uncalibrated rally contributes counts and nothing else ──────────

def test_an_uncalibrated_rally_still_contributes_shot_counts():
    """
    Contact detection does not depend on the court fit, so its counts survive — the same
    reasoning the single-clip results screen already applies.
    """
    session = aggregate_session([
        rally(0, shots_p1=3, calibrated=True),
        rally(1, shots_p1=4, calibrated=False),
    ])
    assert session["totals"]["total_shots_p1"] == 7


def test_an_uncalibrated_rally_contributes_no_speed():
    """
    Every speed comes from a homography fitted to painted lines. Without that fit the numbers
    are plausible and meaningless, and mixing one into a session average is worse than the
    single-clip case because nobody can see which rally spoiled it.
    """
    session = aggregate_session([
        rally(0, shots_p1=4, speed_p1=100.0, calibrated=True),
        rally(1, shots_p1=4, speed_p1=300.0, calibrated=False),
    ])
    assert session["totals"]["avg_shot_speed_p1_kmh"] == pytest.approx(100.0)


def test_an_uncalibrated_rally_is_counted_and_explained():
    session = aggregate_session([
        rally(0, calibrated=True),
        rally(1, calibrated=False),
    ])
    assert session["segments_uncalibrated"] == 1
    assert "no usable court fit" in session["warning"]


def test_a_session_with_no_calibrated_rally_is_not_calibrated():
    """
    Same contract as a single clip: `court_calibrated: false` means no speed in this object is
    a measurement. The mobile screen keys its whole speed section off it.
    """
    session = aggregate_session([rally(0, calibrated=False), rally(1, calibrated=False)])
    assert session["court_calibrated"] is False
    assert "None of the analysed rallies" in session["warning"]


def test_a_missing_calibration_key_counts_as_calibrated():
    """
    `!= false`, not `== true` — matching `video-analysis.service.ts` and
    `video_analysis_repository.dart`. Three layers reading this differently is how a warning
    stops being shown in one of them.
    """
    assert is_calibrated({}) is True
    assert is_calibrated({"court_calibrated": False}) is False


# ── rule 3: a partial session says so ──────────────────────────────────────────

def test_found_and_analysed_are_reported_together():
    """
    The number that stops a partial session reading as a whole one. Totals over 2 of 4 rallies
    must carry their denominator in the same object, not in a caption somewhere else.
    """
    session = aggregate_session([
        rally(0), rally(1),
        rally(2, status=SKIPPED_BUDGET),
        rally(3, status=SKIPPED_BUDGET),
    ])
    assert session["segments_found"] == 4
    assert session["segments_analysed"] == 2
    assert session["segments_skipped_budget"] == 2


def test_every_skip_reason_is_counted_separately():
    """
    "Not measured" is not one thing. Out of budget, too short and failed have different causes
    and different fixes, and collapsing them would hide a run of failures inside a plausible
    budget story.
    """
    session = aggregate_session([
        rally(0),
        rally(1, status=SKIPPED_BUDGET),
        rally(2, status=SKIPPED_SHORT),
        rally(3, status=FAILED),
    ])
    assert session["segments_analysed"] == 1
    assert session["segments_skipped_budget"] == 1
    assert session["segments_skipped_short"] == 1
    assert session["segments_failed"] == 1


def test_a_skipped_rally_contributes_nothing_to_the_totals():
    session = aggregate_session([
        rally(0, shots_p1=3),
        rally(1, status=SKIPPED_BUDGET),
    ])
    assert session["totals"]["total_shots_p1"] == 3
    assert session_totals_match_parts(session)


def test_the_per_rally_breakdown_is_carried_through():
    """
    Kept so the app can show every rally it found, skipped ones included. A list showing only
    the measured rallies makes the session look shorter than it was.
    """
    segments = [rally(0), rally(1, status=SKIPPED_BUDGET)]
    session = aggregate_session(segments)
    assert len(session["segments"]) == 2
    assert [s["status"] for s in session["segments"]] == [ANALYSED, SKIPPED_BUDGET]


# ── shape and edge cases ───────────────────────────────────────────────────────

def test_mode_marks_this_as_a_session():
    """
    How three layers tell a session from one rally without a schema change: the backend routes
    on the clip's duration, cv-service stamps the answer here, and the app reads it.
    """
    assert aggregate_session([rally(0)])["mode"] == "session"


def test_shot_types_sum_across_rallies():
    session = aggregate_session([
        rally(0, types={"Forehand": 2, "Serve": 1}),
        rally(1, types={"Forehand": 3, "Backhand": 1}),
    ])
    assert session["shot_types"] == {"Forehand": 5, "Serve": 1, "Backhand": 1}


def test_shot_types_survive_an_uncalibrated_rally():
    """Stroke typing reads the player, not the court, so the court fit does not gate it."""
    session = aggregate_session([rally(0, calibrated=False, types={"Forehand": 2})])
    assert session["shot_types"] == {"Forehand": 2}


def test_an_empty_session_says_nothing_was_found():
    session = aggregate_session([])
    assert session["segments_found"] == 0
    assert session["segments_analysed"] == 0
    assert "No passages of play were found" in session["warning"]


def test_a_session_where_every_rally_failed_says_so():
    session = aggregate_session([rally(0, status=FAILED), rally(1, status=FAILED)])
    assert session["segments_analysed"] == 0
    assert "No rally in this session could be analysed" in session["warning"]


def test_a_segment_marked_analysed_without_a_summary_is_not_counted():
    """
    Defensive against a malformed record. Counting it would make `segments_analysed` claim a
    measurement that produced nothing, which is the one number on this object that has to be
    trustworthy.
    """
    session = aggregate_session([{"index": 0, "status": ANALYSED, "span": {}}])
    assert session["segments_analysed"] == 0


def test_a_boolean_is_not_treated_as_a_number():
    """
    `isinstance(True, int)` is True in Python, so a stray boolean in a numeric field would sum
    as 1 and produce a shot count out of a flag.
    """
    segment = rally(0)
    segment["summary"]["total_shots_p1"] = True
    session = aggregate_session([segment])
    assert session["totals"].get("total_shots_p1", 0) == 0
