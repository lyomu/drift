"""
utils/session_aggregate.py
──────────────────────────
Roll per-rally summaries up into one session, without inventing anything.

The acceptance criterion this is written against
-----------------------------------------------
`AI_VIDEO_ANALYSIS_IMPLEMENTATION_PLAN.md` Phase 3: *"Session-level aggregation matches the
sum of its per-rally parts."* For counts that is arithmetic. For everything else it is a
series of decisions about what may legitimately be combined, and each one below is a way the
naive version would publish a number that is not a measurement.

Three rules, and why each exists
--------------------------------
**1. Counts sum. Averages are weighted by what produced them.**
A mean of per-rally means weights a one-shot rally exactly as heavily as a twelve-shot one.
On a practice session — long baseline rallies mixed with serve practice — that is not a small
distortion, and it is invisible in the output. So speeds are recombined from their own
denominators: total distance-time evidence, not an average of averages.

**2. An uncalibrated rally contributes counts and nothing else.**
Every speed and every court position comes from a homography fitted to painted lines. When
that fit fails the pipeline says so in `court_calibrated`, and its speeds are plausible
numbers that mean nothing. Mixing one into a session average silently corrupts the whole
session — which is worse than the single-clip case, because the user cannot see which rally
did it. The mobile results screen already drops speeds for an uncalibrated clip; this is the
same rule applied one level up. Shot *counts* survive, because contact detection does not
depend on the court fit.

**3. A partial session says it is partial, in the same object as the totals.**
Session analysis runs under a frame budget (see `session.py`): a 10-minute session can hold
more rallies than there is GPU time for. `segments_found` and `segments_analysed` are
reported side by side, so a consumer cannot read totals over 8 rallies as a total over the
20 that were there. A number whose denominator is elsewhere gets quoted without it.

What this module does NOT do
---------------------------
It does not re-derive anything from frames, and it does not second-guess a segment's own
summary. It reads the keys `main.py` writes and combines them. If a key is absent it is
absent from the session too, rather than defaulted to zero — a zero shot count and no shot
count look identical afterwards and are not the same claim.
"""
from __future__ import annotations

from typing import Any, Iterable

# Segment outcomes. A session reports one of these per span it found, so that "not in the
# totals" always has a stated reason rather than being an absence.
ANALYSED = "analysed"
SKIPPED_BUDGET = "skipped_budget"
SKIPPED_SHORT = "skipped_too_short"
FAILED = "failed"

# Per-player shot-count keys, and the speed key whose denominator each one is.
#
# Pairing them explicitly is the whole trick of this module: `avg_shot_speed_p1_kmh` is a
# mean over `total_shots_p1` shots, so recombining the mean correctly needs the count that
# produced it. A generic "average all the averages" helper cannot know that, which is why
# there isn't one.
_SPEED_WEIGHTS = {
    "avg_shot_speed_p1_kmh": "total_shots_p1",
    "avg_shot_speed_p2_kmh": "total_shots_p2",
    "avg_player_speed_p1_kmh": None,
    "avg_player_speed_p2_kmh": None,
}

_COUNT_KEYS = ("total_shots_p1", "total_shots_p2")


def _num(summary: dict, key: str) -> float | None:
    """A numeric value, or None. Absent and zero are different claims and stay different."""
    value = summary.get(key)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)


def is_calibrated(summary: dict) -> bool:
    """
    Whether this segment's court fit succeeded.

    Mirrors the reading elsewhere in the stack — `court_calibrated != false` — rather than
    `== true`, so a summary that omits the key is treated as calibrated. That matches
    `video_analysis_repository.dart` and `video-analysis.service.ts`, and the consistency
    matters more than the choice: three layers disagreeing about what a missing key means is
    how a warning stops being shown.
    """
    return summary.get("court_calibrated") is not False


def _weighted_mean(pairs: Iterable[tuple[float, float]]) -> float | None:
    """
    Mean of values weighted by their own denominators, or None when nothing contributed.

    Zero total weight returns None rather than 0.0. A session in which no shot was measured
    has no average shot speed, and 0.0 km/h would be rendered as a measurement of a very slow
    shot.
    """
    total_weight = 0.0
    total = 0.0
    for value, weight in pairs:
        if weight <= 0:
            continue
        total += value * weight
        total_weight += weight
    return (total / total_weight) if total_weight > 0 else None


