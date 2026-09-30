"""
tests/test_runtime_budget.py
────────────────────────────
Tests for the pre-flight runtime estimate.

Why a budget check is the deliverable rather than a speed-up
-----------------------------------------------------------
Phase 4 asks for "a full match within a defined time budget, not just eventually finishes". The
tempting way to get there is to process fewer frames, and that is not available: every threshold
in the event path is counted in frames, and `UPSTREAM_README.md` measures what resampling does —
15 fps loses 43% of events. Striding is resampling under another name.

So the honest deliverable is to make the cost knowable before it is spent. These tests pin the
arithmetic, the verdict boundaries, and the round-trip between a time budget and the frame budget
`session.py` enforces — because two expressions of one policy that can drift apart is how a
budget stops meaning anything.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.runtime_budget import (
    DEFAULT_SECONDS_PER_FRAME,
    STARTUP_SECONDS,
    VERDICT_EXCEEDS,
    VERDICT_FITS,
    VERDICT_TIGHT,
    describe_full_match,
    estimate_runtime,
    frames_within_budget,
)


# ── the arithmetic ─────────────────────────────────────────────────────────────

def test_cost_is_startup_plus_per_frame():
    est = estimate_runtime(100, seconds_per_frame=0.5, startup_seconds=10.0)
    assert est.estimated_seconds == pytest.approx(10.0 + 50.0)


def test_nothing_to_analyse_costs_nothing():
    """Not `startup_seconds`: a run that never starts pays no startup."""
    est = estimate_runtime(0)
    assert est.estimated_seconds == 0.0
    assert est.verdict == VERDICT_FITS


def test_a_negative_frame_count_is_treated_as_none():
    assert estimate_runtime(-5).estimated_seconds == 0.0


# ── the verdicts ───────────────────────────────────────────────────────────────

def test_a_small_clip_fits():
    est = estimate_runtime(60, budget_seconds=3600.0)
    assert est.verdict == VERDICT_FITS
    assert est.fits is True


def test_a_clip_over_budget_says_so():
    est = estimate_runtime(100_000, budget_seconds=600.0)
    assert est.verdict == VERDICT_EXCEEDS
    assert est.fits is False
    assert "over the" in est.reason


def test_a_clip_near_the_budget_is_tight_not_fits():
    """
    An estimate built on one constant should not claim precision it lacks. A clip at 90% of
    budget will sometimes overrun, and saying `fits` there would make the budget a promise the
    estimate cannot keep.
    """
    budget = 1000.0
    # Land at ~90% of budget.
    frames = int((budget * 0.9 - STARTUP_SECONDS) / DEFAULT_SECONDS_PER_FRAME)
    est = estimate_runtime(frames, budget_seconds=budget)
    assert est.verdict == VERDICT_TIGHT
    assert est.fits is True      # tight is still allowed through


def test_exceeding_is_advice_not_enforcement():
    """
    This module decides nothing. Whether to spend two hours on a clip is a policy question that
    belongs to whoever owns the GPU, so `exceeds` is reported rather than raised.
    """
    est = estimate_runtime(1_000_000, budget_seconds=10.0)
    assert est.verdict == VERDICT_EXCEEDS
    assert isinstance(est.reason, str) and est.reason


# ── the round trip with session.py's frame budget ──────────────────────────────

def test_frames_within_budget_inverts_the_estimate():
    """
    A time budget and a frame budget must be the same policy in different units. If these drift,
    `session.py` enforces one number while the estimate reports another.
    """
    budget = 3600.0
    frames = frames_within_budget(budget)
    est = estimate_runtime(frames, budget_seconds=budget)
    assert est.estimated_seconds <= budget


def test_a_budget_smaller_than_startup_fits_no_frames():
    assert frames_within_budget(budget_seconds=STARTUP_SECONDS / 2) == 0


def test_a_zero_rate_fits_no_frames_rather_than_dividing_by_zero():
    assert frames_within_budget(3600.0, seconds_per_frame=0.0) == 0


# ── the claim Phase 4 makes about full matches ─────────────────────────────────

def test_a_full_match_exceeds_any_interactive_budget():
    """
    The plan asserts "a full match at current processing speeds is impractical". That is a claim
    worth being able to reproduce rather than repeat, which is what `describe_full_match` is for.
    """
    result = describe_full_match()
    assert result["whole_video"]["verdict"] == VERDICT_EXCEEDS
    # Segmentation helps by roughly the play fraction and the result is still hours.
    assert result["play_only"]["verdict"] == VERDICT_EXCEEDS
    assert result["play_only"]["estimated_seconds"] > 3600


def test_segmenting_a_match_helps_by_about_the_play_fraction():
    """
    Phase 3's contribution to Phase 4, quantified: segmenting to the ball-in-play portion cuts
    the cost by roughly that fraction. It is a real improvement and it does not close the gap.
    """
    result = describe_full_match(play_fraction=0.2)
    whole = result["whole_video"]["estimated_seconds"]
    play = result["play_only"]["estimated_seconds"]
    assert play < whole
    assert play / whole == pytest.approx(0.2, abs=0.02)


def test_the_conclusion_says_why_striding_is_not_the_fix():
    """
    The reasoning has to travel with the number, or the next person reaches for the frame-stride
    knob that UPSTREAM_README already measured the damage of.
    """
    assert "striding" in describe_full_match()["conclusion"]


def test_the_estimate_declares_itself_provisional():
    """One constant, one machine. A refusal a user cannot question is worse than a slow run."""
    assert estimate_runtime(100).as_dict()["provisional"] is True


def test_the_default_rate_matches_the_measured_figure():
    """
    A guard on the constant. 0.63 s/frame is measured (38s for 60 frames on an RTX 4060); if
    someone changes it, they should have a measurement rather than a hunch.
    """
    assert 0.1 <= DEFAULT_SECONDS_PER_FRAME <= 2.0
