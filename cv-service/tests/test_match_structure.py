"""
tests/test_match_structure.py
─────────────────────────────
Tests for grouping rally spans into points and games.

What is worth testing here
--------------------------
The arithmetic is simple; the judgement is not. This module infers game boundaries from how long
the pauses between points are, and the failure it is most likely to produce is **inventing
structure that is not there** — reporting games for a basket drill, or splitting one game in two
because someone took a towel break.

So most of these tests are about refusing rather than counting: `looks_like_match_play` is the
guard, and the tests below pin both directions of it.

No weights, no video.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.match_structure import (
    CHANGEOVER_GAP_S,
    GAME_GAP_S,
    analyse_structure,
    group_into_games,
    looks_like_match_play,
    points_from_spans,
)
from utils.rally_segmenter import RallySpan

FPS = 30.0


def span(start_s: float, end_s: float) -> RallySpan:
    return RallySpan(int(start_s * FPS), int(end_s * FPS), FPS)


def rally_sequence(gaps_s, rally_s=8.0):
    """Spans separated by the given gaps, so a pause pattern can be stated directly."""
    spans, t = [], 0.0
    for i, gap in enumerate([0.0] + list(gaps_s)):
        t += gap
        spans.append(span(t, t + rally_s))
        t += rally_s
    return spans


# ── points ─────────────────────────────────────────────────────────────────────

def test_a_rally_span_is_a_point():
    """
    Phase 3 already found these. Point detection is a renaming, not new machinery — a rally is
    exactly the unit that ends when someone fails to return.
    """
    points = points_from_spans([span(0, 8), span(20, 30)])
    assert [p.index for p in points] == [1, 2]
    assert points[0].duration_s == pytest.approx(8.0)


def test_the_first_point_has_no_pause_before_it():
    points = points_from_spans([span(10, 20)])
    assert points[0].gap_before_s is None


def test_the_pause_before_each_point_is_measured_from_the_previous_end():
    points = points_from_spans([span(0, 10), span(25, 35)])
    assert points[1].gap_before_s == pytest.approx(15.0)


def test_no_spans_gives_no_points():
    assert points_from_spans([]) == []
    assert points_from_spans(None) == []


# ── games ──────────────────────────────────────────────────────────────────────

def test_short_pauses_keep_points_in_one_game():
    games = group_into_games(points_from_spans(rally_sequence([10.0, 10.0, 10.0])))
    assert len(games) == 1
    assert len(games[0].points) == 4


def test_a_game_length_pause_starts_a_new_game():
    games = group_into_games(points_from_spans(
        rally_sequence([10.0, GAME_GAP_S + 5, 10.0])))
    assert len(games) == 2
    assert [len(g.points) for g in games] == [2, 2]


def test_a_very_long_pause_is_recorded_as_a_changeover():
    games = group_into_games(points_from_spans(
        rally_sequence([CHANGEOVER_GAP_S + 10])))
    assert games[0].ended_by == "changeover"


def test_a_game_length_pause_is_not_called_a_changeover():
    games = group_into_games(points_from_spans([span(0, 8), span(8 + GAME_GAP_S + 2, 20 + GAME_GAP_S)]))
    assert games[0].ended_by == "game_break"


def test_the_last_game_is_closed_by_the_end_of_the_clip():
    games = group_into_games(points_from_spans(rally_sequence([10.0])))
    assert games[-1].ended_by == "end_of_clip"


def test_no_empty_game_is_created_after_the_final_point():
    """
    The pause BEFORE a point closes the previous game, rather than the pause after one opening a
    new game. Those are not equivalent: the latter leaves a trailing empty game.
    """
    games = group_into_games(points_from_spans(
        rally_sequence([GAME_GAP_S + 5, GAME_GAP_S + 5])))
    assert all(g.points for g in games)


def test_games_are_numbered_from_one_in_order():
    games = group_into_games(points_from_spans(
        rally_sequence([GAME_GAP_S + 5, 5.0, GAME_GAP_S + 5])))
    assert [g.index for g in games] == list(range(1, len(games) + 1))


def test_no_points_gives_no_games():
    assert group_into_games([]) == []


# ── refusing to invent structure ───────────────────────────────────────────────

def test_continuous_hitting_is_not_match_play():
    """
    A basket drill or a cooperative rally session has rallies and no games. Reporting a game
    count for it would be inventing structure from nothing, which is this module's most likely
    way to be wrong.
    """
    points = points_from_spans(rally_sequence([2.0, 2.0, 2.0], rally_s=30.0))
    is_match, reason = looks_like_match_play(points, duration_s=140.0)
    assert is_match is False
    assert "drilling" in reason or "rally session" in reason


def test_a_clip_that_is_mostly_not_tennis_is_not_match_play():
    points = points_from_spans([span(0, 5)])
    is_match, reason = looks_like_match_play(points, duration_s=600.0)
    assert is_match is False
    assert "not tennis" in reason


def test_points_with_no_game_length_pause_are_not_split():
    """
    Several points at match-like pacing but with no pause long enough to be a game break. Honest
    answer: one continuous passage, not an invented game boundary.
    """
    points = points_from_spans(rally_sequence([12.0, 12.0, 12.0], rally_s=8.0))
    is_match, reason = looks_like_match_play(points, duration_s=300.0)
    assert is_match is False
    assert "game break" in reason


def test_match_like_pacing_is_recognised():
    points = points_from_spans(
        rally_sequence([15.0, GAME_GAP_S + 10, 15.0, 15.0], rally_s=8.0))
    is_match, reason = looks_like_match_play(points, duration_s=400.0)
    assert is_match is True
    assert "consistent with match play" in reason


def test_no_points_is_not_match_play():
    is_match, reason = looks_like_match_play([], duration_s=600.0)
    assert is_match is False
    assert "No passages of play" in reason


def test_an_unreadable_duration_is_not_match_play():
    assert looks_like_match_play(points_from_spans([span(0, 8)]), duration_s=0.0)[0] is False


# ── the assembled output ───────────────────────────────────────────────────────

def test_structure_reports_points_even_when_it_refuses_games():
    """
    Points survive a refusal. They come straight from the segmenter and do not depend on any
    game inference, so a drill session still gets its rally count.
    """
    result = analyse_structure(rally_sequence([2.0, 2.0], rally_s=30.0), duration_s=100.0)
    assert result["points"] == 3
    assert result["games"] == 0
    assert result["looks_like_match_play"] is False


def test_structure_carries_its_caveat_and_thresholds():
    """
    A games count is the most quotable and least verified thing here, so the caveat travels in
    the same object rather than in a docstring nobody reads downstream.
    """
    result = analyse_structure(rally_sequence([GAME_GAP_S + 5]), duration_s=300.0)
    assert "does not read a scoreboard" in result["caveat"] or "score" in result["caveat"]
    assert result["thresholds"]["provisional"] is True


def test_structure_handles_an_empty_session():
    result = analyse_structure([], duration_s=600.0)
    assert result["points"] == 0
    assert result["games"] == 0


def test_thresholds_are_ordered_and_physically_sensible():
    """
    A guard on the constants themselves. The ITF allows 25s between points, so a game break must
    be longer than that, and a changeover (90s by rule) longer again.
    """
    assert 25.0 <= GAME_GAP_S < CHANGEOVER_GAP_S <= 90.0