def aggregate_session(segments: list[dict]) -> dict:
    """
    Combine per-segment results into a session summary.

    Args:
        segments: one dict per span the segmenter found, in clip order. Each carries at
            least `status` (one of the constants above) and `span`; an `analysed` one also
            carries `summary`, the pipeline's own output for that rally, passed through
            untouched.

    Returns:
        The session summary. `mode` is `"session"`, which is how every consumer downstream —
        the backend's job row, the mobile results screen — tells a session apart from a
        single clip without a schema change.
    """
    analysed = [s for s in segments if s.get("status") == ANALYSED and s.get("summary")]
    summaries = [s["summary"] for s in analysed]
    calibrated = [s for s in summaries if is_calibrated(s)]

    totals: dict[str, Any] = {}
    for key in _COUNT_KEYS:
        # Counts come from contact detection, which is independent of the court fit, so
        # every analysed segment contributes — calibrated or not.
        values = [v for v in (_num(s, key) for s in summaries) if v is not None]
        if values:
            totals[key] = int(sum(values))

    if "total_shots_p1" in totals or "total_shots_p2" in totals:
        totals["total_shots"] = totals.get("total_shots_p1", 0) + totals.get(
            "total_shots_p2", 0)

    # Speeds, from calibrated segments only, weighted by their own denominators.
    for key, weight_key in _SPEED_WEIGHTS.items():
        pairs = []
        for summary in calibrated:
            value = _num(summary, key)
            if value is None or value <= 0:
                # The pipeline writes 0.0 for "no data" on these keys, not a measured zero.
                continue
            if weight_key is None:
                # Player speed has no per-segment denominator in the summary. Weighting by
                # segment length is the closest honest proxy: a player's mean speed over a
                # 30 s rally is evidence about 30 s, not about one rally.
                weight = float(_num(summary, "_frames") or 1.0)
            else:
                weight = _num(summary, weight_key) or 0.0
            pairs.append((value, weight))
        mean = _weighted_mean(pairs)
        if mean is not None:
            totals[key] = round(mean, 1)

    # Shot types sum across analysed segments. Independent of the court fit, same as counts.
    shot_types: dict[str, int] = {}
    for summary in summaries:
        block = summary.get("shot_classification")
        types = block.get("types") if isinstance(block, dict) else None
        if isinstance(types, dict):
            for name, count in types.items():
                if isinstance(count, (int, float)) and not isinstance(count, bool):
                    shot_types[name] = shot_types.get(name, 0) + int(count)

    found = len(segments)
    uncalibrated = len(summaries) - len(calibrated)

    result: dict[str, Any] = {
        "mode": "session",
        # Found versus analysed, together, for the reason in the module docstring.
        "segments_found": found,
        "segments_analysed": len(analysed),
        "segments_skipped_budget": sum(
            1 for s in segments if s.get("status") == SKIPPED_BUDGET),
        "segments_skipped_short": sum(
            1 for s in segments if s.get("status") == SKIPPED_SHORT),
        "segments_failed": sum(1 for s in segments if s.get("status") == FAILED),
        "segments_uncalibrated": uncalibrated,
        # The session is calibrated only if something in it was. False here means no speed
        # in this object is a measurement, which is the same contract as a single clip's.
        "court_calibrated": len(calibrated) > 0,
        "totals": totals,
        "shot_types": shot_types,
        # Per-rally detail, in clip order, so the app can show the breakdown and a person
        # can find the rally a number came from.
        "segments": segments,
    }

    if uncalibrated:
        result["warning"] = (
            f"{uncalibrated} of {len(summaries)} analysed rallies had no usable court fit, "
            f"so they contribute shot counts but no speeds. Speeds below are measured over "
            f"the {len(calibrated)} rally(ies) where the court lines could be read."
        )
    if not calibrated and summaries:
        result["warning"] = (
            "None of the analysed rallies had a usable court fit, so no speeds or court "
            "positions could be measured. Shot counts are still accurate."
        )
    if not analysed:
        result["warning"] = (
            "No rally in this session could be analysed." if found
            else "No passages of play were found in this video."
        )

    return result


def session_totals_match_parts(session: dict) -> bool:
    """
    Check the acceptance criterion directly, on the object that would be shipped.

    Exposed rather than left in the tests because it is a claim the plan makes to users, and
    a claim like that is worth being able to assert on real output as well as on fixtures.
    Only counts are checked: weighted means are deliberately *not* the sum of their parts,
    which is the point of rule 1.
    """
    segments = [s for s in session.get("segments", [])
                if s.get("status") == ANALYSED and s.get("summary")]
    totals = session.get("totals", {})

    for key in _COUNT_KEYS:
        if key not in totals:
            continue
        parts = sum(int(_num(s["summary"], key) or 0) for s in segments)
        if int(totals[key]) != parts:
            return False

    if "total_shots" in totals:
        expected = totals.get("total_shots_p1", 0) + totals.get("total_shots_p2", 0)
        if int(totals["total_shots"]) != int(expected):
            return False

    return True


__all__ = [
    "ANALYSED", "FAILED", "SKIPPED_BUDGET", "SKIPPED_SHORT",
    "aggregate_session", "is_calibrated", "session_totals_match_parts",
]
